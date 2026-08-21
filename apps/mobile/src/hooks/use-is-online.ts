import NetInfo from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';

/**
 * Connectivity as a snapshot the screens can read during render. NetInfo is an
 * external system, so it is subscribed to through useSyncExternalStore instead
 * of mirrored into state with an effect, which would re-render in cascade.
 *
 * `null` means NetInfo has not answered yet. Screens treat that as online: a
 * warning shown before the first reading would flash on every cold start.
 */
let snapshot: boolean | null = null;

function subscribe(onChange: () => void) {
  return NetInfo.addEventListener((state) => {
    // `isInternetReachable` stays null until the reachability probe answers.
    // Falling back to `isConnected` keeps the banner from lying during the
    // first seconds on a slow rural connection.
    const next = state.isInternetReachable ?? state.isConnected;
    if (next !== snapshot) {
      snapshot = next;
      onChange();
    }
  });
}

export function useIsOnline(): boolean {
  const value = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => null,
  );
  return value !== false;
}
