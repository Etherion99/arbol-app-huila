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

/** Turns a `#RRGGBB` token into the `rgba()` a translucent panel needs. */
function withAlpha(hex: string, alpha: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * The raised surface at 88%, so the map still reads through the legend without
 * the labels losing their ground.
 *
 * It stays translucent where the search row above it went opaque, and the
 * difference is what each one is for: the row is pressed and has to be a lid,
 * the legend is only read and sits in a corner a guardian may want to see past.
 * Composited over every fill the map style paints, the panel lands between
 * #FFFFFF and #E0F3FB — the darkest of them over the Magdalena.
 */
const PANEL = withAlpha(colors.surfaceRaised, 0.88);

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: PANEL,
    borderWidth: 1,
    // `borderSubtle` reads 1.15:1 against this panel and 1.19:1 against the map
    // ground, so it draws no edge and the legend would bleed into the tiles.
    // The neutral grey reads 4.03:1 at worst against the panel. It is grey and
    // not the accent on purpose: the panel encloses a green `up_to_date`
    // sprite, and a green rule around it is the frame competing with the key.
    borderColor: colors.slateGrey,
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
    // 12, is also the floor this project reads outdoors, so the legend takes
    // it. The size is the only thing that differs: the canvas sets this label
    // in the same secondary tone and keeps the colour in the mark beside it,
    // which is what the sprite already does. 6.31:1 at worst on the panel.
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
