import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontFace, radii, spacing } from '@/constants/theme';

export type WizardHeaderProps = {
  /** Zero based, because the steps live in an array. */
  step: number;
  totalSteps: number;
  title: string;
  onClose: () => void;
};

/**
 * The bar every step of the wizard sits under: a way out, where it is in the
 * sequence, and a progress rule of one segment per step.
 *
 * The segments are drawn rather than counted into a percentage because four
 * steps is a small enough number to show honestly, and a bar at 25% says less
 * than three empty boxes and one full one.
 */
export function WizardHeader({ step, totalSteps, title, onClose }: WizardHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={texts.planting.close}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <AppText variant="subtitle" style={styles.closeGlyph}>
            ✕
          </AppText>
        </Pressable>

        <AppText variant="caption" style={styles.stepLabel}>
          {texts.planting.stepLabel(step + 1, totalSteps)}
        </AppText>

        <AppText variant="subtitle" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={texts.planting.progressLabel(step + 1, totalSteps)}
        accessibilityValue={{ min: 1, max: totalSteps, now: step + 1 }}
      >
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, index <= step ? styles.segmentDone : styles.segmentPending]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  close: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing[3],
  },
  closeGlyph: {
    color: colors.textPrimary,
  },
  stepLabel: {
    fontFamily: fontFace.monoMedium,
    color: colors.textSecondary,
  },
  title: {
    flex: 1,
  },
  track: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radii.full,
  },
  segmentDone: {
    backgroundColor: colors.accent,
  },
  segmentPending: {
    backgroundColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.6,
  },
});
