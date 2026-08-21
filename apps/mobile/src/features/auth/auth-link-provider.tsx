import { createContext, use, type ReactNode } from 'react';

import { useAuthDeepLinks } from '@/features/auth/use-auth-deep-links';

type AuthLinkState = ReturnType<typeof useAuthDeepLinks>;

const AuthLinkContext = createContext<AuthLinkState | null>(null);

/**
 * Runs the deep link handler once, at the root.
 *
 * It cannot live on the screen the link opens: a link that cold starts the app
 * has to be read before the router has decided anything, and on a warm start
 * the exchange has to happen whether or not that screen is mounted. The screen
 * only reports what this is doing.
 */
export function AuthLinkProvider({ children }: { children: ReactNode }) {
  const state = useAuthDeepLinks();
  return <AuthLinkContext value={state}>{children}</AuthLinkContext>;
}

export function useAuthLink(): AuthLinkState {
  const state = use(AuthLinkContext);
  if (state === null) {
    throw new Error('useAuthLink has to be called inside AuthLinkProvider');
  }
  return state;
}
