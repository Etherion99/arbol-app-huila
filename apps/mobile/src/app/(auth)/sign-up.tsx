import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { colors, spacing } from '@/constants/theme';
import { signUpSchema, type SignUpInput, type SignUpValues } from '@/features/auth/auth-schemas';
import { describeMaybeAuthError } from '@/features/auth/auth-messages';
import { useSignUp } from '@/features/auth/use-auth-mutations';
import { useIsOnline } from '@/hooks/use-is-online';
import { useZodForm } from '@/hooks/use-zod-form';

const INITIAL_VALUES: SignUpInput = {
  fullName: '',
  email: '',
  institution: '',
  password: '',

  isAdultConfirmed: false,
  termsAccepted: false,
};

export default function SignUpScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const signUp = useSignUp();

  const form = useZodForm({
    schema: signUpSchema,
    initialValues: INITIAL_VALUES,
    onSubmit: async (values: SignUpValues) => {
      const result = await signUp.mutateAsync(values).catch(() => null);
      if (result === null) {
        return;
      }

      // An address that already has an account is sent to sign in instead of
      // to a screen that would wait for an email nobody is going to send.
      if (result.isExistingAccount) {
        router.replace({ pathname: '/sign-in', params: { email: result.email } });
        return;
      }

      router.replace({ pathname: '/verify-email', params: { email: result.email } });
    },
  });

  const failure = describeMaybeAuthError(signUp.error);
  const hasBothConsents = form.values.isAdultConfirmed && form.values.termsAccepted;

  return (
    <Screen header={<ScreenHeader title={texts.signUp.title} />}>
      <AppText variant="bodyMuted">{texts.signUp.subtitle}</AppText>

      {failure !== null ? (
        <Notice
          tone={failure.kind === 'emailRateLimited' ? 'warning' : 'error'}
          message={failure.message}
          onRetry={failure.isRetryable ? () => void form.submit() : undefined}
        />
      ) : null}

      {!isOnline ? <Notice tone="warning" message={texts.common.offlineHint} /> : null}

      <View style={styles.form}>
        <TextField
          label={texts.signUp.fullNameLabel}
          placeholder={texts.signUp.fullNamePlaceholder}
          value={form.values.fullName}
          onChangeText={(value) => form.setValue('fullName', value)}
          onBlur={() => form.reveal('fullName')}
          error={form.errorFor('fullName')}
          textContentType="name"
          autoComplete="name"
          autoCapitalize="words"
          returnKeyType="next"
        />

        <TextField
          label={texts.signUp.emailLabel}
          placeholder={texts.signUp.emailPlaceholder}
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

        {/* Password before role, which is the order the canvas draws: the two
            credentials stay together and the affiliation comes after them. */}
        <TextField
          label={texts.signUp.passwordLabel}
          placeholder={texts.signUp.passwordPlaceholder}
          value={form.values.password}
          onChangeText={(value) => form.setValue('password', value)}
          onBlur={() => form.reveal('password')}
          error={form.errorFor('password')}
          // Stated under the field rather than hidden behind a tooltip: a
          // requirement nobody can see is a requirement nobody can meet.
          hint={texts.signUp.passwordRequirement}
          isPassword
          textContentType="newPassword"
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />

        {/* The canvas draws a select here and this is still a text field, on
            purpose. It never enumerates the options, and `users.institution` is
            free text in the database: turning it into a closed list decides
            what a guardian is allowed to answer, which is a product call and
            not a layout one. Raised as PD-06. */}
        <TextField
          label={texts.signUp.institutionLabel}
          placeholder={texts.signUp.institutionPlaceholder}
          value={form.values.institution}
          onChangeText={(value) => form.setValue('institution', value)}
          onBlur={() => form.reveal('institution')}
          error={form.errorFor('institution')}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <View style={styles.declarations}>
        {/* Not a form detail: the profile table constrains the column to true,
            so without this box checked no guardian profile can exist at all. */}
        <CheckboxField
          label={texts.signUp.adultLabel}
          isChecked={form.values.isAdultConfirmed}
          onChange={(checked) => {
            form.setValue('isAdultConfirmed', checked);
            form.reveal('isAdultConfirmed');
          }}
          error={form.errorFor('isAdultConfirmed')}
        />

        {/* The two links live inside the sentence, as the canvas draws them,
            so the consent reads as one statement instead of a checkbox with a
            button hanging off it. */}
        <CheckboxField
          label={texts.signUp.termsLabel}
          isChecked={form.values.termsAccepted}
          onChange={(checked) => {
            form.setValue('termsAccepted', checked);
            form.reveal('termsAccepted');
          }}
          links={[
            { text: texts.signUp.privacyPolicyLink, onPress: () => router.push('/legal') },
            { text: texts.signUp.termsOfUseLink, onPress: () => router.push('/legal') },
          ]}
          error={form.errorFor('termsAccepted')}
        />

        <AppText variant="caption" style={hasBothConsents ? undefined : styles.consentPending}>
          {texts.signUp.consentHelper}
        </AppText>
      </View>

      <View style={styles.actions}>
        {/* Blocked until both declarations are given. The legal age one is the
            condition the profile table itself enforces, so a form that let the
            request leave without it would only be failing later and worse. */}
        <Button
          label={texts.signUp.submit}
          loadingLabel={texts.signUp.submitting}
          onPress={() => void form.submit()}
          isLoading={signUp.isPending || form.isSubmitting}
          isDisabled={!hasBothConsents}
          accessibilityHint={hasBothConsents ? undefined : texts.signUp.consentHelper}
        />

        <Button
          label={texts.signUp.haveAccount}
          onPress={() => router.replace('/sign-in')}
          variant="secondary"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[4],
  },
  declarations: {
    gap: spacing[2],
  },
  consentPending: {
    color: colors.danger,
  },
  actions: {
    gap: spacing[2],
  },
});
