import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase/client';

/**
 * Why the session is not a TanStack query: it is not fetched, it is pushed.
 * Supabase owns it, restores it from the keystore on start and emits every
 * change through one subscription, so mirroring it into the query cache would
 * add a second source of truth that can disagree with the first.
 *
 * Everything derived from the session -- the profile above all -- is a query,
 * and this provider is what invalidates it when the account changes.
 */

type SessionState = {
  session: Session | null;
  /** True until Supabase has answered whether a stored session exists. */
  isLoading: boolean;
  /**
   * Set when the session went away without the guardian asking, which is what
   * an expired or revoked refresh token looks like. The sign in screen says so
   * instead of leaving them wondering why they were thrown out.
   */
  didSessionExpire: boolean;
  /**
   * True between opening a recovery link and saving the new password. During
   * that window there is a session, but it exists only to change the password,
   * so the guardian must not be dropped into the app yet.
   */
  isRecoveringPassword: boolean;
  startPasswordRecovery: () => void;
  endPasswordRecovery: () => void;
  acknowledgeExpiry: () => void;
};

const SessionContext = createContext<SessionState | null>(null);

/**
 * Set by `useSignOut` just before it calls Supabase, so the listener below can
 * tell a sign out the guardian asked for from one the server imposed. It lives
 * outside React because the listener that reads it is not a component.
 */
let signOutWasRequested = false;

export function markSignOutRequested() {
  signOutWasRequested = true;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [didSessionExpire, setDidSessionExpire] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    // Reads the session out of the keystore. Until this resolves the splash
    // stays up, so the app never shows sign in to somebody who is signed in.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);

      if (event === 'SIGNED_OUT') {
        // A sign out nobody asked for means the refresh token was rejected.
        setDidSessionExpire(!signOutWasRequested);
        signOutWasRequested = false;
        setIsRecoveringPassword(false);
        // The profile of the account that just left must not be readable by
        // whoever signs in next on the same phone.
        queryClient.clear();
      }

      if (event === 'SIGNED_IN') {
        setDidSessionExpire(false);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }

      if (event === 'USER_UPDATED') {
        void queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<SessionState>(
    () => ({
      session,
      isLoading,
      didSessionExpire,
      isRecoveringPassword,
      startPasswordRecovery: () => setIsRecoveringPassword(true),
      endPasswordRecovery: () => setIsRecoveringPassword(false),
      acknowledgeExpiry: () => setDidSessionExpire(false),
    }),
    [session, isLoading, didSessionExpire, isRecoveringPassword],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionState {
  const state = use(SessionContext);
  if (state === null) {
    throw new Error('useSession has to be called inside SessionProvider');
  }
  return state;
}
