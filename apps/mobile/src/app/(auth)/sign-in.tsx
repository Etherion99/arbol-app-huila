import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { colors, spacing } from '@/constants/theme';
import { signInSchema, type SignInValues } from '@/features/auth/auth-schemas';
import { describeMaybeAuthError } from '@/features/auth/auth-messages';
import { useSession } from '@/features/auth/session-provider';
import { useSignIn } from '@/features/auth/use-auth-mutations';
import { useZodForm } from '@/hooks/use-zod-form';
import { useIsOnline } from '@/hooks/use-is-online';

export default function SignInScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { didSessionExpire, acknowledgeExpiry } = useSession();
  const { passwordUpdated } = useLocalSearchParams<{ passwordUpdated?: string }>();
  const signIn = useSignIn();

  const form = useZodForm({
    schema: signInSchema,
    initialValues: { email: '', password: '' },
    onSubmit: async (values: SignInValues) => {
      acknowledgeExpiry();
      await signIn.mutateAsync(values).catch(() => {
        // Swallowed on purpose: the failure is read off the mutation below and
        // rendered, rather than thrown into a boundary that would replace the
        // form the guardian still needs.
      });
    },
  });

  const failure = describeMaybeAuthError(signIn.error);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display">{texts.signIn.title}</AppText>
        <AppText variant="bodyMuted">{texts.signIn.subtitle}</AppText>
      </View>

      {didSessionExpire ? <Notice tone="warning" message={texts.signIn.sessionExpired} /> : null}

      {passwordUpdated === 'true' ? (
        <Notice tone="success" message={texts.signIn.passwordUpdated} />
      ) : null}

      {failure !== null ? (
        <Notice
          tone="error"
          message={failure.message}
          onRetry={failure.isRetryable ? () => void form.submit() : undefined}
        />
      ) : null}

      {/* Said before the button is pressed, not after it fails. */}
      {!isOnline ? <Notice tone="warning" message={texts.common.offlineHint} /> : null}

      <View style={styles.form}>
        <TextField
          label={texts.signIn.emailLabel}
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
          returnKeyType="next"
        />

        <TextField
          label={texts.signIn.passwordLabel}
          value={form.values.password}
          onChangeText={(value) => form.setValue('password', value)}
          onBlur={() => form.reveal('password')}
          error={form.errorFor('password')}
          isPassword
          textContentType="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void form.submit()}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label={texts.signIn.submit}
          loadingLabel={texts.signIn.submitting}
          onPress={() => void form.submit()}
          isLoading={signIn.isPending || form.isSubmitting}
        />

        <Button
          label={texts.signIn.forgotPassword}
          onPress={() => router.push('/forgot-password')}
          variant="ghost"
        />

        <Button
          label={texts.signIn.noAccount}
          onPress={() => router.push('/sign-up')}
          variant="secondary"
        />

        <Button
          label={texts.signIn.exploreAsGuest}
          onPress={() => router.replace('/map')}
          variant="ghost"
        />

        <Link href="/legal" style={styles.legalLink}>
          <AppText variant="caption" style={styles.legalText}>
            {texts.account.legalLink}
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing[1],
  },
  form: {
    gap: spacing[4],
  },
  actions: {
    gap: spacing[2],
  },
  legalLink: {
    alignSelf: 'center',
    padding: spacing[2],
  },
  legalText: {
    color: colors.accent,
  },
});
