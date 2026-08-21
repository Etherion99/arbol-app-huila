import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { StateBadge } from '@/components/ui/state-badge';
import { texts } from '@/constants/texts';
import { colors, effects, radii, spacing } from '@/constants/theme';
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
 * The state is carried by three things at once -- the badge colour, the
 * silhouette inside it, and the word -- because the five tracking states are the
 * legend of this whole product and two of them collapse into one for anybody who
 * does not separate red from green. The line under the vereda is the fourth
 * channel: it says in words how overdue the tree actually is.
 *
 * The update button appears only on the trees that need one. A row of identical
 * buttons would make the list a wall and hide the two trees that are the reason
 * the guardian opened it.
 */
export function TreeListCard({ tree, onOpen, onUpdate }: TreeListCardProps) {
  const thumbnail = useTreeThumbnail(tree.latestThumbnailPath);
  const needsUpdate = tree.trackingStatus === 'due_soon' || tree.trackingStatus === 'overdue';

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={texts.myTrees.cardLabel(
        tree.speciesRawText,
        texts.map.legend[tree.trackingStatus],
      )}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
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
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.heading}>
            <AppText variant="subtitle" numberOfLines={1} style={styles.name}>
              {tree.speciesRawText}
            </AppText>
            <StateBadge status={tree.trackingStatus} />
          </View>

          <AppText variant="overline">
            {tree.villageName === null
              ? tree.code
              : `Vereda ${tree.villageName} · ${
                  tree.latestCycle === null
                    ? texts.myTrees.noCycle
                    : texts.myTrees.cycle(tree.latestCycle)
                }`}
          </AppText>

          <AppText variant="caption" style={dueStyles[tree.trackingStatus]}>
            {describeDue(tree)}
          </AppText>
        </View>
      </View>

      {needsUpdate ? (
        <Button label={texts.growthLog.updateShort} onPress={onUpdate} style={styles.update} />
      ) : null}
    </Pressable>
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
  card: {
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    boxShadow: effects.shadowCard,
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  thumbnail: {
    width: 64,
    height: 64,
    overflow: 'hidden',
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
  pressed: {
    opacity: 0.8,
  },
});

/** Never the only channel: it repeats what the badge and the sentence already say. */
const dueStyles = StyleSheet.create({
  up_to_date: { color: colors.textSecondary },
  due_soon: { color: colors.textSecondary },
  overdue: { color: colors.stateOverdue },
  dead: { color: colors.textSecondary },
  archived: { color: colors.textSecondary },
});
