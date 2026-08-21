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
        <AppText variant="display">{texts.resetPassword.linkExpiredTitle}</AppText>
        <Notice tone="error" message={error.message} />
        <Button label={texts.signIn.title} onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  if (!isExchanging) {
    // Nothing to exchange: the route was reached some other way.
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen isScrollable={false} hasConnectionBanner={false}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="body">{texts.verifyEmail.confirming}</AppText>
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
});
