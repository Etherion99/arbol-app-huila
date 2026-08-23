// One import per face, by subpath. The package index re-exports every weight
// it ships, so importing from the root would bundle around thirty typefaces
// into the app to render six.
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { OpenSans_600SemiBold } from '@expo-google-fonts/open-sans/600SemiBold';
import { Roboto_400Regular } from '@expo-google-fonts/roboto/400Regular';
import { Roboto_500Medium } from '@expo-google-fonts/roboto/500Medium';
import { RobotoMono_500Medium } from '@expo-google-fonts/roboto-mono/500Medium';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
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
import { SessionExpiredDialog } from '@/features/auth/components/session-expired-dialog';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { loadOnboardingState, useOnboardingState } from '@/features/onboarding/onboarding-store';
import { loadPlantingDraft } from '@/features/planting/planting-draft';
import { isEnvComplete, missingEnvVars } from '@/lib/env';
import { queryClient } from '@/lib/query-client';

// Held up until the session has been read out of the keystore, so the app
// never shows sign in for an instant to somebody who is already signed in.
void SplashScreen.preventAutoHideAsync();

void loadOnboardingState();

// Read once, at start up, so the wizard knows on its first frame whether there
// is a half filled form to offer back rather than flickering into the question.
loadPlantingDraft();

/**
 * Every face the type scale names, keyed by the family name a style asks for.
 *
 * The list mirrors `fontFace` in the theme exactly. If the two drift, a style
 * asks for a face nobody registered and the text quietly falls back to the
 * system font, which is the kind of failure that ships unnoticed.
 */
const appFonts = {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  OpenSans_600SemiBold,
  Roboto_400Regular,
  Roboto_500Medium,
  RobotoMono_500Medium,
};

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
    <>
      {/* Beside the navigator rather than in a route: a session can run out on
          any screen, and the overlay has to reach the guardian on the one they
          are standing on. */}
      <SessionExpiredDialog />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surfacePage },
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
        {/* Three tasks rather than three places, so they cover the tab bar
          instead of living inside it. Planting and the growth log need a
          session: without one there is no guardian to own a tree. */}
        <Stack.Protected guard={hasSession}>
          <Stack.Screen name="plant" options={{ presentation: 'modal' }} />
          <Stack.Screen name="log/[treeId]" options={{ presentation: 'modal' }} />

          {/* Settings belong to an account, so they sit behind the same guard.
            A modal rather than a tab: it is opened from a row of the profile
            and closed again, not a fifth place to navigate to. */}
          <Stack.Screen name="settings/notifications" options={{ presentation: 'modal' }} />
        </Stack.Protected>

        {/* The detail is readable without an account, exactly like the map. */}
        <Stack.Screen name="tree/[id]" />

        {/* The bar is the design system's, drawn inside the screen, so the modal
          keeps the app's typography instead of the platform's. */}
        <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
      </Stack>
    </>
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
        <AppText key={name} variant="data" style={styles.configVar}>
          {name}
        </AppText>
      ))}
      <AppText variant="caption">{texts.config.hint}</AppText>
    </View>
  );
}

export default function RootLayout() {
  const [areFontsLoaded, fontError] = useFonts(appFonts);

  // The splash stays up until the type is ready. Swapping the font after the
  // first frame reflows every screen, and on a mid range Android that reflow
  // is visible. A load failure is a packaging bug rather than a field one, so
  // it falls through to the system font instead of holding the app hostage.
  if (!areFontsLoaded && fontError === null) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {/* Dark glyphs, not a dark bar: `style` names the content colour, and the
          2026 scheme puts the bar on leaf white. */}
      <StatusBar style="dark" />
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
    gap: spacing[2],
    padding: spacing[6],
    backgroundColor: colors.surfacePage,
  },
  /**
   * `danger` at 4.54:1 on the page, and the mono face because these are
   * variable names. It used to be `warning` `#FFD700`, which measures 1.35:1
   * there -- the list of what is missing was the one line on the screen that
   * could not be read.
   */
  configVar: {
    color: colors.danger,
  },
});
