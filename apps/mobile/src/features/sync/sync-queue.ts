import { useSyncExternalStore } from 'react';

import { guardianTreesQueryKey } from '@/features/trees/use-guardian-trees';
import { treeDetailQueryKey } from '@/features/trees/use-tree-detail';
import { createSyncQueue } from '@/features/sync/sync-queue-engine';
import { jobsForTree } from '@/features/sync/sync-queue-model';
import { fileQueueStorage } from '@/features/sync/sync-queue-storage';
import { queueUserId, supabaseQueueTransport } from '@/features/sync/sync-queue-transport';
import { queryClient } from '@/lib/query-client';

/**
 * The queue the application actually uses: the engine, wired to this phone.
 *
 * One instance, at module scope, because there is one phone and one set of
 * unsent work. A queue created inside a provider would be a second queue every
 * time the tree remounted, and two drains racing over one file is how the same
 * photograph gets uploaded twice and the same tree planted twice.
 */

let idCounter = 0;

/**
 * An identifier that only has to be unique on one device.
 *
 * Not `crypto.randomUUID`, which is not on every Hermes build this app ships
 * to, and not a timestamp alone: two jobs saved in the same millisecond are
 * ordinary when a wizard finishes and the next one starts.
 */
function newJobId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const syncQueue = createSyncQueue({
  storage: fileQueueStorage,
  transport: supabaseQueueTransport,
  clock: {
    now: () => Date.now(),
    schedule: (delayMs, run) => {
      const handle = setTimeout(run, delayMs);
      return () => clearTimeout(handle);
    },
    random: () => Math.random(),
  },
  newId: newJobId,

  /**
   * A job that reached the bucket has just made several screens wrong: the
   * guardian's list is missing a tree or a cycle, the map is missing a marker,
   * the species catalogue is missing a name. The keys are invalidated rather
   * than patched, because the database decides more about these rows than the
   * phone sent -- the cycle number, the next reminder date, the tracking state
   * -- and writing a guess into the cache would put a wrong date on screen.
   */
  onCompleted: (job, target) => {
    const userId = queueUserId();

    void queryClient.invalidateQueries({ queryKey: guardianTreesQueryKey(userId) });
    void queryClient.invalidateQueries({ queryKey: treeDetailQueryKey(target.treeId) });
    void queryClient.invalidateQueries({ queryKey: ['tree-card', target.treeId] });
    void queryClient.invalidateQueries({ queryKey: ['trees-in-viewport'] });

    if (job.kind === 'planting') {
      void queryClient.invalidateQueries({ queryKey: ['species-catalogue'] });
      void queryClient.invalidateQueries({ queryKey: ['species-suggestions'] });
    }
  },
});

/**
 * Reads the queue off disk. Called once at start up, beside the planting draft,
 * so the connection strip knows on its first frame whether anything is waiting
 * rather than flickering from "sin conexión" into "sin conexión — 2 registros".
 */
export function loadSyncQueue(): void {
  syncQueue.load();
}

/**
 * The queue during render.
 *
 * `useSyncExternalStore` rather than state and an effect: the queue is external
 * state that outlives every screen looking at it and changes from a timer and a
 * connectivity listener, neither of which is inside React.
 */
export function useSyncQueueState() {
  return useSyncExternalStore(syncQueue.subscribe, syncQueue.getState, syncQueue.getState);
}

/** What one tree still owes the server, as its card in the list reads it. */
export type TreePendingSync = {
  hasPending: boolean;
  /** The newest cycle recorded on this phone, which the server has not seen. */
  latestQueuedCycle: number | null;
};

/**
 * Whether this tree has an entry still waiting on the phone.
 *
 * What draws the "PENDIENTE DE ENVIAR" mark on the tree's card. It reads the
 * queue rather than the server precisely because the server does not know: that
 * is the whole condition being reported.
 *
 * The cycle comes back with it because the card prints one. A tree whose cycle
 * 6 is queued still reads "ciclo 5" to `guardian_trees()`, and showing the
 * lower number next to a mark saying something is pending would leave the
 * guardian counting the difference themselves.
 */
export function useTreePendingSync(treeId: string): TreePendingSync {
  const queued = jobsForTree(useSyncQueueState().jobs, treeId);

  return {
    hasPending: queued.length > 0,
    latestQueuedCycle: queued.reduce<number | null>(
      (highest, job) => (job.kind === 'log_entry' ? Math.max(highest ?? 0, job.cycle) : highest),
      null,
    ),
  };
}

/**
 * The cycle a new entry for this tree should claim.
 *
 * The server's newest cycle is not enough on its own. A guardian who recorded
 * cycle 3 in a vereda on Saturday and opens the same tree on Sunday, still
 * without signal, would be offered cycle 3 again -- and the two would collide
 * on the unique index, on the object key, and on each other. What is already
 * waiting on the phone counts as much as what has landed.
 *
 * `latestCycle` is null while the tree has not been read, and the answer is
 * null with it: nothing may be saved against a cycle that was guessed.
 */
export function useNextCycleForTree(treeId: string, latestCycle: number | null): number | null {
  const queued = jobsForTree(useSyncQueueState().jobs, treeId);

  if (latestCycle === null) {
    return null;
  }

  return (
    queued.reduce(
      (highest, job) => (job.kind === 'log_entry' ? Math.max(highest, job.cycle) : highest),
      latestCycle,
    ) + 1
  );
}
