import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';

export type ChipOption<TValue extends string> = {
  value: TValue;
  label: string;
};

export type ChipGroupProps<TValue extends string> = {
  label: string;
  options: readonly ChipOption<TValue>[];
  value: TValue | null;
  onChange: (value: TValue) => void;
  /** Colours the selected chip, for the death report where green would be wrong. */
  tone?: 'accent' | 'danger';
  error?: string;
};

/**
 * A single choice out of a handful, shown as chips rather than as a dropdown.
 *
 * Every option is visible without a tap, which is what the health state and the
 * cause of death need: they are short closed lists and hiding them behind a
 * sheet turns one decision into three gestures.
 */
export function ChipGroup<TValue extends string>({
  label,
  options,
  value,
  onChange,
  tone = 'accent',
  error,
}: ChipGroupProps<TValue>) {
  const selected = tone === 'danger' ? selectedStyles.danger : selectedStyles.accent;
  const selectedText = tone === 'danger' ? textStyles.danger : textStyles.accent;

  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label} nativeID={`${label}-label`}>
        {label}
      </AppText>

      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected, checked: isSelected }}
              style={({ pressed }) => [
                styles.chip,
                isSelected && selected,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="caption"
                style={[styles.chipLabel, isSelected ? selectedText : styles.chipLabelIdle]}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {error !== undefined ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  label: {
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.full,
  },
  chipLabel: {
    textAlign: 'center',
  },
  chipLabelIdle: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: colors.danger,
  },
});

const selectedStyles = StyleSheet.create({
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.emerald600,
  },
  danger: {
    backgroundColor: colors.stateDeadSoft,
    borderColor: colors.stateDead,
  },
});

const textStyles = StyleSheet.create({
  accent: { color: colors.accent },
  danger: { color: colors.stateDead },
});
