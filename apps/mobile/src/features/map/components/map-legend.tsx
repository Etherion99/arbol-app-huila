import { Image, StyleSheet, View } from 'react-native';
import type { TrackingStatus } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { colors, fontSize, radii, spacing } from '@/constants/theme';
import { markerSprite } from '@/features/map/marker-sprites';

/**
 * The four states a tree can be in on the map, drawn with the same sprites the
 * markers use.
 *
 * Showing the real bitmap rather than a coloured dot is the point: the shapes
 * are the second channel that keeps the legend readable for a guardian who does
 * not separate red from green, and a legend that showed plain circles would
 * teach the wrong key.
 *
 * Archived is not listed because an archived tree never reaches the map.
 */
const SHOWN: TrackingStatus[] = ['up_to_date', 'due_soon', 'overdue', 'dead'];

export function MapLegend() {
  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={texts.map.legendTitle}
    >
      {SHOWN.map((status) => (
        <View key={status} style={styles.row}>
          <Image source={markerSprite(status, false)} style={styles.sprite} resizeMode="contain" />
          <AppText variant="caption" style={styles.label}>
            {texts.map.legend[status]}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    // The design system's raised surface at 88%, so the map reads through it
    // without the labels losing their ground.
    backgroundColor: 'rgba(16, 29, 24, 0.88)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sprite: {
    width: 18,
    height: 18,
  },
  label: {
    // The canvas sets 11px here. The scale has no such step and its smallest,
    // 12, is also the floor this project reads outdoors, so the legend takes it.
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
