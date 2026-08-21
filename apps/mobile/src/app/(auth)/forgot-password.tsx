import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
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

  // Supabase answers the same way whether or not the address exists, and so
  // does this screen. Saying "no such account" would turn the form into a way
  // of finding out who is registered.
  if (requestReset.isSuccess) {
    return (
      <Screen>
        <View style={styles.header}>
          <AppText variant="display">{texts.forgotPassword.sentTitle}</AppText>
          <AppText variant="bodyMuted">
            {texts.forgotPassword.sentBody(requestReset.data.email)}
          </AppText>
          <AppText variant="caption">{texts.forgotPassword.sentHint}</AppText>
        </View>

        <Button
          label={texts.forgotPassword.backToSignIn}
          onPress={() => router.replace('/sign-in')}
          variant="secondary"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display">{texts.forgotPassword.title}</AppText>
        <AppText variant="bodyMuted">{texts.forgotPassword.subtitle}</AppText>
      </View>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
});
