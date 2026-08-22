import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { MIN_TOUCH_TARGET, colors, radii } from '@/constants/theme';

type Size = 'sm' | 'md' | 'lg';

/**
 * The three discs the catalogue draws: the header back and close buttons, the
 * search filter, and the floating map action. None of them is grown to the
 * minimum target — the drawn size is the design — so the smaller two are
 * padded with `hitSlop` instead, exactly as `Button` does.
 */
const SIDE: Record<Size, number> = { sm: 38, md: 42, lg: 44 };

export type IconButtonProps = {
  /**
   * The glyph, as a slot. The design system's icon kit is not ported yet and
   * inventing a private set here would only have to be thrown away when it
   * lands, so this wrapper owns the shape, the target and the states, and the
   * caller owns the glyph and its colour.
   */
  icon: ReactNode;
  onPress: () => void;
  /**
   * Required rather than optional. A control whose whole content is a drawing
   * has no accessible name of its own: without this a screen reader announces
   * it as «botón» and the guardian has to press it to find out what it does.
   */
  accessibilityLabel: string;
  accessibilityHint?: string;
  size?: Size;
  isDisabled?: boolean;
  style?: ViewStyle;
};

/**
 * A round button that is only an icon. It is the control the catalogue puts on
 * top of the map and in the header bars, where a worded button would cover the
 * thing the guardian is looking at.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  size = 'md',
  isDisabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={Math.max(0, (MIN_TOUCH_TARGET - SIDE[size]) / 2)}
      style={({ pressed }) => [
        styles.base,
        { width: SIDE[size], height: SIDE[size] },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.blocked,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * Opaque white, not the catalogue's raw `rgba(255, 255, 255, 0.94)`: these
   * discs sit over a moving map read in direct sun, and a lid that lets the
   * tiles through is a lid the icon has to compete with.
   *
   * The border is what draws the disc at all — white on the page is 1.04:1, so
   * without it there is no visible control — which makes it information the
   * control has to carry at 3:1. The catalogue's `borderStrong` `#B9D4C1`
   * measures 1.52:1 and does not, so the ring is `accent` `#008D46` at 4.12:1,
   * the same outline the secondary button wears.
   */
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceOverlay,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radii.full,
  },
  pressed: {
    opacity: 0.75,
  },
  blocked: {
    opacity: 0.55,
  },
});
