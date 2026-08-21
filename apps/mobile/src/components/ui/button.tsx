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
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.onAccent : colors.textPrimary}
          />
        ) : (
          icon
        )}
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
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceOverlay,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
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
  // Dark ink on the green fill: the pair clears AA comfortably, which white on
  // the same green does not.
  primary: { color: colors.onAccent },
  secondary: { color: colors.textPrimary },
  // The catalogue's ghost label is emerald 400, one step brighter than the
  // accent fill, which is what keeps it legible without a background.
  ghost: { color: colors.emerald400 },
  danger: { color: colors.danger },
});
