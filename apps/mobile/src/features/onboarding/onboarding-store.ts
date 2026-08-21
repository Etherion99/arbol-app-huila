import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

/**
 * Whether the three intro screens have already been seen on this device.
 *
 * A tiny store outside React rather than a context: the value is read while the
 * navigation guards decide where to send the guardian, which happens before
 * any screen of the app has mounted. It is subscribed to with
 * useSyncExternalStore so a render reads it directly instead of copying it
 * into state through an effect.
 *
 * It rides in SecureStore because that is the only key value storage the app
 * carries. The flag is not a secret; keeping one storage instead of two is
 * worth more than the encryption it does not need.
 */

const STORAGE_KEY = 'arbolapp.onboarding.completed';

type OnboardingState = {
  /** False until the stored value has been read, so nothing decides too early. */
  isLoaded: boolean;
  hasCompleted: boolean;
};

let state: OnboardingState = { isLoaded: false, hasCompleted: false };
const listeners = new Set<() => void>();

function emit(next: OnboardingState) {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let loading: Promise<void> | null = null;

/** Started once by the root layout, alongside the session restore. */
export function loadOnboardingState(): Promise<void> {
  loading ??= SecureStore.getItemAsync(STORAGE_KEY)
    .then((value) => {
      emit({ isLoaded: true, hasCompleted: value === 'true' });
    })
    .catch(() => {
      // A keystore that cannot be read is not a reason to hold the app shut.
      // Showing the intro again is the harmless side of being wrong.
      emit({ isLoaded: true, hasCompleted: false });
    });

  return loading;
}

/** Called when the guardian finishes the intro, skips it, or goes exploring. */
export async function completeOnboarding(): Promise<void> {
  emit({ isLoaded: true, hasCompleted: true });
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, 'true');
  } catch {
    // Worst case the intro shows again on the next cold start. Not worth an
    // error in front of somebody who just asked to move on.
  }
}

export function useOnboardingState(): OnboardingState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
