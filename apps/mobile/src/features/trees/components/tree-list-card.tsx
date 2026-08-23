import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { texts } from '@/constants/texts';
import { colors, fontFace, radii, spacing } from '@/constants/theme';
import { useTreePendingSync } from '@/features/sync/sync-queue';
import type { GuardianTree } from '@/features/trees/use-guardian-trees';
import { useTreeThumbnail } from '@/features/trees/use-guardian-trees';
import { daysSince, formatDayAndMonth } from '@/lib/dates';

export type TreeListCardProps = {
  tree: GuardianTree;
  onOpen: () => void;
  onUpdate: () => void;
};

/**
 * One tree in the guardian's list.
 *
 * The state is never carried by colour alone. The badge pairs its fill with the
 * name of the state, and the line under the vereda says in words how overdue the
 * tree actually is -- which is what keeps the list readable for a guardian who
 * does not separate red from green, and what a screen reader reads out.
 *
 * The update button appears only on the trees that need one. A row of identical
 * buttons would make the list a wall and hide the two trees that are the reason
 * the guardian opened it.
 */
export function TreeListCard({ tree, onOpen, onUpdate }: TreeListCardProps) {
  const thumbnail = useTreeThumbnail(tree.latestThumbnailPath);
  const pending = useTreePendingSync(tree.treeId);
  const needsUpdate = tree.trackingStatus === 'due_soon' || tree.trackingStatus === 'overdue';

  // The newest cycle the guardian has actually recorded, which is the queued one
  // whenever there is one: `guardian_trees()` can only count what reached it.
  const shownCycle = pending.latestQueuedCycle ?? tree.latestCycle;

  return (
    <Card
      onPress={onOpen}
      // The card is a control, so its label replaces everything written inside
      // it: anything the overline says has to be said here too or a screen
      // reader never hears it.
      accessibilityLabel={`${texts.myTrees.cardLabel(
        tree.speciesRawText,
        texts.treeState[tree.trackingStatus],
      )}${pending.hasPending ? `. ${texts.myTrees.pendingBadge}` : ''}`}
    >
      <View style={[styles.row, !needsUpdate && styles.rowCentred]}>
        <View style={styles.thumbnail}>
          {thumbnail.data != null ? (
            <Image
              source={{ uri: thumbnail.data }}
              style={styles.thumbnailImage}
              contentFit="cover"
              // The species is already announced by the card itself, so the
              // photograph would only repeat it.
              accessibilityElementsHidden
            />
          ) : (
            // The tree the guardian has not photographed yet still has to look
            // like a tree. `emerald700` reads 8.52:1 on the white well, far over
            // the 3:1 an icon owes, where the canvas's palest greens draw nothing.
            <Icon name="sprout" size={26} color={colors.emerald700} />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.heading}>
            <AppText variant="subtitle" numberOfLines={1} style={styles.name}>
              {tree.speciesRawText}
            </AppText>
            <Badge status={tree.trackingStatus} />
          </View>

          <AppText variant="overline">
            {tree.villageName === null
              ? tree.code
              : `Vereda ${tree.villageName} · ${
                  shownCycle === null ? texts.myTrees.noCycle : texts.myTrees.cycle(shownCycle)
                }`}
            {/* The canvas hangs it off the end of the same overline rather than
                giving it a pill of its own, which is right: it is a fact about
                the line it extends — this vereda, this cycle, not yet sent —
                and a second badge beside the state badge would read as a second
                claim about the tree. */}
            {pending.hasPending ? (
              <AppText variant="overline" style={styles.pending}>
                {` · ${texts.myTrees.pendingBadge}`}
              </AppText>
            ) : null}
          </AppText>

          <AppText variant="caption" style={dueStyles[tree.trackingStatus]}>
            {describeDue(tree)}
          </AppText>

          {needsUpdate ? (
            <Button
              label={texts.growthLog.updateShort}
              onPress={onUpdate}
              size="md"
              icon={<Icon name="camera" size={16} color={colors.onAccent} />}
              style={styles.update}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/**
 * The plain language version of the state, which is the channel that survives
 * both a colour blindness and a screen read aloud.
 */
function describeDue(tree: GuardianTree): string {
  if (tree.trackingStatus === 'dead') {
    return texts.myTrees.dead;
  }

  const overdueDays = daysSince(tree.nextReminderAt);

  if (overdueDays > 0) {
    return texts.myTrees.overdueBy(overdueDays);
  }
  if (overdueDays === 0) {
    return texts.myTrees.dueToday;
  }

  return texts.myTrees.dueIn(formatDayAndMonth(tree.nextReminderAt));
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  /**
   * A card with no update button is three short lines against a 64 point well,
   * and the canvas centres those against each other. The cards that do carry a
   * button stay top aligned, because there the column is taller than the well.
   */
  rowCentred: {
    alignItems: 'center',
  },
  thumbnail: {
    width: 64,
    height: 64,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  name: {
    flex: 1,
  },
  update: {
    marginTop: spacing[1],
  },
  /**
   * The one tinted fragment of the overline, and the canvas tints it
   * `earthBrown` `#8B572A` — 5.78:1 on the page and 6.01:1 on the white card,
   * where this eleven point line owes 4.5:1. It is already the ink the app
   * gives the yellow "owed" state in the badge and in the header count, so a
   * guardian meets the same colour meaning the same thing in three places.
   *
   * Never the only channel: the words say it outright, which is what survives
   * both a colour blindness and a screen reader.
   */
  pending: {
    color: colors.earthBrown,
  },
});

/**
 * Never the only channel: it repeats what the badge and the sentence already
 * say.
 *
 * The canvas sets the overdue line in `stateOverdue` `#F26522`, which measures
 * 3.15:1 on the white card and 3.03:1 on the page. This line is 13 points, so
 * WCAG counts it as small text and asks 4.5:1, and the orange is short of it on
 * both grounds. The tree that is late is the reason the guardian opened this
 * list, so the emphasis stays and moves off the hue: `textPrimary` at 17.40:1
 * plus the medium face, against the `textSecondary` of the calm states. The
 * orange itself is untouched and keeps carrying the state in the badge edge and
 * the dot, where 3:1 is the bar it has to clear.
 */
const dueStyles = StyleSheet.create({
  up_to_date: { color: colors.textSecondary },
  due_soon: { color: colors.textSecondary },
  overdue: { fontFamily: fontFace.bodyMedium, color: colors.textPrimary },
  dead: { color: colors.textSecondary },
  archived: { color: colors.textSecondary },
});
