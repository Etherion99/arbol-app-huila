import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';

type Tone = 'error' | 'warning' | 'info' | 'success';

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
      {title !== undefined ? (
        <AppText variant="label" style={toneText[tone]}>
          {title}
        </AppText>
      ) : null}

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
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  retry: {
    marginTop: spacing.sm,
  },
});

const toneStyles = StyleSheet.create({
  error: { borderColor: colors.dangerText },
  warning: { borderColor: colors.warningText },
  info: { borderColor: colors.border },
  success: { borderColor: colors.primary },
});

const toneText = StyleSheet.create({
  error: { color: colors.dangerText },
  warning: { color: colors.warningText },
  info: { color: colors.textMuted },
  success: { color: colors.primary },
});
