import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';

type Tone = 'error' | 'warning' | 'info' | 'success';

const GLYPH: Record<Tone, string> = {
  error: '✕',
  warning: '!',
  info: 'i',
  success: '✓',
};

export type NoticeProps = {
  tone: Tone;
  message: string;
  title?: string;
  /** Adds a retry button. Present whenever pressing again could work. */
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * The one way the app reports something the guardian has to know about.
 *
 * It is never optional decoration: a failure that is not shown is a guardian
 * who believes their photo went up when it did not, and in a vereda with
 * intermittent signal that is the normal case, not the edge case.
 */
export function Notice({ tone, message, title, onRetry, retryLabel }: NoticeProps) {
  return (
    <View
      style={[styles.container, toneStyles[tone]]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.heading}>
        {/* A glyph until the design system's icon kit is ported. The canvas
            never shows a notice without a mark: colour alone does not reach a
            guardian who cannot separate red from green. */}
        <AppText variant="label" style={toneText[tone]} accessibilityElementsHidden>
          {GLYPH[tone]}
        </AppText>

        {title !== undefined ? (
          <AppText variant="label" style={[styles.title, toneText[tone]]}>
            {title}
          </AppText>
        ) : null}
      </View>

      <AppText variant="body">{message}</AppText>

      {onRetry !== undefined ? (
        <Button
          label={retryLabel ?? texts.common.retry}
          onPress={onRetry}
          variant="secondary"
          style={styles.retry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
    padding: spacing[4],
    borderRadius: radii.md,
    borderWidth: 1,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    flex: 1,
  },
  retry: {
    marginTop: spacing[2],
  },
});

// Soft fill plus coloured border, which is how the catalogue builds every
// pill and callout. The fills composite over whatever surface is behind, so a
// notice on a card and one on the page both keep their ground.
const toneStyles = StyleSheet.create({
  error: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  warning: { borderColor: colors.warning, backgroundColor: colors.brandYellowSoft },
  info: { borderColor: colors.info, backgroundColor: colors.infoSoft },
  success: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});

const toneText = StyleSheet.create({
  error: { color: colors.danger },
  warning: { color: colors.warning },
  info: { color: colors.textSecondary },
  success: { color: colors.accent },
});
