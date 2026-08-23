import type { GuardianTreeSummary } from '@arbolapp/core';
import * as Notifications from 'expo-notifications';

import { texts } from '@/constants/texts';

/**
 * The reminder that does not need a server.
 *
 * ## What it is for
 *
 * Two guardians the sweep cannot reach. One denied the push permission, or is
 * on a build with no push project behind it. The other granted it and was in a
 * vereda with no signal on the morning it went out -- and while Expo and the
 * platform will hold a notification for a while, "a while" is not two months.
 * Neither of them should lose the cycle because of it.
 *
 * ## Why it cannot fire alongside the server's
 *
 * The whole ladder is designed so a guardian hears about a tree once. A local
 * copy landing next to the pushed one would undo that on the very devices where
 * everything is working, which is the majority of them.
 *
 * So the rule is exclusive rather than clever: these are scheduled only when
 * this installation is **not** registered for push. A registered device is one
 * the sweep already knows how to reach, and the sweep is the better sender --
 * it knows about every tree at once, it groups, and it escalates. The moment a
 * guardian grants the permission and the token is stored, the local ones are
 * cancelled; the moment they revoke it or sign out, they come back.
 *
 * There is no window where both are armed, because the same call that schedules
 * them is the one that cancels them and it is given the registration state as
 * an argument rather than reading it later.
 *
 * ## The date is not a countdown
 *
 * "Sixty days" is `MONTHS_BETWEEN_UPDATES` said in another unit, and saying it
 * again here would be a second copy of the cadence. Each notification is set
 * for the tree's own `nextReminderAt`, which the database generated with
 * `next_reminder_after()`. A tree whose photograph arrives early moves its own
 * date, and the next reschedule follows it.
 */

/**
 * Marks the notifications this module owns, so cancelling is exact.
 *
 * `cancelAllScheduledNotificationsAsync` would be simpler and is wrong: it
 * would also drop anything another part of the app ever schedules, and a bug
 * of that shape is invisible until the day the other feature exists.
 */
const LOCAL_REMINDER_PREFIX = 'local-growth-log';

const identifierFor = (treeId: string) => `${LOCAL_REMINDER_PREFIX}:${treeId}`;

/**
 * How far ahead a tree has to fall due to be worth scheduling.
 *
 * A date already past cannot be scheduled, and one a few seconds out would fire
 * while the guardian is still looking at the screen that scheduled it. Trees
 * already overdue are the app's own pending list, on screen, which is a better
 * place for them than a notification about something the guardian is reading.
 */
const MINIMUM_LEAD_MS = 60_000;

async function cancelAll(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter((notification) => notification.identifier.startsWith(LOCAL_REMINDER_PREFIX))
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
}

export type LocalReminderPlan = {
  /** Trees whose next photograph now has a local notification waiting for it. */
  scheduled: number;
  /** True when the server owns the sending and nothing local was armed. */
  deferredToServer: boolean;
};

/**
 * Cancels every local reminder and lays down the current set.
 *
 * Called on every opening rather than once at registration, because the set
 * changes underneath the phone: a tree planted on another device, a cycle
 * closed, a guardian reassigned. Rebuilding it wholesale is cheap -- a handful
 * of trees -- and it is the only version that cannot drift.
 */
export async function rescheduleLocalReminders(
  trees: readonly GuardianTreeSummary[],
  isRegisteredForPush: boolean,
): Promise<LocalReminderPlan> {
  await cancelAll();

  if (isRegisteredForPush) {
    return { scheduled: 0, deferredToServer: true };
  }

  const now = Date.now();
  let scheduled = 0;

  for (const tree of trees) {
    const dueAt = Date.parse(tree.nextReminderAt);
    if (!Number.isFinite(dueAt) || dueAt - now < MINIMUM_LEAD_MS) {
      continue;
    }

    // A dead tree's log is closed and an archived one is not the guardian's any
    // more. `guardian_trees()` already filters the archived ones out; the dead
    // are still listed, and they must not be asked for a photograph.
    if (tree.status === 'dead') {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(tree.treeId),
      content: {
        title: texts.notifications.localTitle(tree.speciesName),
        body: texts.notifications.localBody,
        // The same shape the pushed one carries, so the router that opens the
        // camera does not have to know which sender it came from.
        data: { treeId: tree.treeId, cycle: (tree.latestCycle ?? 0) + 1, source: 'local' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(dueAt),
      },
    });

    scheduled += 1;
  }

  return { scheduled, deferredToServer: false };
}

/** Drops every local reminder. Used on sign out, where the trees stop being ours. */
export async function clearLocalReminders(): Promise<void> {
  await cancelAll();
}
