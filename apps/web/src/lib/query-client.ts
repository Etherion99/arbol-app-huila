import { QueryClient, isServer } from '@tanstack/react-query';

/**
 * TanStack Query is the only owner of client-side server state in the panel.
 * Nothing re-implements caching or synchronisation by hand.
 *
 * The panel reads most of its data on the server, where a Server Component can
 * simply await the query. Query earns its place on the screens that keep
 * asking after the first paint: the users table filtering as somebody types,
 * the moderation queue refreshing after an archive, the species list redrawing
 * after a merge.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that a click-through and back does not refetch, short
        // enough that a figure the coordinator just changed does not linger.
        staleTime: 30_000,
        // The panel runs on a school connection, not a village radio, so the
        // budget is smaller than the mobile app's. It is still not zero: the
        // uplink at the institution drops often enough to matter.
        retry: 2,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
      },
      mutations: {
        // Archiving a tree or merging species is not safe to replay on its
        // own. The second attempt is the coordinator's decision, taken from
        // the error the screen shows them.
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * One client per browser tab, and a fresh one per request on the server.
 *
 * A module level singleton would be shared by every request the Node process
 * handles, which on the server means one coordinator's cached rows served to
 * whoever asks next.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
