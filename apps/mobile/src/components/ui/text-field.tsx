import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontSize, radii, spacing } from '@/constants/theme';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'onChangeText' | 'value'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  /** Shown under the field when there is nothing to correct. */
  hint?: string;
  /** Adds the reveal toggle and the right keyboard behaviour for a secret. */
  isPassword?: boolean;
};

/**
 * A labelled input that owns its own error and hint. The label is a real
 * label, not a placeholder: a placeholder disappears as soon as typing starts,
 * which leaves a form nobody can re-read.
 */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  hint,
  isPassword = false,
  ...rest
}: TextFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const hasError = error !== undefined;

  return (
    <View style={styles.container}>
      <AppText variant="label" nativeID={`${label}-label`}>
        {label}
      </AppText>

      <View style={[styles.inputRow, hasError && styles.inputRowError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !isRevealed}
          placeholderTextColor={colors.textSecondary}
          // Screen readers announce the label, then the error, so the reason a
          // field is flagged travels with it instead of living somewhere else.
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          accessibilityLabelledBy={`${label}-label`}
          style={styles.input}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setIsRevealed((current) => !current)}
            accessibilityRole="switch"
            accessibilityState={{ checked: isRevealed }}
            accessibilityLabel={isRevealed ? texts.signUp.hidePassword : texts.signUp.showPassword}
            accessibilityHint={texts.a11y.passwordVisibility}
            style={styles.reveal}
          >
            <AppText variant="caption" style={styles.revealLabel}>
              {isRevealed ? texts.signUp.hidePassword : texts.signUp.showPassword}
            </AppText>
          </Pressable>
        ) : null}
      </View>

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
    gap: spacing[1],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2],
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing[2],
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  reveal: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[1],
  },
  revealLabel: {
    color: colors.accent,
  },
  error: {
    color: colors.danger,
  },
});
