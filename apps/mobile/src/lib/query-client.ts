import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

/**
 * TanStack Query is the only owner of server state in the app. Nothing here
 * re-implements caching or synchronisation by hand.
 */

/**
 * Query has no idea what a phone radio is until it is told. Wiring it to
 * NetInfo is what makes a mutation wait for signal instead of failing against
 * an interface that is plainly down, which in the villages is most of the day.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isInternetReachable ?? state.isConnected ?? false);
  }),
);

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The profile changes when its owner edits it, which is rare, but a
      // stale name on screen after an edit is worse than a refetch.
      staleTime: 30_000,
      // Three tries with backoff covers the signal dropping for a few seconds
      // on a bus between veredas. Past that the screen shows the failure and
      // offers the retry, rather than spinning forever.
      retry: 3,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    },
    mutations: {
      // A sign up or a password change is not safe to replay on its own: the
      // second attempt is the guardian's decision, taken from the error the
      // screen shows.
      retry: 0,
    },
  },
});
