import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { colors, spacing } from '@/constants/theme';
import { newPasswordSchema, type NewPasswordValues } from '@/features/auth/auth-schemas';
import { describeMaybeAuthError } from '@/features/auth/auth-messages';
import { useAuthLink } from '@/features/auth/auth-link-provider';
import { useSession } from '@/features/auth/session-provider';
import { useSignOut, useUpdatePassword } from '@/features/auth/use-auth-mutations';
import { useIsOnline } from '@/hooks/use-is-online';
import { useZodForm } from '@/hooks/use-zod-form';

/**
 * Reached from the recovery email, which leaves behind a session that exists
 * only so the password can be replaced. The root guard keeps this screen
 * reachable during that window, and `endPasswordRecovery` closes it.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { session, isRecoveringPassword, endPasswordRecovery } = useSession();
  const { isExchanging, error: linkError } = useAuthLink();
  const updatePassword = useUpdatePassword();
  const signOut = useSignOut();

  const form = useZodForm({
    schema: newPasswordSchema,
    initialValues: { password: '', passwordConfirmation: '' },
    onSubmit: async (values: NewPasswordValues) => {
      const succeeded = await updatePassword
        .mutateAsync(values)
        .then(() => true)
        .catch(() => false);

      if (!succeeded) {
        return;
      }

      // Signing out afterwards is deliberate. The guardian proves the new
      // password by using it, and any other device holding a session opened
      // from the old one is not silently left signed in here.
      endPasswordRecovery();
      await signOut.mutateAsync().catch(() => {
        // Even if the local sign out fails there is a new password to report.
      });
      router.replace({ pathname: '/sign-in', params: { passwordUpdated: 'true' } });
    },
  });

  async function abandonRecovery() {
    endPasswordRecovery();
    await signOut.mutateAsync().catch(() => {
      // Nothing more to do: the screen leaves either way.
    });
    router.replace('/sign-in');
  }

  // This screen is also where the recovery email lands, so the first thing it
  // may be doing is turning the code in the link into a session.
  if (isExchanging) {
    return (
      <Screen isScrollable={false} hasConnectionBanner={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText variant="body">{texts.common.loading}</AppText>
        </View>
      </Screen>
    );
  }

  // No session here means the link was never exchanged, or it had already been
  // used. Either way there is nothing to change and saying so beats a form
  // that would fail on submit.
  if (session === null || !isRecoveringPassword) {
    return (
      <Screen>
        <View style={styles.header}>
          <AppText variant="display">{texts.resetPassword.linkExpiredTitle}</AppText>
          <AppText variant="bodyMuted">
            {linkError?.message ?? texts.resetPassword.linkExpiredBody}
          </AppText>
        </View>

        <Button
          label={texts.resetPassword.requestAnother}
          onPress={() => router.replace('/forgot-password')}
        />
      </Screen>
    );
  }

  const failure = describeMaybeAuthError(updatePassword.error);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display">{texts.resetPassword.title}</AppText>
        <AppText variant="bodyMuted">{texts.resetPassword.subtitle}</AppText>
      </View>

      {failure !== null ? (
        <Notice
          tone="error"
          message={failure.message}
          onRetry={failure.isRetryable ? () => void form.submit() : undefined}
        />
      ) : null}

      {!isOnline ? <Notice tone="warning" message={texts.common.offlineHint} /> : null}

      <View style={styles.form}>
        <TextField
          label={texts.resetPassword.passwordLabel}
          value={form.values.password}
          onChangeText={(value) => form.setValue('password', value)}
          onBlur={() => form.reveal('password')}
          error={form.errorFor('password')}
          isPassword
          textContentType="newPassword"
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <TextField
          label={texts.resetPassword.passwordConfirmationLabel}
          value={form.values.passwordConfirmation}
          onChangeText={(value) => form.setValue('passwordConfirmation', value)}
          onBlur={() => form.reveal('passwordConfirmation')}
          error={form.errorFor('passwordConfirmation')}
          isPassword
          textContentType="newPassword"
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void form.submit()}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label={texts.resetPassword.submit}
          loadingLabel={texts.resetPassword.submitting}
          onPress={() => void form.submit()}
          isLoading={updatePassword.isPending || form.isSubmitting}
        />

        <Button
          label={texts.resetPassword.cancel}
          onPress={() => void abandonRecovery()}
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  header: {
    gap: spacing[1],
  },
  form: {
    gap: spacing[4],
  },
  actions: {
    gap: spacing[2],
  },
});
