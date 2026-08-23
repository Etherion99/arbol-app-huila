import * as Notifications from 'expo-notifications';
import { useSyncExternalStore } from 'react';

/**
 * The tree a tapped notification is asking for, held until somebody can act on
 * it.
 *
 * ## Why it is a store and not a route parameter
 *
 * The tap and the navigation almost never happen in the same moment. Three
 * cases, and only the first is simple:
 *
 * - The app is open. The listener fires, the router is mounted, it navigates.
 * - The app was closed. The tap starts the app, and the response is waiting in
 *   `getLastNotificationResponseAsync()` long before there is a navigator to
 *   receive it, let alone a session read out of the keystore.
 * - The session ran out. There is a tap, a tree, and nobody signed in. The
 *   guardian has to enter first, and the tree has to still be there when they
 *   do -- otherwise the notification they answered simply drops them on the map
 *   with no explanation.
 *
 * A module level store outlives all three. It is set the moment the tap is
 * known and consumed the moment a signed in navigator exists, however far apart
 * those are.
 */

export type NotificationTarget = {
  treeId: string;
  /** The cycle the notification was asking for, which is what marks it opened. */
  cycle: number | null;
};

let target: NotificationTarget | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = (): NotificationTarget | null => target;

export function setNotificationTarget(next: NotificationTarget | null): void {
  if (target?.treeId === next?.treeId && target?.cycle === next?.cycle) {
    return;
  }
  target = next;
  emit();
}

/** Consumed exactly once: a target acted on must not be acted on again. */
export function takeNotificationTarget(): NotificationTarget | null {
  const taken = target;
  if (taken !== null) {
    setNotificationTarget(null);
  }
  return taken;
}

export function useNotificationTarget(): NotificationTarget | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Reads the tree out of a notification's payload.
 *
 * The payload is whatever arrived over the wire, so nothing in it is trusted:
 * a missing or misshapen `treeId` yields null and the tap opens the app
 * normally, which is what an unrecognised notification should do.
 *
 * The Edge Function also puts a `url` in the payload for the platform's own
 * link handling. It is deliberately not parsed here -- one reader, one shape.
 */
export function readNotificationTarget(
  response: Notifications.NotificationResponse | null,
): NotificationTarget | null {
  const data: unknown = response?.notification.request.content.data;

  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const treeId = (data as Record<string, unknown>).treeId;
  if (typeof treeId !== 'string' || treeId === '') {
    return null;
  }

  const cycle = (data as Record<string, unknown>).cycle;
  return {
    treeId,
    cycle: typeof cycle === 'number' && Number.isInteger(cycle) ? cycle : null,
  };
}
