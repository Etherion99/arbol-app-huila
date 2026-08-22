import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, fontFace, fontSize, radii, spacing } from '@/constants/theme';

export type FilterChipProps = {
  label: string;
  /** Filled and carrying a clear affordance once something is chosen. */
  isActive: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
};

/**
 * One step of the Municipality then Village then Species filter.
 *
 * The canvas draws these chips 34 dp tall. That is under the 44 dp this project
 * requires of anything tappable, so the chip keeps its drawn height and reaches
 * the target through `hitSlop`: the visual stays faithful and the touch area
 * does not punish anyone using the app one handed on a slope.
 */
export function FilterChip({
  label,
  isActive,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: isActive }}
      hitSlop={(MIN_TOUCH_TARGET - CHIP_HEIGHT) / 2}
      style={({ pressed }) => [
        styles.chip,
        isActive ? styles.active : styles.idle,
        pressed && styles.pressed,
      ]}
    >
      <AppText
        variant="caption"
        style={[styles.label, isActive ? styles.activeLabel : styles.idleLabel]}
        numberOfLines={1}
      >
        {label}
      </AppText>
      <View style={styles.affordance}>
        <AppText
          variant="caption"
          style={[styles.affordanceGlyph, isActive ? styles.activeLabel : styles.idleLabel]}
        >
          {isActive ? '✕' : '▾'}
        </AppText>
      </View>
    </Pressable>
  );
}

const CHIP_HEIGHT = 34;

const RGBA = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/;

/**
 * Flattens a translucent token against an opaque one, the same sRGB mix the
 * renderer performs, so a colour whose meaning depends on its ground can be
 * resolved once instead of taking whatever is behind it at runtime.
 */
function flatten(overlay: string, base: string): string {
  const parsed = RGBA.exec(overlay);
  if (parsed === null) {
    return overlay;
  }

  const alpha = Number(parsed[4]);
  const channels = [1, 2, 3].map((index) => {
    const top = Number(parsed[index]);
    const bottom = Number.parseInt(base.slice(index * 2 - 1, index * 2 + 1), 16);
    return Math.round(top * alpha + bottom * (1 - alpha));
  });

  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The chosen chip's fill, which the catalogue gives as the soft accent.
 *
 * That token is translucent and a chip floats over a map, so left as it is the
 * fill would take the colour of whatever tile is under it — #0096C8 over the
 * Magdalena, which is a blue chip. Resolving it against the surface the chip is
 * drawn on gives the one colour the drawing means, #E0F1E9, wherever the chip
 * happens to sit.
 */
const ACTIVE_FILL = flatten(colors.accentSoft, colors.surfaceRaised);

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  /**
   * The same opaque lid the search row wears, and the same neutral resting
   * edge: a chip with nothing chosen shows a value, it does not act, so it does
   * not take the green. `borderStrong` would be the catalogue's edge and reads
   * 1.48:1 against this fill and 1.52:1 against the map ground, which is no
   * edge at all; the neutral grey reads 4.61:1 and 4.43:1.
   */
  idle: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.slateGrey,
  },
  /**
   * Green is what "chosen" means, and on paper the soft accent is a whisper:
   * #E0F1E9 against the idle white separates by only 1.16:1, so the fill alone
   * cannot say a filter is set. The chip carries the state on four channels
   * instead, and the two that do not depend on colour vision are the ones that
   * settle it: the affordance swaps ▾ for ✕ and the label steps up a weight.
   * The fill and the deep green edge are the reinforcement, not the message.
   *
   * `emerald700` #00592C reads 7.35:1 on this fill, far past the 3:1 an edge
   * owes; the accent green the chip used to set its label in reaches only
   * 3.66:1 there and cannot carry 13px text.
   */
  active: {
    backgroundColor: ACTIVE_FILL,
    borderColor: colors.emerald700,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  // 7.32:1 on the idle white.
  idleLabel: {
    color: colors.textSecondary,
  },
  /**
   * 7.35:1 on the chosen fill. A soft fill cannot carry its own accent as ink,
   * which is why this is the deep end of the green ramp rather than the accent.
   *
   * The heavier cut is named as a face rather than asked for with a weight.
   * React Native does not pick a weight out of a family: it needs the face to
   * have been loaded, and Roboto has no 600, so `fontWeight: '600'` here left
   * the label at the regular cut or smeared it. That matters more than usual,
   * because the weight is one of the two channels that say a filter is set.
   */
  activeLabel: {
    color: colors.emerald700,
    fontFamily: fontFace.bodyMedium,
  },
  affordance: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  affordanceGlyph: {
    fontSize: fontSize.xs,
  },
});
