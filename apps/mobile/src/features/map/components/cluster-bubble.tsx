import { StyleSheet, View } from 'react-native';
import type { TrackingStatus } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { colors, fontFace, fontSize, radii } from '@/constants/theme';

export type ClusterBubbleProps = {
  count: number;
  status: TrackingStatus;
};

/**
 * How a bubble is painted, in the two channels it has left.
 *
 * The count is small text, so it answers to 4.5:1 and not to the 3:1 a mark on
 * the map owes. Over the bubble's white lid the state colours reach 4.29:1 for
 * «Al día», 3.15:1 for «Vencido» and **1.40:1** for «Por actualizar»: three of
 * the five states cannot write their own number. So the number is set in a
 * neutral, exactly as the `Badge` of the interface catalogue sets its label,
 * and the state moves entirely into the ring.
 *
 * The ring is measured against the map ground `#F4FDF4`, which is what a bubble
 * actually sits on. `earthBrown` `#8B572A` stands in for the yellow there for
 * the same reason it does on a badge — `stateDue` is 1.35:1 against that ground
 * and would draw no ring at all — and it is already the app-wide ink of that
 * state.
 *
 * There is no soft fill under the number, unlike a badge. A translucent tone
 * would let a road or a vereda label through and put the count over a ground
 * nobody controls, which is the whole reason the lid is opaque.
 */
type BubbleTone = {
  /** The ring, and the only place the state is stated at strength. */
  ring: string;
  /** The count. Always a neutral ink. */
  ink: string;
};

const TONES: Record<TrackingStatus, BubbleTone> = {
  // 4.12:1 ring, 17.40:1 count.
  up_to_date: { ring: colors.stateOk, ink: colors.textPrimary },
  // 5.78:1 ring, 6.01:1 count.
  due_soon: { ring: colors.earthBrown, ink: colors.earthBrown },
  // 3.03:1 ring, 17.40:1 count.
  overdue: { ring: colors.stateOverdue, ink: colors.textPrimary },
  // 4.54:1 ring, 17.40:1 count.
  dead: { ring: colors.stateDead, ink: colors.textPrimary },
  // 4.43:1 ring, 7.32:1 count. `textSecondary` rather than `textPrimary` so an
  // archived group recedes, the same choice the badge makes.
  archived: { ring: colors.stateArchived, ink: colors.textSecondary },
};

/**
 * A group of trees, drawn as one circle carrying its count.
 *
 * Unlike the tree markers this is a real view rather than a sprite, and that is
 * a deliberate exception: the number inside is different for every group, so it
 * cannot be pre-rendered, and there are only ever a handful of groups on screen
 * -- that is the entire point of grouping. The hundreds of marks that would
 * actually cost frames are the individual trees, and those are bitmaps.
 *
 * It grows with the count so the eye reads weight before it reads the number.
 */
export function ClusterBubble({ count, status }: ClusterBubbleProps) {
  const size = count >= 100 ? 44 : count >= 25 ? 36 : 28;
  const tone = TONES[status];

  return (
    <View
      style={[
        styles.bubble,
        { width: size, height: size, borderRadius: size / 2, borderColor: tone.ring },
      ]}
    >
      <AppText style={[styles.count, { color: tone.ink }]} numberOfLines={1}>
        {count}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceOverlay,
    // Two points rather than one and a half. The ring is now the only channel
    // the state has here, so it is drawn at the weight the markers give their
    // own rim instead of at a hairline.
    borderWidth: 2,
    borderRadius: radii.full,
  },
  /**
   * Montserrat, which is the family the design system gives headlines, figures
   * and buttons — and a count is a figure. It used to be the body face asked
   * for weight 700, a face that is not loaded and that renders as a synthetic
   * bold.
   */
  count: {
    fontFamily: fontFace.displaySemibold,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs + 4,
  },
});
