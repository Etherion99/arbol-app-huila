import { EMAIL_RESEND_COOLDOWN_SECONDS } from '@arbolapp/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { texts } from '@/constants/texts';
import { colors, fontFace, spacing } from '@/constants/theme';
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
      {/* The canvas centres this screen in the viewport rather than stacking it
          from the top: there is no form to fill and nothing below the fold, so
          the message sits where the eye already is.

          It also opens with an 88 point disc holding an envelope, and that disc
          is missing here. The icon kit has no envelope — it is one of the glyphs
          open as PD-08 in `PLAN-FIDELIDAD-UI.md` — and a disc whose only content
          is a stand-in character reads as a finished piece of the design system,
          which is how a placeholder stops being questioned. It goes in with the
          glyph. */}
      <View style={styles.centred}>
        <AppText variant="display" style={styles.centredText}>
          {texts.verifyEmail.title}
        </AppText>

        <AppText variant="bodyMuted" style={styles.centredText}>
          {texts.verifyEmail.bodyBeforeEmail}
          {/* The address is the only part of the sentence the guardian has to
              compare against their inbox, so it takes the darker ink and the
              weight above the running text. #1A1A1A on the page is 16.74:1. */}
          <AppText style={styles.email}>{email ?? ''}</AppText>
          {texts.verifyEmail.bodyAfterEmail}
        </AppText>

        <AppText variant="caption" style={styles.centredText}>
          {texts.verifyEmail.checkSpam}
        </AppText>

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
          {/* The primary action is confirming, not resending. What the guardian
            came back to do is tell the app they already opened the link; asking
            for another message is the fallback, and the canvas ranks them that
            way round. */}
          <Button
            label={texts.verifyEmail.alreadyConfirmed}
            loadingLabel={texts.verifyEmail.confirming}
            onPress={() => void recheckConfirmation()}
            isLoading={isRechecking}
          />

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
            accessibilityHint={
              canResend ? undefined : texts.verifyEmail.resendCountdown(secondsLeft)
            }
            variant="ghost"
          />

          <Button
            label={texts.verifyEmail.useAnotherEmail}
            onPress={() => router.replace('/sign-up')}
            variant="ghost"
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[4],
  },
  centredText: {
    textAlign: 'center',
  },
  /**
   * Only the face changes; size and colour come from the sentence this is
   * nested in, so the address never grows out of its own paragraph.
   */
  email: {
    fontFamily: fontFace.bodyMedium,
    color: colors.textPrimary,
  },
  actions: {
    // The canvas puts extra air above the button on top of the column gap, so
    // the action reads as separate from the sentence explaining it.
    marginTop: spacing[4],
    // Tighter than the canvas draws it, because these are three stacked
    // controls of 48 points and not three lines of text: the canvas gap would
    // push «Cambiar de correo» off a small screen.
    gap: spacing[2],
  },
});
