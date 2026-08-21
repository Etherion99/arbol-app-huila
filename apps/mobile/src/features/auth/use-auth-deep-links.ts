import { PASSWORD_RESET_URL } from '@arbolapp/core';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';

import {
  describeAuthError,
  describeAuthErrorCode,
  type AuthErrorReport,
} from '@/features/auth/auth-messages';
import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase/client';

/**
 * Handles the two links that come back from an email: the one that confirms an
 * address and the one that opens a password change.
 *
 * Both arrive on the `arbolapp://` scheme, and both can carry either a PKCE
 * code -- what the client asks for -- or the tokens themselves in the fragment,
 * which is what an older project configuration produces. Reading both means a
 * guardian is never stranded on a link that technically worked.
 */

type LinkOutcome = 'recovery' | 'confirmation';

function readLinkParams(url: string): { query: URLSearchParams; fragment: URLSearchParams } | null {
  try {
    const parsed = new URL(url);
    return {
      query: parsed.searchParams,
      // `hash` keeps its leading '#'. The tokens of the implicit flow travel
      // there precisely so they never reach a server log.
      fragment: new URLSearchParams(parsed.hash.replace(/^#/, '')),
    };
  } catch {
    return null;
  }
}

function isRecoveryLink(url: string, params: URLSearchParams): boolean {
  return url.startsWith(PASSWORD_RESET_URL) || params.get('type') === 'recovery';
}

export function useAuthDeepLinks() {
  const { startPasswordRecovery } = useSession();
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<AuthErrorReport | null>(null);
  const [lastOutcome, setLastOutcome] = useState<LinkOutcome | null>(null);

  const dismissError = useCallback(() => setError(null), []);

  useEffect(() => {
    let isMounted = true;

    async function handle(url: string) {
      const params = readLinkParams(url);
      if (params === null) {
        return;
      }

      const { query, fragment } = params;
      const code = query.get('code');
      const accessToken = fragment.get('access_token');
      const refreshToken = fragment.get('refresh_token');

      // Auth reports a dead link by redirecting with the reason attached
      // rather than by failing the request, so the app has to read it here or
      // the guardian would land on a screen that simply does nothing.
      const errorCode = query.get('error_code') ?? fragment.get('error_code');
      if (errorCode !== null) {
        if (isMounted) {
          setError(describeAuthErrorCode(errorCode));
        }
        return;
      }

      if (code === null && (accessToken === null || refreshToken === null)) {
        return;
      }

      const recovery = isRecoveryLink(url, fragment) || isRecoveryLink(url, query);
      // Flipped before the exchange, not after: the exchange creates a session
      // and the navigation guard reacts to it in the same tick, which without
      // this would drop the guardian into the app instead of onto the screen
      // that asks for the new password.
      if (recovery) {
        startPasswordRecovery();
      }

      if (isMounted) {
        setIsExchanging(true);
        setError(null);
      }

      try {
        const { error: exchangeError } =
          code !== null
            ? await supabase.auth.exchangeCodeForSession(code)
            : await supabase.auth.setSession({
                access_token: accessToken as string,
                refresh_token: refreshToken as string,
              });

        if (exchangeError) {
          throw exchangeError;
        }

        if (isMounted) {
          setLastOutcome(recovery ? 'recovery' : 'confirmation');
        }
      } catch (caught) {
        if (isMounted) {
          setError(describeAuthError(caught));
        }
      } finally {
        if (isMounted) {
          setIsExchanging(false);
        }
      }
    }

    // The link that cold started the app, which never reaches the listener.
    void Linking.getInitialURL().then((url) => {
      if (url !== null) {
        void handle(url);
      }
    });

    const subscription = Linking.addEventListener('url', (event) => void handle(event.url));

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [startPasswordRecovery]);

  return { isExchanging, error, dismissError, lastOutcome };
}
