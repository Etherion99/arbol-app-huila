import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, fontSize, radii, spacing } from '@/constants/theme';

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
  idle: {
    // The card surface at 92%, which is how every floating control on this
    // screen sits over the map.
    backgroundColor: 'rgba(21, 37, 31, 0.92)',
    borderColor: colors.borderStrong,
  },
  active: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.emerald700,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  idleLabel: {
    color: colors.textSecondary,
  },
  activeLabel: {
    color: colors.accent,
    fontWeight: '600',
  },
  affordance: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  affordanceGlyph: {
    fontSize: fontSize.xs,
  },
});
