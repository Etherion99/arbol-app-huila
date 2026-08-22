import { type ReactNode, useCallback, useRef, useState } from 'react';

import { LocationPermissionPrimer } from '@/features/map/components/location-permission-primer';
import type { UserFix, UserLocationState } from '@/features/map/use-user-location';

export type LocationPrimer = {
  /**
   * The same contract as `useUserLocation().request`, with the explanation put
   * in front of it. Screens swap one for the other and nothing else changes.
   */
  request: (precise?: boolean) => Promise<UserFix | null>;
  /** Rendered anywhere in the screen. It draws nothing until it is needed. */
  primer: ReactNode;
};

/**
 * Puts the reason in front of the system's location dialog.
 *
 * It wraps `useUserLocation` rather than living inside it because the hook is
 * also what reads a permission already granted, and that reading must never
 * prompt. Here the prompt is the whole point, so the two stay apart: the hook
 * keeps talking to the operating system, and this decides whether the guardian
 * has been told why before it does.
 *
 * The explanation is shown once, when the permission has never been asked for.
 * Once the system holds an answer it owns it — a second page in front of a
 * dialog that will not appear is a page in the way.
 */
export function useLocationPrimer(location: UserLocationState): LocationPrimer {
  const { permission, request: requestFix } = location;

  // Which request is waiting behind the page, and how precise a fix it asked
  // for. Null while nothing is waiting, which is also what hides the page.
  const [pendingPrecise, setPendingPrecise] = useState<boolean | null>(null);
  const resolveRef = useRef<((fix: UserFix | null) => void) | null>(null);

  const request = useCallback(
    (precise = false) => {
      if (permission !== 'unknown') {
        return requestFix(precise);
      }

      // The caller is left awaiting the same promise it always awaited; what
      // settles it is now a button on the page instead of the system dialog.
      return new Promise<UserFix | null>((resolve) => {
        resolveRef.current = resolve;
        setPendingPrecise(precise);
      });
    },
    [permission, requestFix],
  );

  const settle = useCallback(
    async (isAllowed: boolean) => {
      const precise = pendingPrecise ?? false;
      const resolve = resolveRef.current;

      resolveRef.current = null;
      // Closed before the system is asked, so the two are never stacked.
      setPendingPrecise(null);

      resolve?.(isAllowed ? await requestFix(precise) : null);
    },
    [pendingPrecise, requestFix],
  );

  return {
    request,
    primer: (
      <LocationPermissionPrimer
        isVisible={pendingPrecise !== null}
        onAllow={() => void settle(true)}
        onDecline={() => void settle(false)}
      />
    ),
  };
}
