import type { TrackingStatus } from '@arbolapp/core';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { colors, fontFace, fontSize, radii, spacing } from '@/constants/theme';

type Tone = {
  /** Carries the state: border, dot and — where contrast allows — the label. */
  accent: string;
  /** The pill fill, always the state colour at low opacity. */
  fill: string;
  /**
   * The label. Normally the accent, but two tones cannot carry small text and
   * fall back to a readable neutral. See the note below.
   */
  ink: string;
};

const TONES: Record<TrackingStatus | 'brand', Tone> = {
  up_to_date: { accent: colors.stateOk, fill: colors.stateOkSoft, ink: colors.stateOk },
  due_soon: { accent: colors.stateDue, fill: colors.stateDueSoft, ink: colors.stateDue },
  overdue: {
    accent: colors.stateOverdue,
    fill: colors.stateOverdueSoft,
    ink: colors.stateOverdue,
  },
  dead: { accent: colors.stateDead, fill: colors.stateDeadSoft, ink: colors.stateDead },
  // The two exceptions. `stateArchived` reaches 3.44:1 on a card and
  // `brandMagenta` 4.34:1, both under the 4.5:1 a 12px label needs, and this
  // badge is read outdoors in direct sun. The state colour stays on the border
  // and the dot, which is where it does its work; only the text steps back to
  // a tone that can actually be read.
  archived: {
    accent: colors.stateArchived,
    fill: colors.stateArchivedSoft,
    ink: colors.textSecondary,
  },
  brand: {
    accent: colors.brandMagenta,
    fill: colors.brandMagentaSoft,
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
        /** Juventud en línea. A brand accent, never a claim about a tree. */
        status: 'brand';
        label: string;
      }
  );

/**
 * The state pill: the most repeated piece of the canvas. It appears on the map
 * card, on every row of the tree list, on the detail header and on the public
 * web sheet, and in all four it has to read the same.
 */
export function Badge({ status, label, hasDot = true, style }: BadgeProps) {
  const tone = TONES[status];
  const shown = label ?? (status === 'brand' ? '' : texts.treeState[status]);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={shown}
      style={[styles.pill, { backgroundColor: tone.fill, borderColor: tone.accent }, style]}
    >
      {hasDot ? <View style={[styles.dot, { backgroundColor: tone.accent }]} /> : null}

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
    fontFamily: fontFace.bodySemibold,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs + 4,
  },
});
