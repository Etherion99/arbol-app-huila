import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { texts } from '@/constants/texts';
import { colors, spacing } from '@/constants/theme';
import { useAuthLink } from '@/features/auth/auth-link-provider';
import { useSession } from '@/features/auth/session-provider';

/** Where the link in the confirmation email lands. */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { isExchanging, error } = useAuthLink();
  const { session, isRecoveringPassword } = useSession();

  if (session !== null && !isRecoveringPassword) {
    return <Redirect href="/map" />;
  }

  if (error !== null) {
    return (
      <Screen>
        {/* Centred, and titled at the same size as the same dead end in the
            recovery flow: the canvas draws both as one screen, and a guardian
            who reaches this from either email should not be able to tell which
            one they came from.

            The canvas also opens it with an 88 point disc holding a struck-out
            envelope, which the icon kit does not carry — one of the glyphs open
            as PD-08 in `PLAN-FIDELIDAD-UI.md`. The notice underneath already
            carries a mark, so the state is never colour alone; the disc goes in
            once the glyph exists. */}
        <View style={styles.centred}>
          <AppText variant="title" style={styles.centredText}>
            {texts.resetPassword.linkExpiredTitle}
          </AppText>
          <Notice tone="error" message={error.message} />
          <Button
            label={texts.signIn.title}
            onPress={() => router.replace('/sign-in')}
            style={styles.action}
          />
        </View>
      </Screen>
    );
  }

  if (!isExchanging) {
    // Nothing to exchange: the route was reached some other way.
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen isScrollable={false} hasConnectionBanner={false}>
      <View style={styles.spinner}>
        {/* Verde Huilense as a drawing rather than as text: `accent` is 4.12:1
            on the page, which clears the 3:1 a graphic owes and not the 4.5:1 a
            sentence would. */}
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="bodyMuted">{texts.verifyEmail.confirming}</AppText>
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
   * Centred down the page but stretched across it, so the notice and the button
   * still span the column the way the canvas draws them.
   */
  centred: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[4],
  },
  centredText: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing[2],
  },
});
