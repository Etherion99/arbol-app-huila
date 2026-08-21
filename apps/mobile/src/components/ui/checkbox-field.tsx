import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';

export type CheckboxFieldProps = {
  label: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
  error?: string;
  accessibilityHint?: string;
};

/**
 * A checkbox whose whole row is the target. The label of the two boxes on the
 * sign up form is a legal statement, so it is long on purpose; making only the
 * square tappable would be a 20 px target next to four lines of text.
 */
export function CheckboxField({
  label,
  isChecked,
  onChange,
  error,
  accessibilityHint,
}: CheckboxFieldProps) {
  const hasError = error !== undefined;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange(!isChecked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
        accessibilityLabel={label}
        accessibilityHint={error ?? accessibilityHint}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.box,
            isChecked && styles.boxChecked,
            hasError && !isChecked && styles.boxError,
          ]}
        >
          {isChecked ? (
            <AppText variant="label" style={styles.mark}>
              ✓
            </AppText>
          ) : null}
        </View>

        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
      </Pressable>

      {hasError ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  box: {
    width: 26,
    height: 26,
    // Nudged down so the square lines up with the first line of a label that
    // wraps over several lines.
    marginTop: 1,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  boxError: {
    borderColor: colors.dangerText,
  },
  mark: {
    color: colors.textOnLight,
    lineHeight: 22,
  },
  label: {
    flex: 1,
  },
  error: {
    color: colors.dangerText,
  },
});
