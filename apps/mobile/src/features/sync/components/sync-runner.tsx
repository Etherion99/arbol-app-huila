import { onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncQueue } from '@/features/sync/sync-queue';

/**
 * The one place the queue is wired to the running application.
 *
 * It draws nothing. It exists because the queue itself owns a timer but no
 * senses: it knows when to try again and nothing about whether the radio came
 * back or the guardian just unlocked the phone, which are the two moments worth
 * trying immediately.
 *
 * Mounted once, at the root, above the navigator. Not inside the signed in tab
 * layout, where the planting wizard and the growth log -- the two screens that
 * fill this queue -- are presented as modals over it and would not be covered.
 * A hook called from several screens would install several listeners and set
 * several drains racing over one file.
 *
 * There is no guard on the session here. The queue's own transport refuses to
 * spend an attempt without one, so a signed out phone costs nothing, and a
 * guardian who signs back in has their unsent work picked up by the next of
 * these three triggers rather than having to find it by hand.
 */
export function SyncRunner() {
  useEffect(() => {
    // Whatever survived the last run, as soon as there is anything to run it
    // with. `drain` is safe to call when there is nothing to do.
    void syncQueue.drain();

    // Connectivity, through the manager the query client already subscribes to
    // NetInfo. A second NetInfo listener would answer the same question twice
    // and could disagree with the one deciding whether queries may run.
    const unsubscribeOnline = onlineManager.subscribe((isOnline) => {
      if (isOnline) {
        void syncQueue.drain();
      }
    });

    // Coming back to the app. A phone in a pocket on the way down from a vereda
    // regains signal in a window that closes before anybody looks at it, and
    // the backoff timer may be several minutes from its next attempt when the
    // screen finally comes on.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncQueue.drain();
      }
    });

    return () => {
      unsubscribeOnline();
      subscription.remove();
    };
  }, []);

  return null;
}
