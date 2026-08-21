import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { OptionSheet, type SheetOption } from '@/components/ui/option-sheet';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';

export type SelectProps = {
  label: string;
  options: SheetOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Shown while nothing is chosen. */
  placeholder?: string;
  /**
   * Offers a row that clears the choice. Leave it out on a required field:
   * there, "ninguno" is not one of the answers.
   */
  clearLabel?: string;
  hint?: string;
  error?: string;
  isLoading?: boolean;
  emptyLabel?: string;
  style?: ViewStyle;
};

/**
 * A choice from a closed list: the role on the sign up form, the municipality
 * and the vereda when a tree is registered.
 *
 * The catalogue draws a native `<select>`, which has no equivalent worth having
 * on a phone — the iOS wheel and the Android dropdown look nothing like each
 * other and neither looks like this design system. So the field keeps the
 * drawn shape and opens the same sheet the map filters already use, which also
 * means one list component instead of two.
 */
export function Select({
  label,
  options,
  selectedId,
  onSelect,
  placeholder,
  clearLabel,
  hint,
  error,
  isLoading = false,
  emptyLabel,
  style,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.id === selectedId);
  const shown = selected?.label ?? placeholder ?? texts.ui.selectPlaceholder;
  const hasError = error !== undefined;

  return (
    <View style={[styles.container, style]}>
      <AppText variant="label">{label}</AppText>

      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={texts.ui.selectOpen(label)}
        accessibilityValue={{ text: selected?.label }}
        accessibilityHint={error ?? hint}
        style={({ pressed }) => [
          styles.field,
          hasError && styles.fieldError,
          pressed && styles.pressed,
        ]}
      >
        <AppText
          variant="body"
          numberOfLines={1}
          style={[styles.value, selected === undefined && styles.placeholder]}
        >
          {shown}
        </AppText>

        <AppText variant="body" style={styles.chevron} accessibilityElementsHidden>
          ⌄
        </AppText>
      </Pressable>

      {hasError ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint !== undefined ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}

      <OptionSheet
        isVisible={isOpen}
        title={label}
        clearLabel={clearLabel}
        options={options}
        selectedId={selectedId}
        isLoading={isLoading}
        emptyLabel={emptyLabel}
        onSelect={(id) => {
          onSelect(id);
          setIsOpen(false);
        }}
        onClose={() => setIsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1] + 2,
  },
  field: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.75,
  },
  value: {
    flex: 1,
  },
  // Secondary rather than the catalogue's muted grey: at this size muted only
  // reaches 3.4:1 on a raised surface, and a placeholder still has to be read.
  placeholder: {
    color: colors.textSecondary,
  },
  chevron: {
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
  },
});
