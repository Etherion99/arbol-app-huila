import { useMutation } from '@tanstack/react-query';
import type { Uuid } from '@arbolapp/core';

import type { PreparedPhoto } from '@/features/photos/photo-pipeline';
import { SETTLE_TIMEOUT_MS } from '@/features/sync/sync-queue-timing';
import type { SettledJob } from '@/features/sync/sync-queue-engine';
import { syncQueue } from '@/features/sync/sync-queue';

export type RegisterTreeInput = {
  speciesRawText: string;
  zoneId: Uuid;
  /** Only so the pending card can name the vereda without the zone catalogue. */
  villageName: string | null;
  location: { lat: number; lng: number };
  plantedAt: string;
  heightCm: number;
  visibleBranches: number;
  photo: PreparedPhoto;
  /**
   * Called the instant the job is on the queue and before anything is waited
   * on, so the wizard can throw away the draft at exactly the moment it stops
   * being the only copy.
   *
   * It matters that this is not "after the mutation resolves". The wait that
   * follows can last most of a minute, and a phone killed inside it would come
   * back with both a job in the queue and a draft offering to plant the same
   * tree again.
   */
  onQueued?: () => void;
};

/** The tree, once it exists. Null while the registration is still on the phone. */
export type PlantedTree = {
  treeId: Uuid;
  /**
   * Null on the one path that finds the rows without being told the code: a
   * registration recovered after the app was killed between the write and the
   * answer. The screen drops the line rather than inventing one.
   */
  code: string | null;
  cycle: number;
};

export type RegisterTreeResult = {
  /** `sent` means the server has it. Anything else means this phone still does. */
  outcome: SettledJob['outcome'];
  registration: PlantedTree | null;
};

/**
 * Planting a tree, which is now a thing the guardian hands to the queue rather
 * than a call the wizard makes.
 *
 * ## Why the wizard no longer talks to the server
 *
 * It used to write the rows, then upload the photograph, and report whichever
 * of the two failed. That works with signal and falls apart without it: a
 * guardian in a vereda would fill in four steps, take a photograph, press the
 * button and be told to try again later -- with no later that the app took part
 * in. Every write from this phone goes through the queue now, because a direct
 * write in a vereda is a write that is lost.
 *
 * ## What the wizard still gets to say
 *
 * The two facts a guardian actually wants are the tree's code and the date its
 * next photograph is due, and both of them come from the database. So this does
 * not enqueue and walk away: it enqueues and then waits a bounded moment for
 * that job in particular. With signal the job is usually through in a couple of
 * seconds and the screen shows the real answer, exactly as it did before.
 * Without signal the wait ends the instant the queue reports it cannot send --
 * not after a timeout -- and the screen says so instead of inventing a date.
 *
 * Nothing about the ordering, the retries or the duplicate handling lives here.
 * That is all the queue's, which is the point of there being one.
 */
export function useRegisterTree() {
  return useMutation({
    mutationFn: async (input: RegisterTreeInput): Promise<RegisterTreeResult> => {
      const job = syncQueue.enqueue({
        kind: 'planting',
        speciesRawText: input.speciesRawText,
        zoneId: input.zoneId,
        villageName: input.villageName,
        location: input.location,
        plantedAt: input.plantedAt,
        heightCm: input.heightCm,
        visibleBranches: input.visibleBranches,
        photo: input.photo,
      });

      input.onQueued?.();

      const settled = await syncQueue.settle(job.id, SETTLE_TIMEOUT_MS);

      return {
        outcome: settled.outcome,
        registration:
          settled.outcome === 'sent' && settled.target !== null
            ? {
                treeId: settled.target.treeId,
                code: settled.target.code,
                cycle: settled.target.cycle,
              }
            : null,
      };
    },

    // Nothing is invalidated here. The queue does it, once per job that
    // actually reached the bucket, which is the only moment the guardian's list
    // and the map became wrong -- and it happens whether or not this screen is
    // still mounted to see it.
  });
}
