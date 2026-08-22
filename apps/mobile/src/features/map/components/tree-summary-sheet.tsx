import { Image, StyleSheet, View } from 'react-native';
import type { TrackingStatus } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { colors, effects, fontFace, fontSize, lineHeight, radii, spacing } from '@/constants/theme';
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
            <AppText variant="subtitle" style={styles.name} numberOfLines={1}>
              {card.speciesName}
            </AppText>

            <AppText variant="data" style={styles.meta} numberOfLines={1}>
              {[
                card.code,
                card.latestCycle === null
                  ? texts.map.cardNoCycle
                  : texts.map.cardCycle(card.latestCycle),
                card.guardianDisplayName ?? texts.map.cardNoGuardian,
              ].join(' · ')}
            </AppText>

            <AppText variant="data" style={styles.meta} numberOfLines={1}>
              {texts.map.cardUpdated(formatDate(card.lastUpdatedAt))}
            </AppText>
          </View>

          <StateBadge status={card.trackingStatus} label={stateLabel} />
        </View>

        <Button label={texts.map.cardOpen} onPress={onOpenDetail} />
      </View>

      {/* The catalogue's map disc rather than a private one. It floats half off
          the card and over the tiles, and `IconButton` is the component that
          already knows a white lid needs an `accent` ring to be a control at
          all on leaf-white ground. */}
      <IconButton
        icon={
          <AppText variant="body" style={styles.closeGlyph}>
            ✕
          </AppText>
        }
        onPress={onClose}
        accessibilityLabel={texts.map.cardClose}
        size="lg"
        style={styles.close}
      />
    </View>
  );
}

/**
 * How the pill is painted, part by part. It is the tone table of `Badge` in the
 * interface catalogue, and the two must never disagree: a tree that reads one
 * way on the map and another in the list looks like two trees.
 *
 * There is no `dot` key because this pill draws the real marker sprite in its
 * place, which is the only reason it is not `Badge` itself. The sprite is the
 * dot with the silhouette kept: it repeats the exact mark the guardian just
 * tapped, and the shape is the channel that survives a colour blindness.
 *
 * Ratios below are against the white card this pill sits on; the figures in
 * `Badge` are against `surfacePage`, which is the worse of the two grounds and
 * where the same colours read about four hundredths lower.
 *
 * **The label never takes the state colour.** Over its own soft fill the state
 * reaches 3.57:1 at best and 1.29:1 for the yellow, so the words are set in a
 * neutral that reads 13.87:1 or better and the state is spoken by the sprite,
 * the fill and the outline instead.
 *
 * `due_soon` is the standing exception: `earthBrown` `#8B572A` is the app-wide
 * ink of the yellow state at 5.51:1 over `stateDueSoft`, and it carries the
 * outline too, because a `#FFD700` edge measures 1.40:1 and would draw nothing.
 *
 * `archived` takes `textSecondary` rather than `textPrimary` on purpose, so an
 * archived tree's pill recedes; it still reads 6.03:1.
 */
type BadgeTone = {
  /** The outline: the state colour where it clears 3:1, a darker stand-in where not. */
  edge: string;
  /** The fill: always the state colour at low opacity. */
  fill: string;
  /** The label: always a neutral ink. */
  ink: string;
};

const BADGE_TONES: Record<TrackingStatus, BadgeTone> = {
  // 4.29:1 edge, 14.50:1 label.
  up_to_date: { edge: colors.stateOk, fill: colors.stateOkSoft, ink: colors.textPrimary },
  // 6.01:1 edge, 5.51:1 label.
  due_soon: { edge: colors.earthBrown, fill: colors.stateDueSoft, ink: colors.earthBrown },
  // 3.15:1 edge, 14.53:1 label.
  overdue: { edge: colors.stateOverdue, fill: colors.stateOverdueSoft, ink: colors.textPrimary },
  // 4.72:1 edge, 13.87:1 label.
  dead: { edge: colors.stateDead, fill: colors.stateDeadSoft, ink: colors.textPrimary },
  // 4.61:1 edge, 6.03:1 label.
  archived: {
    edge: colors.stateArchived,
    fill: colors.stateArchivedSoft,
    ink: colors.textSecondary,
  },
};

/**
 * The state, said in words as well as in colour and shape. The design system's
 * rule for direct sun is that state always carries a text label, and it is also
 * the only form a screen reader can read out.
 */
function StateBadge({ status, label }: { status: TrackingStatus; label: string }) {
  const tone = BADGE_TONES[status];

  return (
    <View style={[styles.badge, { backgroundColor: tone.fill, borderColor: tone.edge }]}>
      <Image source={markerSprite(status, false)} style={styles.badgeSprite} resizeMode="contain" />
      <AppText style={[styles.badgeLabel, { color: tone.ink }]}>{label}</AppText>
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
  /**
   * On leaf-white paper the card no longer separates from the map by being the
   * lighter thing: `surfaceCard` is plain white and the map ground is `#F4FDF4`,
   * 1.04:1 apart. What lifts it is the edge and the shadow.
   *
   * `borderStrong` `#B9D4C1` measures 1.52:1 against the map ground, so the
   * outline is the shape of the card and not the proof of it; the separation is
   * carried by `shadowOverlay`, ink at 22% over 40 points of blur, which is why
   * this card takes the overlay shadow and not the lighter `shadowCard` a list
   * card wears. The outline is a divider and not a control boundary — the
   * button and the close disc inside identify themselves — so the 3:1 of
   * SC 1.4.11 is not what it owes.
   */
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
  /**
   * A well one step below the card rather than a lid on top of it. Both are
   * white now, so `surfaceOverlay` on `surfaceCard` was a frame that could not
   * be seen; `surfacePage` tints it and `borderStrong` draws the edge at
   * 1.58:1. Neither reaches 3:1 and neither has to: the frame is decoration,
   * and what says «photograph» is the photograph, or the placeholder in its
   * place.
   */
  thumbnail: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[1],
    backgroundColor: colors.surfacePage,
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
  /**
   * The subtitle role, brought down to the size this dense card has room for.
   * It used to be a `label` asked for weight 700, and React Native registers
   * one face per weight: a Roboto 500 told to be bold renders a synthetic
   * smear, not a bold. Open Sans is the family the design system gives a
   * heading, and it is what the tree list already sets this same name in.
   */
  name: {
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.snug),
  },
  // The canvas sets this line in mono at 12, which is what the `data` variant
  // is for, but at the size a caption runs rather than the size a coordinate
  // does. The colour stays secondary: the canvas uses muted, and `textMuted`
  // `#757575` is a token the palette allows for large text and rules only —
  // 4.61:1 on this card and 4.43:1 on the page, under what 12px needs.
  // `textSecondary` `#4A5A50` reads 7.32:1 here.
  meta: {
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs + 4,
    color: colors.textSecondary,
  },
  /** The pill geometry of `Badge`, so the two are the same object. */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1] + 2,
    paddingVertical: 3,
    paddingHorizontal: spacing[2] + 2,
    borderWidth: 1,
    borderRadius: radii.full,
  },
  badgeSprite: {
    width: 14,
    height: 14,
  },
  badgeLabel: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs + 4,
  },
  close: {
    position: 'absolute',
    top: -spacing[2],
    right: -spacing[1],
  },
  closeGlyph: {
    color: colors.textPrimary,
  },
  /**
   * The palest real tint in the palette. `surfaceOverlay` used to read as a
   * lighter block on a dark card and is now the same white as the card itself,
   * which made the whole loading state invisible. `borderSubtle` `#DCEBDF` is
   * 1.24:1 against the card — the weight a skeleton wants, present without
   * pretending to be content.
   */
  skeleton: {
    backgroundColor: colors.borderSubtle,
  },
  skeletonLine: {
    height: 14,
    borderRadius: radii.sm,
  },
  skeletonLineShort: {
    width: '60%',
  },
});
