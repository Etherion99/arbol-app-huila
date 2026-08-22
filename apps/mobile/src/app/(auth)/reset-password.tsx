import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
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
    initialValues: { password: '' },
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
      <Screen
        isScrollable={false}
        hasConnectionBanner={false}
        header={
          <ScreenHeader
            title={texts.resetPassword.title}
            onBack={() => router.replace('/sign-in')}
          />
        }
      >
        <View style={styles.spinner}>
          {/* Verde Huilense as a drawing rather than as text: `accent` is
              4.12:1 on the page, which clears the 3:1 a graphic owes and not
              the 4.5:1 a sentence would. */}
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText variant="bodyMuted">{texts.common.loading}</AppText>
        </View>
      </Screen>
    );
  }

  // No session here means the link was never exchanged, or it had already been
  // used. Either way there is nothing to change and saying so beats a form
  // that would fail on submit.
  if (session === null || !isRecoveringPassword) {
    return (
      <Screen
        header={
          <ScreenHeader
            title={texts.resetPassword.title}
            onBack={() => router.replace('/sign-in')}
          />
        }
      >
        {/* Centred in the viewport, the way the canvas draws every dead end:
            nothing here can be filled in, so the sentence and the way out sit
            together in the middle instead of hanging off the bar.

            The canvas opens it with an 88 point disc holding a broken link.
            That glyph is not in the icon kit — it is open as PD-08 in
            `PLAN-FIDELIDAD-UI.md` — and a disc filled with a stand-in
            character would read as a settled piece of the design system. The
            disc goes in with the glyph. */}
        <View style={styles.centred}>
          <AppText variant="title" style={styles.centredText}>
            {texts.resetPassword.linkExpiredTitle}
          </AppText>
          <AppText variant="bodyMuted" style={styles.centredText}>
            {linkError?.message ?? texts.resetPassword.linkExpiredBody}
          </AppText>

          <Button
            label={texts.resetPassword.requestAnother}
            onPress={() => router.replace('/forgot-password')}
            style={styles.recovery}
          />
        </View>
      </Screen>
    );
  }

  const failure = describeMaybeAuthError(updatePassword.error);

  return (
    <Screen
      header={
        <ScreenHeader
          title={texts.resetPassword.title}
          // The arrow does what «Cancelar» does: the recovery session exists
          // only to replace the password, so leaving has to close it rather
          // than drop the guardian into the app holding it.
          onBack={() => void abandonRecovery()}
        />
      }
    >
      <AppText variant="bodyMuted">{texts.resetPassword.subtitle}</AppText>

      {failure !== null ? (
        <Notice
          tone="error"
          message={failure.message}
          onRetry={failure.isRetryable ? () => void form.submit() : undefined}
        />
      ) : null}

      {!isOnline ? <Notice tone="warning" message={texts.common.offlineHint} /> : null}

      <TextField
        label={texts.resetPassword.passwordLabel}
        value={form.values.password}
        onChangeText={(value) => form.setValue('password', value)}
        onBlur={() => form.reveal('password')}
        error={form.errorFor('password')}
        hint={texts.signUp.passwordRequirement}
        isPassword
        textContentType="newPassword"
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => void form.submit()}
      />

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
  /** The spinner has an intrinsic size, so this column is the one that centres on both axes. */
  spinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  /**
   * Centred down the page but stretched across it, so the button underneath
   * still spans the column the way the canvas draws it. The text inside is
   * centred by `centredText` rather than by the container.
   */
  centred: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[4],
  },
  centredText: {
    textAlign: 'center',
  },
  recovery: {
    marginTop: spacing[2],
  },
  actions: {
    gap: spacing[2],
  },
});
