import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { StatusDot } from '@/components/ui/status-dot';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, spacing } from '@/constants/theme';
import type {
  PendingActivity,
  ReminderActivity,
  ResolvedActivity,
} from '@/features/activity/use-activity-feed';
import { daysSince, formatShortDate } from '@/lib/dates';

export type PendingActivityRowProps = {
  item: PendingActivity;
  onOpen: () => void;
};

/**
 * One thing the guardian still has to do.
 *
 * The dot repeats the tree's tracking colour, but it is never the only channel:
 * the sentence names the tree and the cycle, and the line under it says in words
 * how late the photograph is. Read aloud, or read by somebody who does not
 * separate the orange from the yellow, the row still says everything.
 */
export function PendingActivityRow({ item, onOpen }: PendingActivityRowProps) {
  const sentence =
    item.villageName === null
      ? texts.activity.pendingRowNoPlace(item.speciesName, item.cycle)
      : texts.activity.pendingRow(item.speciesName, item.villageName, item.cycle);

  return (
    <Card
      onPress={onOpen}
      padding={spacing[3]}
      style={styles.row}
      accessibilityLabel={`${sentence}, ${describeDue(item.dueAt)}`}
      accessibilityHint={texts.activity.pendingRowHint}
    >
      <View style={styles.line}>
        <StatusDot status={item.trackingStatus} size={10} />

        <View style={styles.body}>
          <AppText variant="label">{sentence}</AppText>
          <AppText variant="caption">{describeDue(item.dueAt)}</AppText>
        </View>

        <Icon name="chevronRight" size={18} color={colors.textSecondary} />
      </View>
    </Card>
  );
}

export type ResolvedActivityRowProps = {
  item: ResolvedActivity;
};

/**
 * A cycle already closed.
 *
 * The canvas dims this whole row to 65% opacity to push it behind the pending
 * ones. That is applied here as ink rather than as opacity, because opacity
 * fades the mark along with the words: `stateOk` `#008D46` measures 4.12:1 on
 * the page at full strength and roughly 2.4:1 once it is composited at .65,
 * which puts the one graphic in the row under the 3:1 it owes. Instead the
 * sentence drops from `textPrimary` 16.74:1 to `textSecondary` 7.04:1 -- a
 * visible step back that still clears AA for small text -- and the check keeps
 * its full colour.
 */
export function ResolvedActivityRow({ item }: ResolvedActivityRowProps) {
  const sentence = item.onTime
    ? texts.activity.resolvedOnTime(item.speciesName, item.cycle)
    : texts.activity.resolvedLate(item.speciesName, item.cycle);

  return (
    <Card padding={spacing[3]} style={styles.row}>
      <View style={styles.line}>
        <Icon name="check" size={16} color={colors.stateOk} />

        <View style={styles.body}>
          {/* `bodyMuted` is the catalogue's body face in secondary ink, which is
              exactly the step back the dimmed row is asking for. */}
          <AppText variant="bodyMuted">{sentence}</AppText>
          <AppText variant="caption">{formatShortDate(item.capturedAt)}</AppText>
        </View>
      </View>
    </Card>
  );
}

export type ReminderActivityRowProps = {
  item: ReminderActivity;
  onOpen: () => void;
};

/**
 * One reminder the app sent, and what became of it.
 *
 * ## Why the state is a word and not a colour
 *
 * The three outcomes -- resolved, opened but unanswered, delivered and ignored
 * -- are a sequence, and a sequence drawn in colour needs three hues that read
 * as ordered. The five tracking colours are already spoken for and none of them
 * means "you opened this", so borrowing one would say something false on a
 * screen where the same palette means something specific. The line under the
 * tree says it in words instead, which also survives being read aloud.
 *
 * The row opens the growth log like a pending one, because a reminder that is
 * not resolved is still a photograph somebody owes. A resolved one opens it
 * too: the tree is the thing the row is about, and there is nothing else on
 * this screen for it to lead to.
 */
export function ReminderActivityRow({ item, onOpen }: ReminderActivityRowProps) {
  const sentence = texts.activity.reminderRow(item.speciesName, item.cycle);
  const state =
    item.resolvedAt !== null
      ? texts.activity.reminderResolved
      : item.openedAt !== null
        ? texts.activity.reminderOpened
        : texts.activity.reminderUnopened;

  return (
    <Card
      onPress={onOpen}
      padding={spacing[3]}
      style={styles.row}
      accessibilityLabel={`${texts.activity.reminderKind[item.kind]}. ${sentence}. ${state}`}
      accessibilityHint={texts.activity.pendingRowHint}
    >
      <View style={styles.line}>
        {/* A bell rather than a status dot: this row is about something the app
            did, not about the state of the tree, and the dot means the second
            everywhere else in the application. */}
        <Icon
          name="bell"
          size={16}
          color={item.resolvedAt === null ? colors.textSecondary : colors.stateOk}
        />

        <View style={styles.body}>
          <AppText variant="overline">{texts.activity.reminderKind[item.kind]}</AppText>
          <AppText variant="bodyMuted">{sentence}</AppText>
          <AppText variant="caption">{`${state} · ${formatShortDate(item.sentAt)}`}</AppText>
        </View>

        <Icon name="chevronRight" size={18} color={colors.textSecondary} />
      </View>
    </Card>
  );
}

/**
 * The pending section measures against today, which is the only thing a
 * guardian wants to know about something still owed.
 */
function describeDue(dueAt: string): string {
  const overdueDays = daysSince(dueAt);

  if (overdueDays > 0) {
    return texts.activity.daysAgo(overdueDays);
  }
  if (overdueDays === 0) {
    return texts.activity.today;
  }

  return texts.activity.inDays(Math.abs(overdueDays));
}

const styles = StyleSheet.create({
  /**
   * The canvas draws these rows shorter than a tree card, at 14 points of
   * padding rather than 16. Two lines of text clear the touch target on their
   * own, but the floor is set explicitly so a row whose sentence wraps to one
   * line is still 44 points tall.
   */
  row: {
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  body: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
});
