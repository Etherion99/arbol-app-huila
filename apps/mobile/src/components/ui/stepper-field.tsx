import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';

export type StepperFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  decreaseLabel: string;
  increaseLabel: string;
  hint?: string;
};

/**
 * A small whole number, entered by tapping rather than typing.
 *
 * Branch counts are single digits and the form is filled in standing up, in the
 * sun, next to a tree. Two large targets beat a keyboard that covers half the
 * screen for a number that is almost always under ten.
 */
export function StepperField({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  decreaseLabel,
  increaseLabel,
  hint,
}: StepperFieldProps) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>

      <View
        style={styles.row}
        // One adjustable control for a screen reader rather than three separate
        // nodes, so the value and its bounds are announced together.
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'increment' && canIncrease) {
            onChange(value + 1);
          }
          if (nativeEvent.actionName === 'decrement' && canDecrease) {
            onChange(value - 1);
          }
        }}
      >
        <Pressable
          onPress={() => onChange(value - 1)}
          disabled={!canDecrease}
          accessibilityRole="button"
          accessibilityLabel={decreaseLabel}
          accessibilityState={{ disabled: !canDecrease }}
          style={({ pressed }) => [
            styles.button,
            pressed && canDecrease && styles.pressed,
            !canDecrease && styles.blocked,
          ]}
        >
          <AppText variant="subtitle" style={styles.sign}>
            −
          </AppText>
        </Pressable>

        <View style={styles.readout} accessibilityElementsHidden>
          <AppText variant="data">{value}</AppText>
        </View>

        <Pressable
          onPress={() => onChange(value + 1)}
          disabled={!canIncrease}
          accessibilityRole="button"
          accessibilityLabel={increaseLabel}
          accessibilityState={{ disabled: !canIncrease }}
          style={({ pressed }) => [
            styles.button,
            pressed && canIncrease && styles.pressed,
            !canIncrease && styles.blocked,
          ]}
        >
          <AppText variant="subtitle" style={styles.sign}>
            +
          </AppText>
        </Pressable>
      </View>

      {hint !== undefined ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  label: {
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  button: {
    width: MIN_TOUCH_TARGET + spacing[2],
    height: MIN_TOUCH_TARGET + spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  readout: {
    flex: 1,
    height: MIN_TOUCH_TARGET + spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  sign: {
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
  blocked: {
    opacity: 0.4,
  },
});
