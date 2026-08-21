import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';
import { completeOnboarding } from '@/features/onboarding/onboarding-store';

const TOTAL_STEPS = texts.onboarding.steps.length;

export type OnboardingStepProps = {
  /** One based, so it reads the way the label on screen does. */
  step: number;
  /** Where "Siguiente" goes. The last step has no next screen. */
  nextHref?: '/onboarding/prae' | '/onboarding/guardian';
};

/**
 * The three intro screens differ only in their copy and in where the primary
 * button leads, so they share one component and the wording stays in the texts
 * file where it can be reviewed as a whole.
 */
export function OnboardingStep({ step, nextHref }: OnboardingStepProps) {
  const router = useRouter();
  const content = texts.onboarding.steps[step - 1];
  const isLastStep = nextHref === undefined;

  async function leaveOnboarding(destination: '/sign-up' | '/map' | '/sign-in') {
    await completeOnboarding();
    router.replace(destination);
  }

  if (content === undefined) {
    return null;
  }

  return (
    <Screen hasConnectionBanner={false}>
      <View style={styles.header}>
        <AppText
          variant="caption"
          accessibilityLabel={texts.a11y.onboardingProgress(step, TOTAL_STEPS)}
        >
          {texts.onboarding.stepLabel(step, TOTAL_STEPS)}
        </AppText>

        <Button
          label={texts.onboarding.skip}
          onPress={() => void leaveOnboarding('/map')}
          variant="ghost"
          accessibilityHint={texts.onboarding.exploreAsGuest}
        />
      </View>

      <View style={styles.body}>
        <AppText variant="display">{content.title}</AppText>
        <AppText variant="bodyMuted">{content.body}</AppText>
      </View>

      <View
        style={styles.dots}
        accessibilityRole="progressbar"
        accessibilityLabel={texts.a11y.onboardingProgress(step, TOTAL_STEPS)}
      >
        {texts.onboarding.steps.map((dotStep, index) => (
          <View key={dotStep.title} style={[styles.dot, index === step - 1 && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        {isLastStep ? (
          <>
            <Button
              label={texts.onboarding.start}
              onPress={() => void leaveOnboarding('/sign-up')}
            />
            <Button
              label={texts.onboarding.alreadyHaveAccount}
              onPress={() => void leaveOnboarding('/sign-in')}
              variant="secondary"
            />
          </>
        ) : (
          <Button label={texts.onboarding.next} onPress={() => router.push(nextHref)} />
        )}

        <Button
          label={texts.onboarding.exploreAsGuest}
          onPress={() => void leaveOnboarding('/map')}
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  actions: {
    gap: spacing.sm,
  },
});
