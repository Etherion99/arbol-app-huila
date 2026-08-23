import { useMutation } from '@tanstack/react-query';
import type { HealthStatus, Uuid } from '@arbolapp/core';

import type { PreparedPhoto } from '@/features/photos/photo-pipeline';
import type { SettledJob } from '@/features/sync/sync-queue-engine';
import { syncQueue } from '@/features/sync/sync-queue';
import { SETTLE_TIMEOUT_MS } from '@/features/sync/sync-queue-timing';

export type AddLogEntryInput = {
  treeId: Uuid;
  /** How the tree is named on the pending card, captured while it is known. */
  treeLabel: string;
  /**
   * The cycle this entry claims. Sent explicitly rather than left to the
   * trigger because the object key is derived from it, and the photograph has
   * to be uploaded to a path that is known before the row comes back.
   *
   * The unique index on `(tree_id, cycle)` is what makes that safe: two
   * attempts at the same cycle cannot both land, and the queue reads the
   * collision as a receipt rather than as an error.
   */
  cycle: number;
  heightCm: number | null;
  visibleBranches: number | null;
  healthStatus: HealthStatus;
  notes: string | null;
  photo: PreparedPhoto;
};

export type AddLogEntryResult = {
  /** `sent` means the server has it. Anything else means this phone still does. */
  outcome: SettledJob['outcome'];
  cycle: number;
};

/**
 * Adding a cycle to a growth log, by way of the queue.
 *
 * The reason it goes through the queue is sharper here than for a planting. A
 * growth log entry exists because somebody walked to a particular tree on a
 * particular day and photographed it, and that walk is not repeatable: the
 * photograph is of a tree as it was that morning. A write that fails in a
 * vereda and is not kept is a visit erased.
 *
 * Everything the entry causes downstream is the database's, and none of it is
 * repeated on the phone: a trigger moves `trees.last_updated_at` to the capture
 * time, recomputes the cycle number, resolves the open reminders and propagates
 * a death to `trees.status`; `next_reminder_at` is a generated column and
 * `on_time` is derived from `captured_at`. That last one is why nothing here
 * guesses at punctuality — an entry can sit in this queue for a week, and the
 * date that decides whether it was on time is the one on the photograph.
 */
export function useAddLogEntry() {
  return useMutation({
    mutationFn: async (input: AddLogEntryInput): Promise<AddLogEntryResult> => {
      const job = syncQueue.enqueue({
        kind: 'log_entry',
        treeId: input.treeId,
        treeLabel: input.treeLabel,
        cycle: input.cycle,
        heightCm: input.heightCm,
        visibleBranches: input.visibleBranches,
        healthStatus: input.healthStatus,
        notes: input.notes,
        photo: input.photo,
      });

      const settled = await syncQueue.settle(job.id, SETTLE_TIMEOUT_MS);

      return { outcome: settled.outcome, cycle: input.cycle };
    },
  });
}
