import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { colors, spacing } from '@/constants/theme';
import { AuthLinkProvider } from '@/features/auth/auth-link-provider';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { loadOnboardingState, useOnboardingState } from '@/features/onboarding/onboarding-store';
import { isEnvComplete, missingEnvVars } from '@/lib/env';
import { queryClient } from '@/lib/query-client';

// Held up until the session has been read out of the keystore, so the app
// never shows sign in for an instant to somebody who is already signed in.
void SplashScreen.preventAutoHideAsync();

void loadOnboardingState();

function RootNavigator() {
  const { session, isLoading, isRecoveringPassword } = useSession();
  const onboarding = useOnboardingState();

  const isReady = !isLoading && onboarding.isLoaded;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  const hasSession = session !== null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* The intro is only in the way of somebody who has never seen it and is
          not signed in; a returning guardian goes straight to the map. */}
      <Stack.Protected guard={!onboarding.hasCompleted && !hasSession}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      {/* Signed out area. It stays reachable during a password recovery, where
          a session exists but only so the password can be replaced. */}
      <Stack.Protected guard={!hasSession || isRecoveringPassword}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* The map is open to visitors without an account, so this group is not
          guarded. What needs a session is protected inside its tab layout. */}
      <Stack.Screen name="(app)" />
      <Stack.Screen name="auth" />
      <Stack.Screen
        name="legal"
        options={{ presentation: 'modal', headerShown: true, title: texts.legal.title }}
      />
    </Stack>
  );
}

/**
 * Shown instead of the app when the build has no Supabase credentials. A crash
 * on a red box would say the same thing to a developer and nothing at all to
 * anybody else.
 */
function MissingConfigurationScreen() {
  return (
    <View style={styles.configScreen}>
      <AppText variant="title">{texts.config.title}</AppText>
      <AppText variant="bodyMuted">{texts.config.body}</AppText>
      {missingEnvVars.map((name) => (
        <AppText key={name} variant="label" style={styles.configVar}>
          {name}
        </AppText>
      ))}
      <AppText variant="caption">{texts.config.hint}</AppText>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {isEnvComplete ? (
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <AuthLinkProvider>
              <RootNavigator />
            </AuthLinkProvider>
          </SessionProvider>
        </QueryClientProvider>
      ) : (
        <MissingConfigurationScreen />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  configScreen: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  configVar: {
    color: colors.warningText,
  },
});
