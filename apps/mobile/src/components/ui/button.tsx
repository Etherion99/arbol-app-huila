import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

/**
 * The heights of the catalogue. Only `lg` reaches the minimum target on its
 * own, so the two smaller ones are padded with `hitSlop` rather than grown:
 * the drawn size survives and the finger still lands.
 */
const HEIGHT: Record<Size, number> = { sm: 32, md: 40, lg: 48 };

/**
 * The ink each variant writes with. The label is 15 points, which WCAG counts
 * as small text, so every pair here has to clear 4.5:1 over its own ground:
 *
 * - `primary` — white on the `accentPressed` fill, 5.82:1.
 * - `secondary` — `textPrimary` over page or card, 16.74:1 at worst.
 * - `ghost` — `textLink` `#00753A`, 5.60:1 with no ground of its own.
 * - `danger` — `danger` `#E31B23` straight on the page, 4.54:1.
 *
 * The spinner reads from this map as well, so a button that is loading can
 * never draw itself in a colour its own label does not use.
 */
const LABEL_COLOR: Record<Variant, string> = {
  primary: colors.onAccent,
  secondary: colors.textPrimary,
  ghost: colors.textLink,
  danger: colors.danger,
};

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /**
   * Drawn before the label. The canvas uses it for the actions that name a
   * gesture rather than a place: «⌖ Sembrar», «↻ Actualizar».
   */
  icon?: ReactNode;
  /** Shows a spinner and blocks the press, so a slow call cannot be sent twice. */
  isLoading?: boolean;
  /** Text shown while `isLoading`, so the wait says what it is waiting for. */
  loadingLabel?: string;
  isDisabled?: boolean;
  /** Overrides the label as the accessible name when the label is not enough. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  isLoading = false,
  loadingLabel,
  isDisabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  // A button that is working is a button that must not be pressed again.
  // Signing up twice creates a second account and a second email against an
  // hourly quota that is already tight.
  const isBlocked = isDisabled || isLoading;
  const shown = isLoading && loadingLabel !== undefined ? loadingLabel : label;

  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? shown}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isBlocked, busy: isLoading }}
      hitSlop={Math.max(0, (MIN_TOUCH_TARGET - HEIGHT[size]) / 2)}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size] },
        styles[variant],
        pressed && !isBlocked && styles.pressed,
        isBlocked && styles.blocked,
        style,
      ]}
    >
      <View style={styles.content}>
        {isLoading ? <ActivityIndicator size="small" color={LABEL_COLOR[variant]} /> : icon}
        <AppText variant="label" style={[styles.label, textStyles[variant]]}>
          {shown}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    borderRadius: radii.md,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  label: {
    textAlign: 'center',
  },
  /**
   * Filled with `accentPressed` `#00753A` and not with `accent` `#008D46`:
   * white on `accent` measures 4.29:1, short of the 4.5:1 a 15 point label
   * owes, while white on `#00753A` reaches 5.82:1. `accent` keeps the work
   * where 3:1 is the bar — borders, icons, the status dot and the focus ring —
   * and stops being a fill under small text. The border follows the fill so
   * the shape stays one solid block.
   */
  primary: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accentPressed,
  },
  /**
   * No fill of its own: it borrows the page or the card it sits on, the way
   * the catalogue draws it. That leaves the border as the only thing telling
   * this control apart from `ghost`, which makes the border information the
   * control has to carry at 3:1 — and `borderStrong` `#B9D4C1` measures
   * 1.52:1 on the page, a boundary nobody can see. So the outline is drawn in
   * `accent` `#008D46` at 4.12:1, the same green the catalogue fills the
   * primary with, which reads as the quieter sibling of a solid button rather
   * than as a second one.
   */
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  /**
   * Outline rather than a soft red block. `danger` over a `dangerSoft` fill
   * composites to 3.75:1, under the 4.5:1 its 15 point label owes; the same
   * red straight on the page is 4.54:1 and on a card 4.72:1. The border
   * carries that same 4.54:1, well over the 3:1 a control boundary needs, so
   * the destructive action still reads as bounded and red without a fill that
   * costs it the label.
   */
  danger: {
    backgroundColor: 'transparent',
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.75,
  },
  blocked: {
    opacity: 0.55,
  },
});

const textStyles = StyleSheet.create({
  primary: { color: LABEL_COLOR.primary },
  secondary: { color: LABEL_COLOR.secondary },
  ghost: { color: LABEL_COLOR.ghost },
  danger: { color: LABEL_COLOR.danger },
});
