// Exercises the whole bimonthly reminder engine against the local stack: the
// sweep finds what is owed, the Edge Function groups it and sends it, the
// tickets come back, the tokens that died are retired and `reminders` records
// what actually went out.
//
// This is the hardest part of the platform to trust, because it operates in
// months. Nobody is going to watch it for sixty days, so everything it does has
// to be provable in a minute with the dates forced, and that is what this file
// is: it moves a tree's due date, runs the sweep the way pg_cron runs it, and
// reads back what happened.
//
// The pushes never leave the machine. `supabase/config.toml` points the local
// edge runtime at a stub this script starts, so the batches Expo would have
// received are inspected here instead -- which is also the only way to prove
// the grouping and the dead token handling without owning a phone.
//
// It resets the database first. The checks force dates and retire devices, so
// starting from the seed every time is what makes the run reproducible; the
// price is about a minute.
//
//   pnpm test:reminders

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

import {
  DAYS_UNTIL_OVERDUE,
  REMINDER_DISPATCH_HOUR,
  REMINDER_FOLLOW_UP_DAYS,
  REMINDER_LADDER,
  REMINDER_OFFSET_DAYS,
  REMINDER_TIME_ZONE,
} from '../packages/core/src/domain.ts';

const PASSWORD = 'arbolapp2026';
const GUARDIAN_GROUPED = 'andres.cabrera@iesansebastian.edu.co';
const GUARDIAN_LADDER = 'yulieth.perdomo@iesansebastian.edu.co';
const GUARDIAN_OPTED_OUT = 'jhon.munoz@iesansebastian.edu.co';
const GUARDIAN_IDEMPOTENCE = 'diana.losada@iesansebastian.edu.co';
const COORDINATOR = 'coordinacion@iesansebastian.edu.co';

/** The port `config.toml` points the local edge runtime at. */
const STUB_PORT = 55328;

/** Marks the token the stub answers with `DeviceNotRegistered`. */
const DEAD_TOKEN = 'ExponentPushToken[check-reminders-dead]';
const LIVE_TOKEN = 'ExponentPushToken[check-reminders-live]';
const LADDER_TOKEN = 'ExponentPushToken[check-reminders-ladder]';
const OPTED_OUT_TOKEN = 'ExponentPushToken[check-reminders-opted-out]';
const COORDINATOR_TOKEN = 'ExponentPushToken[check-reminders-coordinator]';
const IDEMPOTENCE_TOKEN = 'ExponentPushToken[check-reminders-idempotence]';

let failures = 0;

// ---------------------------------------------------------------------------
// The local stack
// ---------------------------------------------------------------------------

function supabaseCli(args) {
  // Run through node rather than the bin shim, which is a .CMD on Windows and
  // would not spawn.
  const cli = new URL('../node_modules/supabase/dist/supabase.js', import.meta.url);
  return execFileSync(process.execPath, [cli.pathname.slice(1), ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function localStack() {
  const raw = supabaseCli(['status', '-o', 'json']);
  return JSON.parse(raw.slice(raw.indexOf('{')));
}

function databaseContainer() {
  const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m);
  if (!projectId) {
    throw new Error('project_id not found in supabase/config.toml');
  }
  return `supabase_db_${projectId[1]}`;
}

const CONTAINER = databaseContainer();

/** Runs SQL as postgres and hands back the raw lines. */
function sql(statements) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      'PGCLIENTENCODING=UTF8',
      CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-tA',
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      '-',
    ],
    { input: statements, encoding: 'utf8' },
  )
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** One scalar. */
function scalar(query) {
  const [value] = sql(query);
  return value ?? null;
}

/** A select, as an array of objects. */
function rows(query) {
  const value = scalar(
    `select coalesce(json_agg(row_to_json(source)), '[]'::json)::text from (${query}) as source;`,
  );
  return JSON.parse(value);
}

// ---------------------------------------------------------------------------
// The Expo stub
// ---------------------------------------------------------------------------

/** Every batch the Edge Function has sent since the last `forget()`. */
let batches = [];

function forget() {
  batches = [];
}

/** Every message across every batch, which is what most checks read. */
function messages() {
  return batches.flat();
}

function startPushStub() {
  return new Promise((resolve) => {
    const server = createServer((request, response) => {
      let body = '';
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        let batch;
        try {
          batch = JSON.parse(body);
        } catch {
          response.writeHead(400).end('{}');
          return;
        }

        batches.push(batch);

        // The shape Expo answers with, ticket for message and in the same
        // order, because that alignment is exactly what the sweep relies on to
        // decide which token to retire.
        const data = batch.map((message) =>
          message.to === DEAD_TOKEN
            ? {
                status: 'error',
                message: `"${message.to}" is not a registered push notification recipient`,
                details: { error: 'DeviceNotRegistered' },
              }
            : { status: 'ok', id: randomUUID() },
        );

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ data }));
      });
    });

    // Bound on every interface: the edge runtime reaches this from inside
    // Docker, through `host.docker.internal`.
    server.listen(STUB_PORT, '0.0.0.0', () => resolve(server));
  });
}

// ---------------------------------------------------------------------------
// Running the sweep
// ---------------------------------------------------------------------------

let API_URL = '';
let ANON_KEY = '';
let SERVICE_ROLE_KEY = '';

/** Calls the Edge Function directly, which is what the cron ends up doing. */
async function runSweep() {
  const response = await fetch(`${API_URL}/functions/v1/reminder-sweep`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trigger: 'check-reminders' }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`sweep failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

/**
 * Runs the sweep the way `pg_cron` does: the scheduled statement, through
 * `pg_net`, and then waits for the reply to land.
 *
 * Slower than calling the function, and the point of paying for it is that it
 * proves the parts a direct call skips -- that the settings are readable, that
 * the service key travels, that the URL resolves from inside the database
 * container.
 */
async function runSweepThroughCron() {
  const command = scalar(`select command from cron.job where jobname = 'reminder-sweep';`);
  const requestId = scalar(`${command}`);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const [status] = sql(
      `select status_code from net._http_response where id = ${Number(requestId)};`,
    );
    if (status !== undefined) {
      return { requestId: Number(requestId), status: Number(status) };
    }
    await new Promise((wait) => setTimeout(wait, 500));
  }

  return { requestId: Number(requestId), status: null };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function check(title, detail, expectation, actual, passed) {
  if (!passed) failures += 1;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}`);
  console.log(`       what     ${detail}`);
  console.log(`       expected ${expectation}`);
  console.log(`       actual   ${actual}`);
  console.log('');
}

function heading(text) {
  console.log(`\n${'='.repeat(78)}\n${text}\n${'='.repeat(78)}\n`);
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const treeOf = {};
const userOf = {};

/**
 * Puts a tree exactly `days` past its due date without ever naming the cadence.
 *
 * `next_reminder_at` is generated from `last_updated_at` by
 * `next_reminder_after()`, which is the only place the two months and the time
 * zone are written down. Rather than restate them here -- which would be the
 * second source of truth the whole design exists to avoid -- the correction is
 * read back out of the function: shift `last_updated_at` by however much the
 * date it produces overshoots the target. Months are not all the same length,
 * so it is applied twice and then verified.
 */
function forceDueDaysAgo(treeId, days) {
  const shift = `
    update public.trees
       set last_updated_at = last_updated_at
           - (public.next_reminder_after(last_updated_at) - (now() - make_interval(days => ${days})))
     where id = '${treeId}';
  `;
  sql(shift);
  sql(shift);

  const drift = Number(
    scalar(`
      select round(abs(extract(epoch from
        (select next_reminder_at from public.trees where id = '${treeId}')
        - (now() - make_interval(days => ${days}))
      )))::text;
    `),
  );

  if (drift > 5) {
    throw new Error(`could not force tree ${treeId} to ${days} days overdue (off by ${drift}s)`);
  }
}

function buildFixture() {
  // Silence everything the seed left behind, so what the sweep finds is only
  // ever what this file put there. The reminders are removed rather than
  // resolved because a resolved one still occupies the unique key and the
  // ladder check needs those four slots empty.
  sql(`
    update public.devices set is_active = false;
    delete from public.reminders;
    update public.trees set last_updated_at = now();
  `);

  for (const email of [
    GUARDIAN_GROUPED,
    GUARDIAN_LADDER,
    GUARDIAN_OPTED_OUT,
    GUARDIAN_IDEMPOTENCE,
    COORDINATOR,
  ]) {
    userOf[email] = scalar(`select id::text from public.users where email = '${email}';`);
  }

  const grouped = rows(`
    select tree.id::text as id, tree.code
    from public.trees tree
    where tree.guardian_id = '${userOf[GUARDIAN_GROUPED]}'
      and tree.archived_at is null
      and tree.status <> 'dead'
    order by tree.code
    limit 3
  `);
  treeOf.grouped = grouped.map((tree) => tree.id);
  treeOf.groupedCodes = grouped.map((tree) => tree.code);

  treeOf.ladder = scalar(`
    select tree.id::text from public.trees tree
    where tree.guardian_id = '${userOf[GUARDIAN_LADDER]}'
      and tree.archived_at is null and tree.status <> 'dead'
    order by tree.code limit 1;
  `);

  treeOf.optedOut = scalar(`
    select tree.id::text from public.trees tree
    where tree.guardian_id = '${userOf[GUARDIAN_OPTED_OUT]}'
      and tree.archived_at is null and tree.status <> 'dead'
    order by tree.code limit 1;
  `);

  treeOf.idempotence = scalar(`
    select tree.id::text from public.trees tree
    where tree.guardian_id = '${userOf[GUARDIAN_IDEMPOTENCE]}'
      and tree.archived_at is null and tree.status <> 'dead'
    order by tree.code limit 1;
  `);

  sql(`
    insert into public.devices (user_id, expo_push_token, platform) values
      ('${userOf[GUARDIAN_GROUPED]}', '${LIVE_TOKEN}', 'android'),
      ('${userOf[GUARDIAN_GROUPED]}', '${DEAD_TOKEN}', 'ios'),
      ('${userOf[GUARDIAN_LADDER]}', '${LADDER_TOKEN}', 'android'),
      ('${userOf[GUARDIAN_OPTED_OUT]}', '${OPTED_OUT_TOKEN}', 'android'),
      ('${userOf[GUARDIAN_IDEMPOTENCE]}', '${IDEMPOTENCE_TOKEN}', 'android'),
      ('${userOf[COORDINATOR]}', '${COORDINATOR_TOKEN}', 'android');
  `);
}

// ---------------------------------------------------------------------------
// Signing in, for the checks that have to go through RLS
// ---------------------------------------------------------------------------

async function signIn(email) {
  const response = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error(`sign in failed for ${email}: ${JSON.stringify(payload)}`);
  }
  return { token: payload.access_token, id: payload.user.id };
}

async function asGuardian(path, token, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${API_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text === '' ? null : JSON.parse(text);
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

// ---------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------

function checkLadderMirrorsCore() {
  heading('0 · The ladder in SQL and the ladder in packages/core');

  const fromDatabase = rows(`
    select step.kind::text as kind, public.reminder_offset_days(step.kind) as days
    from unnest(enum_range(null::public.reminder_kind)) as step(kind)
  `);

  for (const { kind, days } of fromDatabase) {
    check(
      `reminder_offset_days('${kind}')`,
      'the database offset against REMINDER_OFFSET_DAYS in packages/core',
      `${REMINDER_OFFSET_DAYS[kind]} days`,
      `${days} days`,
      days === REMINDER_OFFSET_DAYS[kind],
    );
  }

  check(
    'the ladder derives from the domain constants',
    'REMINDER_OFFSET_DAYS built out of REMINDER_FOLLOW_UP_DAYS and DAYS_UNTIL_OVERDUE',
    `follow ups ${REMINDER_FOLLOW_UP_DAYS.join(' and ')}, overdue at ${DAYS_UNTIL_OVERDUE}`,
    `follow ups ${REMINDER_OFFSET_DAYS.follow_up_7d} and ${REMINDER_OFFSET_DAYS.follow_up_21d}, overdue at ${REMINDER_OFFSET_DAYS.overdue}`,
    REMINDER_OFFSET_DAYS.follow_up_7d === REMINDER_FOLLOW_UP_DAYS[0] &&
      REMINDER_OFFSET_DAYS.follow_up_21d === REMINDER_FOLLOW_UP_DAYS[1] &&
      REMINDER_OFFSET_DAYS.overdue === DAYS_UNTIL_OVERDUE,
  );
}

/** The UTC hour that reads as `localHour` in `timeZone`. */
function utcHourFor(localHour, timeZone) {
  const format = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' });
  for (let hour = 0; hour < 24; hour += 1) {
    const probe = new Date(Date.UTC(2026, 0, 15, hour, 0, 0));
    if (Number(format.format(probe)) === localHour) {
      return hour;
    }
  }
  return null;
}

function checkSchedule() {
  heading('1 · The cron entry, at 08:00 Colombian time');

  const job = rows(`
    select jobname, schedule, command, active
    from cron.job where jobname = 'reminder-sweep'
  `)[0];

  check(
    'the sweep is scheduled',
    'cron.job for the reminder sweep',
    'one active job calling run_reminder_sweep()',
    job === undefined
      ? 'no job'
      : `${job.jobname} "${job.schedule}" active=${job.active} ${job.command.trim()}`,
    job !== undefined && job.active && job.command.includes('run_reminder_sweep'),
  );

  const expectedHour = utcHourFor(REMINDER_DISPATCH_HOUR, REMINDER_TIME_ZONE);
  check(
    'the schedule really is 08:00 in Colombia',
    `pg_cron schedules in UTC, so the hour is checked against ${REMINDER_DISPATCH_HOUR}:00 ${REMINDER_TIME_ZONE}`,
    `0 ${expectedHour} * * *`,
    job?.schedule ?? 'no job',
    job?.schedule === `0 ${expectedHour} * * *`,
  );

  // The cadence is written in exactly one place, and this is what says so.
  const cadence = scalar(`
    select round(extract(epoch from
      public.next_reminder_after(timestamptz '2026-03-15 12:00:00+00')
      - timestamptz '2026-03-15 12:00:00+00'
    ) / 86400)::text;
  `);
  check(
    'next_reminder_after still owns the cadence',
    'the interval the generated column applies',
    'about 61 days, from next_reminder_after() alone',
    `${cadence} days`,
    Number(cadence) >= 59 && Number(cadence) <= 62,
  );
}

async function checkFullCycle() {
  heading('2 · The full cycle: the sweep finds, the function sends, reminders records');

  for (const treeId of treeOf.grouped) {
    forceDueDaysAgo(treeId, 0);
  }

  const due = rows(`
    select kind::text as kind, count(*)::int as total
    from public.due_reminders() group by kind order by kind
  `);

  check(
    'the sweep sees the three trees that just fell due',
    'due_reminders() after forcing three trees to day 0',
    "3 rows, all of kind 'cycle'",
    JSON.stringify(due),
    due.length === 1 && due[0].kind === 'cycle' && due[0].total === 3,
  );

  forget();
  const result = await runSweep();

  const recorded = rows(`
    select kind::text as kind, cycle, resolved_at
    from public.reminders
    where tree_id in (${treeOf.grouped.map((id) => `'${id}'`).join(',')})
  `);

  check(
    'what went out is written down',
    'public.reminders after one sweep',
    '3 rows of kind cycle, none resolved',
    JSON.stringify(result),
    recorded.length === 3 &&
      recorded.every((row) => row.kind === 'cycle' && row.resolved_at === null),
  );

  const guardian = await signIn(GUARDIAN_GROUPED);
  const shown = await asGuardian('rpc/reminder_feed', guardian.token, {
    method: 'POST',
    body: { history_limit: 40 },
  });

  check(
    'the activity feed shows them to their guardian',
    'reminder_feed() as the guardian, through RLS',
    '3 reminders naming their trees',
    `${shown.status} ${Array.isArray(shown.payload) ? shown.payload.length : JSON.stringify(shown.payload)} rows`,
    shown.status === 200 && Array.isArray(shown.payload) && shown.payload.length === 3,
  );
}

function checkGrouping() {
  heading('3 · One notification per guardian, not one per tree');

  const forGuardian = messages().filter((message) => message.to === LIVE_TOKEN);

  check(
    'three overdue trees produce one message',
    'messages addressed to the live token of the guardian with three due trees',
    '1 message',
    `${forGuardian.length} messages: ${forGuardian.map((message) => JSON.stringify(message.title)).join(', ')}`,
    forGuardian.length === 1,
  );

  check(
    'the message says how many, rather than naming one',
    'the grouped copy',
    'a title mentioning 3',
    forGuardian[0] === undefined ? 'no message' : JSON.stringify(forGuardian[0].title),
    forGuardian[0] !== undefined && forGuardian[0].title.includes('3'),
  );

  const perDevice = messages().filter(
    (message) => message.to === LIVE_TOKEN || message.to === DEAD_TOKEN,
  );
  check(
    'both of that guardian’s devices are written to',
    'the same person with a phone and a tablet',
    '2 messages, one per device, same title',
    `${perDevice.length} messages, ${new Set(perDevice.map((message) => message.title)).size} distinct title(s)`,
    perDevice.length === 2 && new Set(perDevice.map((message) => message.title)).size === 1,
  );

  check(
    'the deep link points at the growth log route that exists',
    'the payload the app routes on',
    'a treeId and arbolapp:///log/<treeId>',
    forGuardian[0] === undefined ? 'no message' : JSON.stringify(forGuardian[0].data),
    forGuardian[0] !== undefined &&
      treeOf.grouped.includes(forGuardian[0].data.treeId) &&
      forGuardian[0].data.url === `arbolapp:///log/${forGuardian[0].data.treeId}`,
  );
}

async function checkIdempotence() {
  heading('4 · The cron run twice in a row, through pg_net, duplicating nothing');

  // Its own tree and its own guardian, so the first of the two runs really has
  // something to send. A double run where both halves send nothing proves only
  // that nothing was owed.
  forceDueDaysAgo(treeOf.idempotence, 0);

  const before = Number(scalar('select count(*)::text from public.reminders;'));
  forget();

  const first = await runSweepThroughCron();
  const between = Number(scalar('select count(*)::text from public.reminders;'));
  const sentByFirst = messages().length;

  forget();
  const second = await runSweepThroughCron();
  const after = Number(scalar('select count(*)::text from public.reminders;'));
  const sentBySecond = messages().length;

  check(
    'the scheduled statement reaches the function',
    'select public.run_reminder_sweep(), then net._http_response',
    'two 200s',
    `request ${first.requestId} -> ${first.status}, request ${second.requestId} -> ${second.status}`,
    first.status === 200 && second.status === 200,
  );

  check(
    'the second run writes nothing new',
    'rows in public.reminders before, between and after',
    `${before} -> ${between} -> ${between}`,
    `${before} -> ${between} -> ${after}`,
    after === between,
  );

  check(
    'the second run sends nothing either',
    'messages the stub received on each run',
    'the first run sends, the second sends 0',
    `first ${sentByFirst}, second ${sentBySecond}`,
    sentByFirst > 0 && sentBySecond === 0,
  );

  const duplicates = rows(`
    select tree_id::text as tree_id, cycle, kind::text as kind, count(*)::int as total
    from public.reminders group by tree_id, cycle, kind having count(*) > 1
  `);
  check(
    'no (tree, cycle, kind) appears twice',
    'the unique index that is the whole guarantee',
    'no duplicates',
    duplicates.length === 0 ? 'none' : JSON.stringify(duplicates),
    duplicates.length === 0,
  );
}

async function checkDeadToken() {
  heading('5 · A token Expo refuses is retired, and never tried again');

  const retired = rows(`
    select expo_push_token, is_active from public.devices
    where expo_push_token in ('${DEAD_TOKEN}', '${LIVE_TOKEN}')
    order by expo_push_token
  `);

  check(
    'the dead token is deactivated and the live one is not',
    'public.devices after the tickets came back',
    `${DEAD_TOKEN} inactive, ${LIVE_TOKEN} active`,
    JSON.stringify(retired),
    retired.length === 2 &&
      retired.find((row) => row.expo_push_token === DEAD_TOKEN)?.is_active === false &&
      retired.find((row) => row.expo_push_token === LIVE_TOKEN)?.is_active === true,
  );

  // Give the same guardian something new to owe, so the next sweep really does
  // have a reason to write to them.
  for (const treeId of treeOf.grouped) {
    forceDueDaysAgo(treeId, REMINDER_OFFSET_DAYS.follow_up_7d);
  }

  forget();
  await runSweep();

  const addressed = messages().map((message) => message.to);
  check(
    'the next sweep does not write to it',
    'the batch after the token was retired',
    `${LIVE_TOKEN} present, ${DEAD_TOKEN} absent`,
    JSON.stringify(addressed),
    addressed.includes(LIVE_TOKEN) && !addressed.includes(DEAD_TOKEN),
  );
}

async function checkEscalation() {
  heading('6 · The four moments: day 0, +7, +21 with the coordinator, +30');

  const seen = [];

  for (const kind of REMINDER_LADDER) {
    forceDueDaysAgo(treeOf.ladder, REMINDER_OFFSET_DAYS[kind]);
    forget();
    await runSweep();

    const step = rows(`
      select kind::text as kind from public.reminders
      where tree_id = '${treeOf.ladder}' order by sent_at, kind
    `).map((row) => row.kind);

    const toCoordinator = messages().filter((message) => message.to === COORDINATOR_TOKEN);
    seen.push({ kind, recorded: step, coordinatorCopies: toCoordinator.length });

    check(
      `day +${REMINDER_OFFSET_DAYS[kind]} sends the "${kind}" step`,
      'one tree walked forward through the ladder, a sweep at each stop',
      `the newest reminder is ${kind}`,
      `recorded so far: ${step.join(', ') || 'none'}`,
      step.includes(kind),
    );

    if (kind === 'follow_up_21d') {
      check(
        'the day +21 step copies the coordinator',
        'messages addressed to the coordinator token',
        '1 copy',
        `${toCoordinator.length} copies${toCoordinator[0] ? `: ${JSON.stringify(toCoordinator[0].title)}` : ''}`,
        toCoordinator.length === 1,
      );
    } else {
      check(
        `the ${kind} step does not copy the coordinator`,
        'messages addressed to the coordinator token',
        'none',
        `${toCoordinator.length}`,
        toCoordinator.length === 0,
      );
    }
  }

  check(
    'the whole ladder was walked, once each',
    'every step of the escalation for one tree',
    REMINDER_LADDER.join(', '),
    seen[seen.length - 1]?.recorded.join(', ') ?? 'none',
    seen[seen.length - 1]?.recorded.length === REMINDER_LADDER.length,
  );
}

async function checkPreference() {
  heading('7 · A guardian who said no is not written to, and the choice persists');

  const guardian = await signIn(GUARDIAN_OPTED_OUT);

  const saved = await asGuardian('notification_preferences', guardian.token, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      user_id: guardian.id,
      wants_growth_log_reminders: false,
      wants_coordinator_notices: true,
    },
  });

  check(
    'the guardian can store their own preference',
    'upsert on notification_preferences as the guardian, through RLS',
    '201 with the row',
    `${saved.status} ${JSON.stringify(saved.payload)}`,
    (saved.status === 200 || saved.status === 201) &&
      Array.isArray(saved.payload) &&
      saved.payload[0]?.wants_growth_log_reminders === false,
  );

  const reread = await asGuardian(
    `notification_preferences?select=wants_growth_log_reminders,wants_coordinator_notices&user_id=eq.${guardian.id}`,
    guardian.token,
  );
  check(
    'it is still there when read back',
    'the row a fresh request sees',
    'wants_growth_log_reminders false',
    `${reread.status} ${JSON.stringify(reread.payload)}`,
    reread.status === 200 && reread.payload?.[0]?.wants_growth_log_reminders === false,
  );

  forceDueDaysAgo(treeOf.optedOut, 0);

  const due = rows(`
    select tree_id::text as tree_id from public.due_reminders()
    where tree_id = '${treeOf.optedOut}'
  `);
  check(
    'the sweep does not even build a push for them',
    'due_reminders() for the opted out guardian’s overdue tree',
    'no rows',
    `${due.length} rows`,
    due.length === 0,
  );

  forget();
  await runSweep();

  const written = messages().filter((message) => message.to === OPTED_OUT_TOKEN);
  const recorded = Number(
    scalar(`select count(*)::text from public.reminders where tree_id = '${treeOf.optedOut}';`),
  );
  check(
    'nothing is sent and nothing is recorded',
    'the batch and public.reminders for that tree',
    '0 messages, 0 reminders',
    `${written.length} messages, ${recorded} reminders`,
    written.length === 0 && recorded === 0,
  );

  // And back on, because a preference that cannot be undone is not a
  // preference.
  await asGuardian(`notification_preferences?user_id=eq.${guardian.id}`, guardian.token, {
    method: 'PATCH',
    body: { wants_growth_log_reminders: true },
  });

  forget();
  await runSweep();

  const afterwards = messages().filter((message) => message.to === OPTED_OUT_TOKEN);
  check(
    'turning it back on reaches them again',
    'the batch after the switch went back on',
    'at least 1 message',
    `${afterwards.length} messages`,
    afterwards.length >= 1,
  );
}

async function checkResolution() {
  heading('8 · A growth log entry closes the open reminders and moves the date');

  const guardian = await signIn(GUARDIAN_GROUPED);
  const treeId = treeOf.grouped[0];

  const before = rows(`
    select next_reminder_at::text as next_reminder_at,
           (select count(*)::int from public.reminders r
             where r.tree_id = tree.id and r.resolved_at is null) as open
    from public.trees tree where tree.id = '${treeId}'
  `)[0];

  const cycle =
    Number(
      scalar(`
        select coalesce(max(cycle), 0)::text from public.log_entries
        where tree_id = '${treeId}' and archived_at is null;
      `),
    ) + 1;

  const written = await asGuardian('log_entries', guardian.token, {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      tree_id: treeId,
      author_id: guardian.id,
      cycle,
      photo_path: `${treeId}/${cycle}/photo.jpg`,
      thumbnail_path: `${treeId}/${cycle}/thumbnail.jpg`,
      captured_at: new Date().toISOString(),
      height_cm: 140,
      visible_branches: 6,
      health_status: 'healthy',
    },
  });

  check(
    'the guardian can close the cycle',
    'insert into log_entries as the guardian, through RLS',
    '201',
    `${written.status} ${JSON.stringify(written.payload).slice(0, 160)}`,
    written.status === 201,
  );

  const after = rows(`
    select next_reminder_at::text as next_reminder_at,
           (select count(*)::int from public.reminders r
             where r.tree_id = tree.id and r.resolved_at is null) as open,
           (select count(*)::int from public.reminders r
             where r.tree_id = tree.id and r.resolved_at is not null) as closed
    from public.trees tree where tree.id = '${treeId}'
  `)[0];

  check(
    'every open reminder for that tree is closed',
    'reminders.resolved_at after the entry, set by the growth log trigger',
    'no open reminders left',
    `open ${before.open} -> ${after.open}, closed ${after.closed}`,
    before.open > 0 && after.open === 0 && after.closed === before.open,
  );

  check(
    'the next date moves forward',
    'the generated next_reminder_at',
    'later than it was, and in the future',
    `${before.next_reminder_at} -> ${after.next_reminder_at}`,
    Date.parse(after.next_reminder_at) > Date.parse(before.next_reminder_at) &&
      Date.parse(after.next_reminder_at) > Date.now(),
  );

  forget();
  await runSweep();
  const chased = messages().filter((message) =>
    JSON.stringify(message.data ?? {}).includes(treeId),
  );
  check(
    'and the tree is not chased any more',
    'the batch after the photograph arrived',
    'nothing addressed about that tree',
    `${chased.length} messages`,
    chased.length === 0,
  );
}

function checkArchivedAndDeadNeverAppear() {
  heading('9 · Archived, dead and unassigned trees owe nothing');

  const archived = scalar(`
    select tree.id::text from public.trees tree
    where tree.guardian_id is not null and tree.archived_at is null and tree.status <> 'dead'
    order by tree.code desc limit 1;
  `);
  forceDueDaysAgo(archived, DAYS_UNTIL_OVERDUE);

  const beforeArchiving = Number(
    scalar(`select count(*)::text from public.due_reminders() where tree_id = '${archived}';`),
  );

  sql(`
    update public.trees
       set archived_at = now(),
           archived_by = '${userOf[COORDINATOR]}',
           archive_reason = 'check-reminders'
     where id = '${archived}';
  `);

  const afterArchiving = Number(
    scalar(`select count(*)::text from public.due_reminders() where tree_id = '${archived}';`),
  );

  check(
    'archiving a tree takes it out of the sweep',
    'due_reminders() for one overdue tree, before and after it was archived',
    `${beforeArchiving} rows -> 0 rows`,
    `${beforeArchiving} rows -> ${afterArchiving} rows`,
    beforeArchiving > 0 && afterArchiving === 0,
  );

  const stragglers = rows(`
    select due.tree_id::text as tree_id
    from public.due_reminders() due
    join public.trees tree on tree.id = due.tree_id
    where tree.archived_at is not null or tree.status = 'dead' or tree.guardian_id is null
  `);
  check(
    'none of the three ever appear',
    'every row due_reminders() returns, joined back to its tree',
    'no archived, dead or unassigned tree',
    stragglers.length === 0 ? 'none' : JSON.stringify(stragglers),
    stragglers.length === 0,
  );
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const stub = await startPushStub();

try {
  console.log('Resetting the database so the run starts from the seed...\n');
  supabaseCli(['db', 'reset']);

  const stack = localStack();
  API_URL = stack.API_URL;
  ANON_KEY = stack.ANON_KEY;
  SERVICE_ROLE_KEY = stack.SERVICE_ROLE_KEY;

  // Where the cron sends its request, and the key it carries. Vault rather than
  // a database setting, because `alter database ... set` on a custom parameter
  // needs superuser and `postgres` is not one, locally or hosted.
  // `host.docker.internal` is how the database container reaches the edge
  // runtime published on the host.
  sql(`
    select vault.create_secret(
      'http://host.docker.internal:${new URL(API_URL).port}/functions/v1/reminder-sweep',
      'reminder_sweep_url',
      'Endpoint of the reminder sweep Edge Function');
    select vault.create_secret(
      '${SERVICE_ROLE_KEY}',
      'reminder_sweep_key',
      'Service role key the reminder sweep carries');
  `);

  buildFixture();

  checkLadderMirrorsCore();
  checkSchedule();
  await checkFullCycle();
  checkGrouping();
  await checkIdempotence();
  await checkDeadToken();
  await checkEscalation();
  await checkPreference();
  await checkResolution();
  checkArchivedAndDeadNeverAppear();
} finally {
  stub.close();
}

heading(failures === 0 ? 'All reminder checks passed.' : `${failures} reminder check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
