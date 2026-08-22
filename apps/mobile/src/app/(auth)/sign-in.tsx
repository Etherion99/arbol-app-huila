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
        {/* The wordmark, until the visual identity of phase 9 replaces it with
            the real one. It is set in the display face rather than drawn, so
            the swap is an asset and not a layout. */}
        <AppText variant="title" style={styles.wordmark}>
          {texts.common.appName}
        </AppText>
        <AppText variant="display">{texts.signIn.title}</AppText>
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

      {/* Above the button and aligned right, which is where the canvas puts it:
          it belongs to the password field it follows, not to the row of things
          you do instead of signing in. */}
      <Link href="/forgot-password" style={styles.forgotLink}>
        <AppText variant="caption" style={styles.forgotText}>
          {texts.signIn.forgotPassword}
        </AppText>
      </Link>

      <View style={styles.actions}>
        <Button
          label={texts.signIn.submit}
          loadingLabel={texts.signIn.submitting}
          onPress={() => void form.submit()}
          isLoading={signIn.isPending || form.isSubmitting}
        />

        {/* A link and not an outlined button, which is how the canvas ranks the
            two ways out of this screen: creating an account is drawn as centred
            link text under the primary, and exploring without one is the
            bordered control at the foot. The ghost variant writes in `textLink`
            #00753A at 5.60:1, so the quieter emphasis costs no legibility. */}
        <Button
          label={texts.signIn.noAccount}
          onPress={() => router.push('/sign-up')}
          variant="ghost"
        />

        <View style={styles.divider}>
          <View style={styles.rule} />
          {/* The overline role, because the canvas sets this mark as a tracked
              microlabel rather than as running text. It draws it in the mono
              face at 10 points and neither survives here: the mono family is
              reserved for coordinates and measurements, and body never drops
              below 12. Open Sans at 12 with the same wide tracking keeps the
              character of the mark inside both rules. */}
          <AppText variant="overline">{texts.signIn.or}</AppText>
          <View style={styles.rule} />
        </View>

        {/* Bordered, as the canvas draws the foot of this screen. The canvas
            outlines it in `borderStrong`, and the catalogue's secondary uses
            `accent` instead because #B9D4C1 measures 1.52:1 on the page and a
            control boundary owes 3:1. That trade belongs to the catalogue and
            is kept here rather than re-decided. */}
        <Button
          label={texts.signIn.exploreAsGuest}
          onPress={() => router.replace('/map')}
          variant="secondary"
        />

        <Link href="/legal" style={styles.legalLink}>
          <AppText variant="caption" style={styles.legalText}>
            {texts.common.legalLink}
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    // The canvas sets the title 28 points below the wordmark, so the two read
    // as a mark and a heading and not as one stacked block.
    gap: spacing[6],
  },
  wordmark: {
    // Verde Huilense, as the canvas draws it. `accent` #008D46 is 4.12:1 on the
    // page and cannot carry small text, but this is the display face at 26
    // points, which is large text and answers to 3:1.
    color: colors.accent,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: spacing[2],
  },
  forgotText: {
    color: colors.textLink,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSubtle,
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
    // `textLink` #00753A and not `accent` #008D46: this is a 13 point caption,
    // which is small text, and the accent green reaches only 4.12:1 on the page
    // against the 4.5:1 it owes. The darker link green measures 5.60:1.
    color: colors.textLink,
  },
});
