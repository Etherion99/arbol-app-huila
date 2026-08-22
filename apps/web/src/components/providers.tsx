'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { getQueryClient } from '@/lib/query-client';

/**
 * Everything the panel needs in the React tree that cannot live on the server.
 *
 * Mounted once in the root layout so a client screen anywhere below can use a
 * data hook without each one wiring its own provider.
 */
export function Providers({ children }: { children: ReactNode }) {
  // Not `useState`: `getQueryClient` already returns the one browser client,
  // and calling it during render is what keeps a suspended render from
  // throwing the cache away.
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
