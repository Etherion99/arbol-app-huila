import { isBlocked } from '@/features/sync/sync-queue-model';
import { useSyncQueueState } from '@/features/sync/sync-queue';

/**
 * How many records the guardian has saved on the phone that have not reached
 * the server yet, and how many of those have stopped trying.
 *
 * The two numbers are kept apart because they lead to different sentences. Work
 * that is waiting for signal needs no action and the strip says so; work that
 * has stopped needs the guardian to look at it, and telling them it will go up
 * "when the signal comes back" would be a promise nothing intends to keep.
 *
 * It stays a hook, and every screen that shows the strip subscribes to it: the
 * queue changes from a timer and from a connectivity listener while a screen is
 * mounted, so the count has to be something a screen can watch rather than
 * something it reads once.
 */
export type PendingSyncCount = {
  /** Everything still owed to the server, blocked entries included. */
  total: number;
  /** The subset that will not move again without the guardian. */
  blocked: number;
};

export function usePendingSyncCount(): PendingSyncCount {
  const { jobs } = useSyncQueueState();

  return {
    total: jobs.length,
    blocked: jobs.filter(isBlocked).length,
  };
}
