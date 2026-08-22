import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { spacing } from '@/constants/theme';
import {
  passwordResetRequestSchema,
  type PasswordResetRequestValues,
} from '@/features/auth/auth-schemas';
import { describeMaybeAuthError } from '@/features/auth/auth-messages';
import { useRequestPasswordReset } from '@/features/auth/use-auth-mutations';
import { useIsOnline } from '@/hooks/use-is-online';
import { useZodForm } from '@/hooks/use-zod-form';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const requestReset = useRequestPasswordReset();

  const form = useZodForm({
    schema: passwordResetRequestSchema,
    initialValues: { email: '' },
    onSubmit: async (values: PasswordResetRequestValues) => {
      await requestReset.mutateAsync(values).catch(() => {
        // Rendered from the mutation below.
      });
    },
  });

  const failure = describeMaybeAuthError(requestReset.error);

  return (
    <Screen header={<ScreenHeader title={texts.forgotPassword.title} />}>
      <AppText variant="bodyMuted">{texts.forgotPassword.subtitle}</AppText>

      {failure !== null ? (
        <Notice
          tone={failure.kind === 'emailRateLimited' ? 'warning' : 'error'}
          message={failure.message}
          onRetry={failure.isRetryable ? () => void form.submit() : undefined}
        />
      ) : null}

      {!isOnline ? <Notice tone="warning" message={texts.common.offlineHint} /> : null}

      <TextField
        label={texts.forgotPassword.emailLabel}
        placeholder={texts.signIn.emailPlaceholder}
        value={form.values.email}
        onChangeText={(value) => form.setValue('email', value)}
        onBlur={() => form.reveal('email')}
        error={form.errorFor('email')}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        inputMode="email"
        returnKeyType="send"
        onSubmitEditing={() => void form.submit()}
      />

      <View style={styles.actions}>
        <Button
          label={texts.forgotPassword.submit}
          loadingLabel={texts.forgotPassword.submitting}
          onPress={() => void form.submit()}
          isLoading={requestReset.isPending || form.isSubmitting}
        />

        <Button
          label={texts.forgotPassword.backToSignIn}
          onPress={() => router.back()}
          variant="ghost"
        />
      </View>

      {/* The canvas keeps this under the form rather than swapping the screen,
          and the reason is the wording itself: Supabase answers the same way
          whether or not the address exists, so «si existe una cuenta» is a
          caveat about the message, not a confirmation that one was sent. A
          screen that replaced the form would read as the second. */}
      {requestReset.isSuccess ? (
        <Notice
          // The success tone, because that is the box the canvas draws here: an
          // `accent-soft` fill under a green check. The tone reports that the
          // request left, which it did; the wording is what carries the caveat
          // that Supabase answers the same either way.
          tone="success"
          title={texts.forgotPassword.sentTitle}
          message={texts.forgotPassword.sentBody(requestReset.data.email)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing[2],
  },
});
