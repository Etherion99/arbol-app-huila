import { EMAIL_RESEND_COOLDOWN_SECONDS } from '@arbolapp/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { texts } from '@/constants/texts';
import { spacing } from '@/constants/theme';
import { describeMaybeAuthError } from '@/features/auth/auth-messages';
import { useResendConfirmationEmail } from '@/features/auth/use-auth-mutations';
import { supabase } from '@/lib/supabase/client';
import { useSecondsRemaining } from '@/hooks/use-countdown';
import { useIsOnline } from '@/hooks/use-is-online';

/**
 * Where a guardian waits between signing up and tapping the link in their
 * inbox.
 *
 * Confirming normally happens through the deep link, which brings the app back
 * with a session and moves them on by itself. The check on resume is for the
 * guardian who confirmed somewhere else -- another phone, a desktop -- and
 * comes back here expecting something to have happened.
 */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const resend = useResendConfirmationEmail();

  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    () => Date.now() + EMAIL_RESEND_COOLDOWN_SECONDS * 1_000,
  );
  const secondsLeft = useSecondsRemaining(resendAvailableAt);
  const [isRechecking, setIsRechecking] = useState(false);
  const [isStillUnverified, setIsStillUnverified] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Any session that appeared while the app was away is picked up by the
        // listener in the session provider, which is what moves the guardian
        // out of this screen.
        void supabase.auth.getSession();
      }
    });

    return () => subscription.remove();
  }, []);

  const failure = describeMaybeAuthError(resend.error);
  const canResend = secondsLeft === 0 && !resend.isPending;

  /**
   * Until the address is confirmed there is no session to read, so this asks
   * Supabase again and reports the answer. When the guardian confirmed on this
   * phone the deep link has already moved them on; this is for the one who
   * confirmed somewhere else and came back to a screen that looked stuck.
   */
  async function recheckConfirmation() {
    setIsRechecking(true);
    try {
      const { data } = await supabase.auth.getSession();
      // A session that appeared is picked up by the session provider, which is
      // what takes this screen off the stack.
      setIsStillUnverified(data.session === null);
    } finally {
      setIsRechecking(false);
    }
  }

  function requestAnotherEmail() {
    if (email === undefined) {
      return;
    }

    resend.mutate(email, {
      onSuccess: () => setResendAvailableAt(Date.now() + EMAIL_RESEND_COOLDOWN_SECONDS * 1_000),
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display">{texts.verifyEmail.title}</AppText>
        <AppText variant="bodyMuted">{texts.verifyEmail.body(email ?? '')}</AppText>
        <AppText variant="caption">{texts.verifyEmail.checkSpam}</AppText>
      </View>

      {failure !== null ? (
        <Notice
          tone={failure.kind === 'emailRateLimited' ? 'warning' : 'error'}
          message={failure.message}
          onRetry={failure.isRetryable ? requestAnotherEmail : undefined}
        />
      ) : null}

      {resend.isSuccess && failure === null ? (
        <Notice tone="success" message={texts.verifyEmail.resendSent} />
      ) : null}

      {isStillUnverified ? (
        <Notice tone="warning" message={texts.verifyEmail.stillUnverified} />
      ) : null}

      {!isOnline ? <Notice tone="warning" message={texts.common.offlineHint} /> : null}

      <View style={styles.actions}>
        {/* The counter is not decoration: the bundled email service allows few
            messages an hour, and a guardian tapping resend four times burns the
            quota of the whole group registering that afternoon. */}
        <Button
          label={
            canResend ? texts.verifyEmail.resend : texts.verifyEmail.resendCountdown(secondsLeft)
          }
          loadingLabel={texts.verifyEmail.resending}
          onPress={requestAnotherEmail}
          isLoading={resend.isPending}
          isDisabled={!canResend || email === undefined}
          accessibilityLabel={texts.verifyEmail.resend}
          accessibilityHint={canResend ? undefined : texts.verifyEmail.resendCountdown(secondsLeft)}
        />

        <Button
          label={texts.verifyEmail.alreadyConfirmed}
          loadingLabel={texts.verifyEmail.confirming}
          onPress={() => void recheckConfirmation()}
          isLoading={isRechecking}
          variant="secondary"
        />

        <Button
          label={texts.signIn.submit}
          onPress={() => router.replace('/sign-in')}
          variant="ghost"
        />

        <Button
          label={texts.verifyEmail.useAnotherEmail}
          onPress={() => router.replace('/sign-up')}
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing[1],
  },
  actions: {
    gap: spacing[2],
  },
});
