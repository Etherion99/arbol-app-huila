import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, fontFace, radii, spacing } from '@/constants/theme';

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
                style={[
                  styles.chipLabel,
                  isSelected ? styles.chipLabelSelected : styles.chipLabelIdle,
                ]}
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
    // The canvas draws these 38 tall. They are picked while standing in front
    // of the tree, so they take the minimum target instead.
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
  /**
   * Neutral ink, not the tone's own colour. `accent` on the composited
   * `accentSoft` fill measures 3.56:1 and `stateDead` on its own fill 3.62:1,
   * and this label is 13px, which owes 4.5:1. No soft fill in the palette can
   * carry its own colour as a label, so the tone stays in the border and the
   * fill and the word is set in ink: 14.44:1 on the green fill and 13.34:1 on
   * the red one.
   *
   * `textLink` `#00753A` would clear the green fill at 4.83:1, but the red tone
   * has no darker counterpart to match it with, and a selection that changes
   * ink colour in one tone and not the other reads as two different controls.
   *
   * Going from `textSecondary` to `textPrimary` is itself part of the state:
   * the chosen word darkens and thickens. The weight is the signal that does
   * not depend on colour at all, which is why the catalogue adds it.
   */
  chipLabelSelected: {
    fontFamily: fontFace.bodyMedium,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: colors.danger,
  },
});

/**
 * The border carries the choice, because the fills cannot: `accentSoft`
 * composites to `#d7f0df` over the page and `stateDeadSoft` to `#f2ddd7`, only
 * 1.21:1 and 1.30:1 away from the white of an unpicked chip.
 *
 * Against the `borderStrong` of an unpicked chip, `emerald600` separates at
 * 3.67:1 and `stateDead` at 2.98:1. The red falls a hair under the 3:1 a state
 * owes, and there is no darker red in the palette to reach it with — which is
 * why the darker, heavier label above is not decoration but the second half of
 * the signal in that tone.
 */
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
