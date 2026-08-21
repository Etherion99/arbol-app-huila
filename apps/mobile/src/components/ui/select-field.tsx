import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';

export type SelectFieldProps = {
  label: string;
  /** The chosen option, or null when nothing has been chosen yet. */
  value: string | null;
  placeholder: string;
  onPress: () => void;
  isDisabled?: boolean;
  hint?: string;
  error?: string;
};

/**
 * The row that opens a list. It is a button, not an input: the value comes from
 * a catalogue and cannot be typed, so a caret would promise something the
 * control does not do.
 *
 * The list itself is `OptionSheet`, which every filter on the map already uses.
 */
export function SelectField({
  label,
  value,
  placeholder,
  onPress,
  isDisabled = false,
  hint,
  error,
}: SelectFieldProps) {
  const hasError = error !== undefined;

  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>

      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={value === null ? `${label}: ${placeholder}` : `${label}: ${value}`}
        accessibilityHint={error ?? hint}
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.row,
          hasError && styles.rowError,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.blocked,
        ]}
      >
        <AppText
          variant="body"
          numberOfLines={1}
          style={[styles.value, value === null && styles.placeholder]}
        >
          {value ?? placeholder}
        </AppText>

        <AppText variant="caption" style={styles.caret} accessibilityElementsHidden>
          ▾
        </AppText>
      </Pressable>

      {hasError ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      {!hasError && hint !== undefined ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing[1],
  },
  label: {
    color: colors.textSecondary,
  },
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  rowError: {
    borderColor: colors.danger,
  },
  value: {
    flex: 1,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  caret: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  blocked: {
    opacity: 0.5,
  },
  error: {
    color: colors.danger,
  },
});
