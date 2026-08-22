import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontSize, radii, spacing } from '@/constants/theme';

export type MapSearchBarProps = {
  /** What is currently being searched for, or null when nothing is. */
  query: string | null;
  onPress: () => void;
  onLocationPress: () => void;
};

/**
 * The pill across the top of the map and the location control beside it.
 *
 * It is a button rather than a text field: typing over a map means the keyboard
 * covers the thing being searched, so pressing this opens a sheet that owns the
 * whole screen while the search is happening.
 */
export function MapSearchBar({ query, onPress, onLocationPress }: MapSearchBarProps) {
  const hasQuery = query !== null && query.trim() !== '';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={texts.map.searchLabel}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <AppText variant="caption" style={styles.glyph}>
          ⌕
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={1}
          style={[styles.placeholder, hasQuery && styles.filled]}
        >
          {hasQuery ? query : texts.map.searchPlaceholder}
        </AppText>
      </Pressable>

      <Pressable
        onPress={onLocationPress}
        accessibilityRole="button"
        accessibilityLabel={texts.map.myLocation}
        style={({ pressed }) => [styles.locate, pressed && styles.pressed]}
      >
        <AppText variant="caption" style={styles.locateGlyph}>
          ◎
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * The canvas draws both of these 42 dp tall. Rounded up to the touch target
 * this project holds every control to, which is the one place the map is
 * allowed to differ from the drawing: two points of height against a control
 * that has to be hit while standing in a field is not a trade worth making.
 */
const CONTROL_HEIGHT = MIN_TOUCH_TARGET;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  /**
   * The catalogue floats this pill at 94% white. It is drawn opaque instead,
   * for the reason the icon button already records: a control read in direct
   * sun over tiles that are moving under it should not let those tiles through,
   * and at 94% over a leaf-white map the difference is #FEFFFE against #FFFFFF.
   * Opaque also means the fill is the token itself rather than a hand-mixed
   * `rgba()` that would drift from `surfaceRaised` the next time it moves.
   *
   * White on a near-white map separates by 1.04:1, so the border is the whole
   * of what draws the pill, which puts it under SC 1.4.11 and its 3:1.
   * `borderStrong` #B9D4C1 measures 1.52:1 against the map ground and 1.48:1
   * against this fill and carries nothing. The neutral grey reaches 4.43:1 on
   * the ground and 4.61:1 on the fill, and it is the resting edge every other
   * field in the app wears — green is reserved here for the control beside it,
   * which is an action rather than a value.
   */
  field: {
    flex: 1,
    height: CONTROL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.slateGrey,
    borderRadius: radii.full,
  },
  glyph: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  placeholder: {
    flex: 1,
    fontSize: fontSize.base,
    // The canvas uses the muted grey here. It reaches 4.61:1 on this pill's own
    // white but only 4.43:1 on the map ground the pill floats over, so it is
    // short of AA on the surface a guardian actually reads it against, in
    // direct sun, standing up. The secondary tone measures 7.32:1 on the same
    // fill and is the palette's one quiet tone that clears AA everywhere.
    color: colors.textSecondary,
  },
  filled: {
    color: colors.textPrimary,
  },
  /**
   * The same opaque lid as the pill, and the accent ring the icon buttons wear:
   * this disc asks to be pressed rather than showing a value, and green is how
   * the app says so. `accent` measures 4.29:1 against the fill and 4.12:1
   * against the map ground, both clear of the 3:1 a control boundary owes.
   */
  locate: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.full,
  },
  locateGlyph: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
});
