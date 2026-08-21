import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
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
      style={({ pressed }) => [
        styles.base,
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
        ) : null}
        <AppText variant="label" style={[styles.label, textStyles[variant]]}>
          {shown}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
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
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderSubtle,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
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
  // Dark ink on the green fill: the pair clears AA comfortably, which white on
  // the same green does not.
  primary: { color: colors.onAccent },
  secondary: { color: colors.textPrimary },
  ghost: { color: colors.accent },
  danger: { color: colors.danger },
});
