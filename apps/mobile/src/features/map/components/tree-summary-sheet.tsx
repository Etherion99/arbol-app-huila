import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { TrackingStatus } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, effects, fontSize, radii, spacing } from '@/constants/theme';
import { markerSprite } from '@/features/map/marker-sprites';
import type { TreeCard } from '@/features/map/use-tree-card';

export type TreeSummarySheetProps = {
  card: TreeCard | null;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onClose: () => void;
  onOpenDetail: () => void;
};

/** Colombian time, which is what a date on this screen always means. */
const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Bogota',
});

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormatter.format(parsed);
}

/**
 * The card that rises over the map when a marker is tapped.
 *
 * Everything in it arrives from `tree_card`, in one request made on the tap.
 * The photograph is a signed URL minted for this card alone, because the bucket
 * is private and signing one per visible marker would be hundreds of requests
 * to paint a screen.
 */
export function TreeSummarySheet({
  card,
  isLoading,
  error,
  onRetry,
  onClose,
  onOpenDetail,
}: TreeSummarySheetProps) {
  if (error !== null) {
    return (
      <View style={styles.container}>
        <Notice
          tone="error"
          title={texts.map.errorTitle}
          message={texts.map.errorBody}
          onRetry={onRetry}
        />
      </View>
    );
  }

  if (isLoading || card === null) {
    return (
      <View style={styles.container} accessibilityRole="progressbar">
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.thumbnail, styles.skeleton]} />
            <View style={styles.identity}>
              <View style={[styles.skeletonLine, styles.skeleton]} />
              <View style={[styles.skeletonLine, styles.skeletonLineShort, styles.skeleton]} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  const stateLabel = texts.map.legend[card.trackingStatus];

  return (
    <View style={styles.container}>
      <View
        style={styles.card}
        accessibilityRole="summary"
        accessibilityLabel={texts.map.markerLabel(card.speciesName, stateLabel)}
      >
        <View style={styles.row}>
          <View style={styles.thumbnail}>
            {card.thumbnailUrl === null ? (
              // No photograph is a normal state, not a failure: the entry may
              // predate the upload. A placeholder, never a broken frame.
              <AppText variant="caption" style={styles.placeholder} numberOfLines={2}>
                {texts.map.cardNoPhoto}
              </AppText>
            ) : (
              <Image
                source={{ uri: card.thumbnailUrl }}
                style={styles.photo}
                resizeMode="cover"
                accessibilityLabel={texts.map.cardPhotoOf(card.speciesName)}
              />
            )}
          </View>

          <View style={styles.identity}>
            <AppText variant="label" style={styles.name} numberOfLines={1}>
              {card.speciesName}
            </AppText>

            <AppText variant="caption" style={styles.meta} numberOfLines={1}>
              {[
                card.code,
                card.latestCycle === null
                  ? texts.map.cardNoCycle
                  : texts.map.cardCycle(card.latestCycle),
                card.guardianDisplayName ?? texts.map.cardNoGuardian,
              ].join(' · ')}
            </AppText>

            <AppText variant="caption" style={styles.meta} numberOfLines={1}>
              {texts.map.cardUpdated(formatDate(card.lastUpdatedAt))}
            </AppText>
          </View>

          <StateBadge status={card.trackingStatus} label={stateLabel} />
        </View>

        <Button label={texts.map.cardOpen} onPress={onOpenDetail} />
      </View>

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={texts.map.cardClose}
        hitSlop={spacing[2]}
        style={styles.close}
      >
        <AppText variant="body" style={styles.closeGlyph}>
          ✕
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * The state, said in words as well as in colour and shape. The design system's
 * rule for direct sun is that state always carries a text label, and it is also
 * the only form a screen reader can read out.
 */
function StateBadge({ status, label }: { status: TrackingStatus; label: string }) {
  return (
    <View style={[styles.badge, badgeTone[status]]}>
      <Image source={markerSprite(status, false)} style={styles.badgeSprite} resizeMode="contain" />
      <AppText variant="caption" style={[styles.badgeLabel, badgeText[status]]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[3],
    right: spacing[3],
    bottom: spacing[3],
  },
  card: {
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    boxShadow: effects.shadowOverlay,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  thumbnail: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[1],
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  identity: {
    flex: 1,
    gap: spacing[1],
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  badgeSprite: {
    width: 14,
    height: 14,
  },
  badgeLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  close: {
    position: 'absolute',
    top: -spacing[2],
    right: -spacing[1],
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.full,
  },
  closeGlyph: {
    color: colors.textPrimary,
  },
  skeleton: {
    backgroundColor: colors.surfaceOverlay,
  },
  skeletonLine: {
    height: 14,
    borderRadius: radii.sm,
  },
  skeletonLineShort: {
    width: '60%',
  },
});

const badgeTone = StyleSheet.create({
  up_to_date: { backgroundColor: colors.stateOkSoft },
  due_soon: { backgroundColor: colors.stateDueSoft },
  overdue: { backgroundColor: colors.stateOverdueSoft },
  dead: { backgroundColor: colors.stateDeadSoft },
  archived: { backgroundColor: colors.stateArchivedSoft },
});

const badgeText = StyleSheet.create({
  up_to_date: { color: colors.stateOk },
  due_soon: { color: colors.stateDue },
  overdue: { color: colors.stateOverdue },
  dead: { color: colors.stateDead },
  // The archived grey is the one token that cannot carry small text, so the
  // badge that would use it takes the secondary tone instead.
  archived: { color: colors.textSecondary },
});
