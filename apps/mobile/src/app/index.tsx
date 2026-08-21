import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/session-provider';
import { useOnboardingState } from '@/features/onboarding/onboarding-store';

/**
 * The entry point resolves where to go and renders nothing of its own. By the
 * time it runs the session and the intro flag are already known -- the root
 * layout holds the splash until they are -- so there is no frame in between
 * where the wrong screen could show.
 */
export default function EntryRoute() {
  const { session } = useSession();
  const onboarding = useOnboardingState();

  if (!onboarding.hasCompleted && session === null) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/map" />;
}
