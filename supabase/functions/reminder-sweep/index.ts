/**
 * The bimonthly reminder sweep.
 *
 * `pg_cron` calls this every morning at 08:00 Colombian time. It asks the
 * database what is owed, sends one notification per guardian, and records what
 * actually went out.
 *
 * ## One notification per guardian, not per tree
 *
 * A guardian with ten overdue trees receives one notification naming ten, not
 * ten notifications. That is the whole difference between a reminder and a
 * reason to uninstall the app, and it is why the grouping happens here rather
 * than in the query: `due_reminders()` returns one row per tree and step
 * because the *record* is per tree, while the *message* is per person.
 *
 * ## Why it sends before it records
 *
 * `reminders` says of itself that a row exists only because it was sent, and
 * `sent_at` is not nullable for that reason. So the order is: send, read the
 * tickets, then record the guardians Expo accepted. A guardian nobody could be
 * reached for -- no device, or every token dead -- gets no row and is picked up
 * again tomorrow, which is the behaviour worth having.
 *
 * Recording after sending leaves one narrow window: a push that succeeds and
 * an insert that fails would be sent again on the next run. Claiming first
 * would close that window and open a worse one, where a failed send is
 * recorded as delivered and the guardian is never told at all. Between a rare
 * repeat and a silent miss, the repeat is the one to keep.
 *
 * ## What it does not do
 *
 * It does not resolve reminders. The growth log trigger already closes every
 * open reminder for a tree the moment an entry arrives, whether or not the
 * guardian came in through the notification, and doing it here as well would
 * be a second writer for the same fact.
 */

import { sendPushMessages, type PushMessage } from './expo-push.ts';
import {
  REMINDER_CHANNEL_ID,
  coordinatorNotice,
  reminderMessage,
  type ReminderKind,
} from './texts.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/** A row of `due_reminders()`. */
type DueReminder = {
  tree_id: string;
  code: string;
  species_name: string;
  village_name: string | null;
  guardian_id: string;
  guardian_name: string;
  cycle: number;
  kind: ReminderKind;
  due_at: string;
  scheduled_for: string;
};

type Coordinator = { user_id: string; full_name: string };

type DeviceRow = { expo_push_token: string; user_id: string };

/**
 * The escalation, ordered. The database owns the day offsets; all this side
 * needs is which step outranks which when a guardian owes several at once.
 */
const KIND_RANK: Record<ReminderKind, number> = {
  cycle: 0,
  follow_up_7d: 1,
  follow_up_21d: 2,
  overdue: 3,
};

/** The step that copies the coordinator in. */
const KIND_WITH_COORDINATOR_COPY: ReminderKind = 'follow_up_21d';

function restHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function callRpc<T>(name: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: restHeaders(),
    body: '{}',
  });

  if (!response.ok) {
    throw new Error(`${name} failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T[];
}

/** Active tokens of the guardians about to be notified, and nobody else's. */
async function activeDevicesFor(userIds: string[]): Promise<DeviceRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const filter = `in.(${userIds.join(',')})`;
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/devices?select=expo_push_token,user_id&is_active=is.true&user_id=${encodeURIComponent(filter)}`,
    { headers: restHeaders() },
  );

  if (!response.ok) {
    throw new Error(`devices lookup failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as DeviceRow[];
}

/**
 * Stops paying for pushes that go nowhere.
 *
 * The row is not deleted. Nothing in this platform is: a deactivated token is
 * how a reinstall on the same phone can be told from a guardian who never had
 * one, and that difference is what says whether the reminders are reaching
 * anybody at all.
 */
async function deactivateTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) {
    return;
  }

  const unique = [...new Set(tokens)];
  const filter = `in.(${unique.map((token) => `"${token}"`).join(',')})`;
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/devices?expo_push_token=${encodeURIComponent(filter)}`,
    {
      method: 'PATCH',
      headers: restHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ is_active: false }),
    },
  );

  if (!response.ok) {
    console.error(`could not deactivate tokens: ${response.status} ${await response.text()}`);
  }
}

/**
 * Writes down what went out.
 *
 * `resolution=ignore-duplicates` leans on the unique index over
 * (tree_id, cycle, kind), which is the table's own idempotency guarantee. Two
 * sweeps racing each other insert the same rows and the second one silently
 * writes none, so nothing is duplicated and nothing raises.
 */
async function recordReminders(rows: DueReminder[]): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/reminders`, {
    method: 'POST',
    headers: restHeaders({ Prefer: 'resolution=ignore-duplicates,return=representation' }),
    body: JSON.stringify(
      rows.map((row) => ({
        tree_id: row.tree_id,
        user_id: row.guardian_id,
        kind: row.kind,
        cycle: row.cycle,
      })),
    ),
  });

  if (!response.ok) {
    throw new Error(`could not record reminders: ${response.status} ${await response.text()}`);
  }

  return ((await response.json()) as unknown[]).length;
}

/** Everything owed by one guardian, already collapsed into one message. */
type GuardianBatch = {
  guardianId: string;
  guardianName: string;
  rows: DueReminder[];
  /** The furthest step they owe, which sets the tone of the message. */
  kind: ReminderKind;
  /** Distinct trees, so the copy can say "3 árboles" rather than counting steps. */
  treeIds: string[];
  /** The tree the notification opens, and the cycle its camera will claim. */
  target: DueReminder;
};

function groupByGuardian(rows: DueReminder[]): GuardianBatch[] {
  const byGuardian = new Map<string, DueReminder[]>();
  for (const row of rows) {
    const existing = byGuardian.get(row.guardian_id);
    if (existing === undefined) {
      byGuardian.set(row.guardian_id, [row]);
    } else {
      existing.push(row);
    }
  }

  return [...byGuardian.entries()].map(([guardianId, guardianRows]) => {
    const kind = guardianRows.reduce<ReminderKind>(
      (worst, row) => (KIND_RANK[row.kind] > KIND_RANK[worst] ? row.kind : worst),
      'cycle',
    );

    // The tree the tap lands on is the one that has been waiting longest. With
    // several owed there is no single "correct" tree, and the oldest is the one
    // the guardian is most likely to have come for.
    const target = guardianRows.reduce((oldest, row) =>
      Date.parse(row.due_at) < Date.parse(oldest.due_at) ? row : oldest,
    );

    return {
      guardianId,
      guardianName: guardianRows[0].guardian_name,
      rows: guardianRows,
      kind,
      treeIds: [...new Set(guardianRows.map((row) => row.tree_id))],
      target,
    };
  });
}

/**
 * What the phone receives alongside the words.
 *
 * `treeId` and `cycle` are what the app routes on. The `url` is carried too so
 * a tap that arrives through the operating system's own link handling, rather
 * than through the notification listener, lands in the same place.
 */
function payloadFor(batch: GuardianBatch): Record<string, unknown> {
  return {
    treeId: batch.target.tree_id,
    cycle: batch.target.cycle,
    kind: batch.kind,
    url: `arbolapp:///log/${batch.target.tree_id}`,
  };
}

Deno.serve(async (request) => {
  // The sweep is service role only. Without this the endpoint would be a way
  // for anyone to make every guardian's phone buzz.
  const authorization = request.headers.get('Authorization') ?? '';
  if (authorization !== `Bearer ${SERVICE_ROLE_KEY}` || SERVICE_ROLE_KEY === '') {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const due = await callRpc<DueReminder>('due_reminders');

    if (due.length === 0) {
      return Response.json({ due: 0, notified: 0, recorded: 0, deactivated: 0 });
    }

    const batches = groupByGuardian(due);
    const devices = await activeDevicesFor(batches.map((batch) => batch.guardianId));

    const tokensByUser = new Map<string, string[]>();
    for (const device of devices) {
      const existing = tokensByUser.get(device.user_id);
      if (existing === undefined) {
        tokensByUser.set(device.user_id, [device.expo_push_token]);
      } else {
        existing.push(device.expo_push_token);
      }
    }

    // One message per device, one content per guardian. A guardian with a
    // phone and a tablet is one person hearing the same sentence twice, which
    // is what they asked for by registering both.
    const messages: PushMessage[] = [];
    const guardianByToken = new Map<string, string>();

    for (const batch of batches) {
      const tokens = tokensByUser.get(batch.guardianId) ?? [];
      const { title, body } = reminderMessage(
        batch.kind,
        batch.target.species_name,
        batch.treeIds.length,
      );

      for (const token of tokens) {
        guardianByToken.set(token, batch.guardianId);
        messages.push({
          to: token,
          title,
          body,
          data: payloadFor(batch),
          channelId: REMINDER_CHANNEL_ID,
        });
      }
    }

    const coordinatorMessages = await buildCoordinatorMessages(batches);
    const outcome = await sendPushMessages([...messages, ...coordinatorMessages]);

    await deactivateTokens(outcome.unregistered);

    // Only guardians Expo actually accepted a message for. Somebody whose every
    // token came back dead, or who has no device at all, is left for tomorrow
    // rather than recorded as notified.
    const reached = new Set(
      outcome.delivered
        .map((token) => guardianByToken.get(token))
        .filter((id): id is string => id !== undefined),
    );

    const recorded = await recordReminders(
      batches.filter((batch) => reached.has(batch.guardianId)).flatMap((batch) => batch.rows),
    );

    return Response.json({
      due: due.length,
      notified: reached.size,
      recorded,
      deactivated: outcome.unregistered.length,
      retryable: outcome.retryable.length,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    console.error(`reminder sweep failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
});

/**
 * The copy of the day 21 follow up.
 *
 * It carries no `reminders` row of its own -- that table is keyed by
 * (tree, cycle, kind) and the guardian's row already fills it. Which is the
 * right shape rather than a gap: the guardian's row is what makes the step
 * idempotent, so once it exists neither the nudge nor its copy can go out
 * again.
 */
async function buildCoordinatorMessages(batches: GuardianBatch[]): Promise<PushMessage[]> {
  const escalated = batches.filter((batch) =>
    batch.rows.some((row) => row.kind === KIND_WITH_COORDINATOR_COPY),
  );

  if (escalated.length === 0) {
    return [];
  }

  const coordinators = await callRpc<Coordinator>('reminder_coordinators');
  if (coordinators.length === 0) {
    return [];
  }

  const devices = await activeDevicesFor(coordinators.map((one) => one.user_id));
  if (devices.length === 0) {
    return [];
  }

  const treeCount = new Set(
    escalated.flatMap((batch) =>
      batch.rows.filter((row) => row.kind === KIND_WITH_COORDINATOR_COPY).map((row) => row.tree_id),
    ),
  ).size;

  const { title, body } = coordinatorNotice(escalated.length, treeCount, escalated[0].guardianName);

  return devices.map((device) => ({
    to: device.expo_push_token,
    title,
    body,
    // The panel, not a camera: the coordinator does not photograph the tree.
    data: { kind: KIND_WITH_COORDINATOR_COPY, scope: 'coordinator' },
    channelId: REMINDER_CHANNEL_ID,
  }));
}
