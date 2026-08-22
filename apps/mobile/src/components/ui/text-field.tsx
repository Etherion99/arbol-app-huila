import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import {
  MIN_TOUCH_TARGET,
  colors,
  effects,
  fontFace,
  fontSize,
  radii,
  spacing,
} from '@/constants/theme';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'onChangeText' | 'value'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  /** Shown under the field when there is nothing to correct. */
  hint?: string;
  /** A unit printed inside the field, after the value: `cm` on a height. */
  suffix?: string;
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
  suffix,
  isPassword = false,
  ...rest
}: TextFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hasError = error !== undefined;

  return (
    <View style={styles.container}>
      <AppText variant="label" nativeID={`${label}-label`} style={styles.label}>
        {label}
      </AppText>

      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputRowFocused,
          hasError && styles.inputRowError,
        ]}
      >
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
          // After the spread, so a caller passing its own handler still gets
          // the focus ring instead of silently replacing it.
          onFocus={(event) => {
            setIsFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            rest.onBlur?.(event);
          }}
        />

        {suffix !== undefined ? (
          <AppText variant="data" style={styles.suffix}>
            {suffix}
          </AppText>
        ) : null}

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
  // The quieter of the two inks, which is how the catalogue draws every field
  // label. It reads at 7.04:1 on the page, so receding costs nothing here.
  label: {
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    // White on a near-white page separates by 1.06:1, so the border is the only
    // thing that says "input" — which puts it under SC 1.4.11 and its 3:1.
    // `borderStrong` reaches 1.52:1 on the page and cannot carry that; the
    // neutral grey of the palette reaches 4.43:1 on the page and 4.61:1 against
    // the field's own white. The catalogue draws this edge in `borderStrong`
    // and the measurement overrules it: an invisible boundary is not a style.
    borderColor: colors.slateGrey,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2],
  },
  // Focus swaps the border to the accent *and* lays the two-ring token around
  // the field. The swap alone would not do: the accent and the resting grey sit
  // at 1.07:1 of each other, near enough in luminance that the change of colour
  // is no change at all without hue vision. The ring is what carries the state,
  // and its outer band is `borderFocus` at 4.12:1 against the page. The 3px
  // `accentSoft` halo this replaces composited to 1.16:1 over the page — on a
  // light theme that translucent green is simply not there.
  inputRowFocused: {
    borderColor: colors.borderFocus,
    boxShadow: effects.focusRing,
  },
  // 4.72:1 against the field's own white and 4.54:1 against the page, so the
  // flagged edge clears AA outright, not just the 3:1 a border owes.
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing[2],
    // A TextInput is not an AppText and inherits nothing, so without this the
    // field renders in the system font while every label beside it is Roboto.
    fontFamily: fontFace.bodyRegular,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  // Mono, smaller and quieter than the value, the way the catalogue prints a
  // unit. `textMuted` is under AA on the page but this sits on the field's own
  // white, where it measures 4.61:1.
  suffix: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingLeft: spacing[1],
  },
  reveal: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[1],
  },
  // The darker green, because this is a 13px word and `accent` only reaches
  // 4.29:1 on white. `textLink` reaches 5.82:1 there.
  revealLabel: {
    color: colors.textLink,
  },
  // The message sits below the field, on the page, where `danger` is 4.54:1.
  error: {
    color: colors.danger,
  },
});
