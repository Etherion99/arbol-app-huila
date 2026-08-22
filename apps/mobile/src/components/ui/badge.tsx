import type { TrackingStatus } from '@arbolapp/core';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { colors, fontFace, fontSize, radii, spacing } from '@/constants/theme';

type Tone = {
  /** The dot, which is where the legend colour of the state lives untouched. */
  dot: string;
  /**
   * The outline. The state colour wherever it clears 3:1 against the page, and
   * a darker stand-in where it does not.
   */
  edge: string;
  /** The pill fill, always the state colour at low opacity. */
  fill: string;
  /** The label. Always a neutral ink; no soft fill can carry its own colour. */
  ink: string;
};

/**
 * Every ratio below is measured against `surfacePage` `#F4FDF4`, which is the
 * worst of the two grounds a badge sits on — the card is plain white and any
 * dark ink reads higher there.
 *
 * **The label never takes the state colour.** Composited over the page, no soft
 * fill carries its own tone as small text: `stateOkSoft` reaches 3.45:1 and
 * `stateOverdueSoft` 2.55:1, and the canvas draws both of those wrong. A
 * neutral ink over the same fill reads 13:1 or better, so the state is spoken
 * by the dot, the fill and the outline, and the words are simply readable.
 *
 * `due_soon` is the exception the canvas already solved: `earthBrown`
 * `#8B572A` is the standing ink of the yellow state across the whole app, and
 * it reads 5.36:1 over `stateDueSoft`. It also has to carry the outline —
 * `stateDue` `#FFD700` is 1.35:1 against the page, so a yellow edge would draw
 * nothing at all.
 */
const TONES: Record<TrackingStatus | 'brand', Tone> = {
  // 4.12:1 edge, 14.00:1 label.
  up_to_date: {
    dot: colors.stateOk,
    edge: colors.stateOk,
    fill: colors.stateOkSoft,
    ink: colors.textPrimary,
  },
  // 5.78:1 edge, 5.36:1 label. The dot keeps the legend yellow.
  due_soon: {
    dot: colors.stateDue,
    edge: colors.earthBrown,
    fill: colors.stateDueSoft,
    ink: colors.earthBrown,
  },
  // 3.03:1 edge, 14.08:1 label.
  overdue: {
    dot: colors.stateOverdue,
    edge: colors.stateOverdue,
    fill: colors.stateOverdueSoft,
    ink: colors.textPrimary,
  },
  // 4.54:1 edge, 13.34:1 label.
  dead: {
    dot: colors.stateDead,
    edge: colors.stateDead,
    fill: colors.stateDeadSoft,
    ink: colors.textPrimary,
  },
  // 4.43:1 edge, 5.81:1 label. `textSecondary` rather than `textPrimary` on
  // purpose: an archived tree is out of the active map and its pill should
  // recede, and this is the quietest ink in the palette that still clears AA.
  archived: {
    dot: colors.stateArchived,
    edge: colors.stateArchived,
    fill: colors.stateArchivedSoft,
    ink: colors.textSecondary,
  },
  // 3.03:1 edge, 14.40:1 label. Naranja Plateño, never the Juventud en línea
  // magenta: that palette is an affiliation mark and is not allowed to enter
  // the interface, where it would compete with the five colours of the legend.
  brand: {
    dot: colors.accent2,
    edge: colors.accent2,
    fill: colors.accent2Soft,
    ink: colors.textPrimary,
  },
};

type CommonProps = {
  /** Off where the colour alone is enough, such as beside a `StatusDot`. */
  hasDot?: boolean;
  style?: ViewStyle;
};

export type BadgeProps = CommonProps &
  (
    | {
        status: TrackingStatus;
        /** Defaults to the shared name of the state. */
        label?: string;
      }
    | {
        /**
         * A distinction rather than a tracking state: the «Guardiana desde
         * 2025» pill of the profile. It is drawn in the secondary accent so it
         * cannot be mistaken for a claim about a tree.
         */
        status: 'brand';
        label: string;
      }
  );

/**
 * The state pill: the most repeated piece of the canvas. It appears on the map
 * card, on every row of the tree list, on the detail header and on the public
 * web sheet, and in all four it has to read the same.
 *
 * The canvas draws it with no outline, soft fill and dot only. It keeps the
 * outline here because the fill alone can no longer carry the state: a soft
 * tone composited over the page separates from it by at most 1.2:1, far under
 * the 3:1 that meaningful non-text content owes, and with the label neutral
 * the outline is the only place left where the state is stated at strength.
 */
export function Badge({ status, label, hasDot = true, style }: BadgeProps) {
  const tone = TONES[status];
  const shown = label ?? (status === 'brand' ? '' : texts.treeState[status]);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={shown}
      style={[styles.pill, { backgroundColor: tone.fill, borderColor: tone.edge }, style]}
    >
      {hasDot ? <View style={[styles.dot, { backgroundColor: tone.dot }]} /> : null}

      <AppText style={[styles.label, { color: tone.ink }]} numberOfLines={1}>
        {shown}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1] + 2,
    paddingVertical: 3,
    paddingHorizontal: spacing[2] + 2,
    borderWidth: 1,
    borderRadius: radii.full,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
  },
  label: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs + 4,
  },
});
