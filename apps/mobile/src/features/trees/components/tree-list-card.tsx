import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';
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
  const needsUpdate = tree.trackingStatus === 'due_soon' || tree.trackingStatus === 'overdue';

  return (
    <Card
      onPress={onOpen}
      accessibilityLabel={texts.myTrees.cardLabel(
        tree.speciesRawText,
        texts.treeState[tree.trackingStatus],
      )}
      style={styles.card}
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
            <Badge status={tree.trackingStatus} />
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
  card: {
    gap: spacing[3],
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
});

/** Never the only channel: it repeats what the badge and the sentence already say. */
const dueStyles = StyleSheet.create({
  up_to_date: { color: colors.textSecondary },
  due_soon: { color: colors.textSecondary },
  overdue: { color: colors.stateOverdue },
  dead: { color: colors.textSecondary },
  archived: { color: colors.textSecondary },
});
