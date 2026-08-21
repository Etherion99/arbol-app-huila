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
  field: {
    flex: 1,
    height: CONTROL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: 'rgba(21, 37, 31, 0.92)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.full,
  },
  glyph: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  placeholder: {
    flex: 1,
    fontSize: fontSize.base,
    // The canvas uses the muted grey here. At this size it only reaches 3.4:1
    // on a card, and this is a control read in direct sun, so it takes the
    // secondary tone instead, which clears AA on every surface.
    color: colors.textSecondary,
  },
  filled: {
    color: colors.textPrimary,
  },
  locate: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21, 37, 31, 0.92)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
