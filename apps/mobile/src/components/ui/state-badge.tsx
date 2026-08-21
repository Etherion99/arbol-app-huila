import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { TrackingStatus } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { StateGlyph } from '@/components/ui/state-glyph';
import { texts } from '@/constants/texts';
import { colorByTrackingStatus, colors, fontSize, radii, spacing } from '@/constants/theme';

export type StateBadgeProps = {
  status: TrackingStatus;
  style?: ViewStyle;
};

/**
 * The pill that names a tree's tracking state.
 *
 * Three channels, deliberately: the fill and the text colour, the silhouette,
 * and the word itself. The design system's own note says the five state colours
 * are the legend of the whole product, and a badge that leant on hue alone
 * would undo on a list what the map takes such care to get right.
 *
 * `stateArchived` is the same grey as `textMuted` and tops out at 4.01:1, so it
 * would fail AA as small text on the page. Inside the badge it sits on its own
 * soft fill rather than on the page, and the glyph and the word carry the
 * meaning even where the grey recedes.
 */
export function StateBadge({ status, style }: StateBadgeProps) {
  const label = texts.map.legend[status];

  return (
    <View
      style={[styles.badge, { backgroundColor: softFill[status] }, style]}
      accessibilityRole="text"
      accessibilityLabel={texts.a11y.treeState(label)}
    >
      <StateGlyph status={status} size={8} />
      <AppText variant="caption" style={[styles.label, { color: colorByTrackingStatus[status] }]}>
        {label}
      </AppText>
    </View>
  );
}

const softFill: Record<TrackingStatus, string> = {
  up_to_date: colors.stateOkSoft,
  due_soon: colors.stateDueSoft,
  overdue: colors.stateOverdueSoft,
  dead: colors.stateDeadSoft,
  archived: colors.stateArchivedSoft,
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  label: {
    // The canvas sets 11–12px here. The scale's smallest step is 12, which is
    // also the floor this project reads outdoors, so the badge takes it.
    fontSize: fontSize.xs,
  },
});
