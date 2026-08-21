import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  growthLogPhotoPath,
  growthLogThumbnailPath,
  type TreeRegistration,
  type Uuid,
} from '@arbolapp/core';

import { useSession } from '@/features/auth/session-provider';
import { uploadGrowthLogPhoto } from '@/features/photos/growth-log-storage';
import { discardPreparedPhoto, type PreparedPhoto } from '@/features/photos/photo-pipeline';
import { guardianTreesQueryKey } from '@/features/trees/use-guardian-trees';
import { supabase } from '@/lib/supabase/client';

export type RegisterTreeInput = {
  speciesRawText: string;
  zoneId: Uuid;
  location: { lat: number; lng: number };
  plantedAt: string;
  heightCm: number;
  visibleBranches: number;
  photo: PreparedPhoto;
  /**
   * Set when a previous attempt already created the rows and only the upload
   * failed. The registration is not repeated; the photograph is sent again to
   * the same deterministic key.
   */
  existing?: { treeId: Uuid; code: string; cycle: number } | null;
};

/**
 * What came back, and whether the photograph made it.
 *
 * The two are reported separately on purpose. A registration whose upload failed
 * is a success with an outstanding errand, not a failure -- the tree exists, its
 * cycle 1 entry exists, and it is on the map. Collapsing the two would either
 * hide a missing photograph or tell a guardian their tree was not registered
 * when it was.
 */
export type RegisterTreeResult = {
  registration: TreeRegistration;
  isPhotoUploaded: boolean;
  uploadError: unknown;
};

type RegistrationRow = {
  tree_id: string;
  code: string;
  cycle: number;
  photo_path: string;
  thumbnail_path: string;
};

/**
 * Planting a tree: the row first, then its photograph.
 *
 * **The atomicity, and why it is this way round.** A tree and its cycle 1 entry
 * have to appear together or not at all -- the planting record is not separate
 * from the growth log, it *is* cycle 1 -- and two round trips from a phone on a
 * rural connection cannot promise that. So both rows are written by one call to
 * `register_tree()`, inside one transaction. Either both exist or neither does.
 *
 * The photograph cannot be part of that transaction, because it does not live in
 * the database. And it cannot go first either: the storage policies decide
 * ownership by reading a tree id out of the object name, so there is nothing to
 * own the object until the row exists. That leaves exactly one safe order, and
 * it is the one that fails well:
 *
 * - Row first, photograph second. A failed upload leaves a complete
 *   registration with its photograph still on the phone, and the retry is a
 *   plain re-upload to the same deterministic key. Nothing is lost and nothing
 *   is duplicated.
 * - Photograph first would need the row to already exist to be allowed at all,
 *   and if it were allowed, a failure between the two would leave an orphaned
 *   object nobody could reach or ever clean up.
 *
 * So a missing photograph is a recoverable, visible errand, and the thing that
 * can never happen -- a tree without a growth log -- is the thing the database
 * transaction rules out.
 */
export function useRegisterTree() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useMutation({
    mutationFn: async (input: RegisterTreeInput): Promise<RegisterTreeResult> => {
      const registration =
        input.existing === null || input.existing === undefined
          ? await createRows(input)
          : {
              ...input.existing,
              // Rebuilt rather than stored: the keys are a pure function of the
              // tree and the cycle, which is exactly why a retry can find them.
              photoPath: growthLogPhotoPath(input.existing.treeId, input.existing.cycle),
              thumbnailPath: growthLogThumbnailPath(input.existing.treeId, input.existing.cycle),
            };

      try {
        await uploadGrowthLogPhoto(registration.treeId, registration.cycle, input.photo);
      } catch (uploadError) {
        // Deliberately not rethrown. The registration succeeded, and telling the
        // guardian it failed would invite them to plant the same tree twice.
        return { registration, isPhotoUploaded: false, uploadError };
      }

      // Only once the bytes are in the bucket is the local copy expendable.
      discardPreparedPhoto(input.photo);

      return { registration, isPhotoUploaded: true, uploadError: null };
    },

    onSuccess: () => {
      // The new tree belongs in the guardian's list and on the map. The map
      // queries by viewport, so its key is refetched wholesale rather than
      // guessed at.
      void queryClient.invalidateQueries({ queryKey: guardianTreesQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ['trees-in-viewport'] });
      void queryClient.invalidateQueries({ queryKey: ['species-catalogue'] });
      void queryClient.invalidateQueries({ queryKey: ['species-suggestions'] });
    },
  });
}

async function createRows(input: RegisterTreeInput): Promise<TreeRegistration> {
  const { data, error } = await supabase
    .rpc('register_tree', {
      in_species_raw_text: input.speciesRawText,
      in_zone_id: input.zoneId,
      in_lng: input.location.lng,
      in_lat: input.location.lat,
      in_planted_at: input.plantedAt,
      in_height_cm: input.heightCm,
      in_visible_branches: input.visibleBranches,
      // The EXIF capture time, never the moment this call was made. In the field
      // those are hours apart, and the reminder cadence counts from the former.
      in_captured_at: input.photo.capturedAt,
      in_capture_lng: input.photo.captureLocation?.lng ?? null,
      in_capture_lat: input.photo.captureLocation?.lat ?? null,
      in_notes: null,
    })
    .maybeSingle();

  if (error !== null) {
    throw error;
  }

  if (data === null) {
    throw new Error('register_tree returned no row');
  }

  const row = data as RegistrationRow;

  return {
    treeId: row.tree_id,
    code: row.code,
    cycle: row.cycle,
    photoPath: row.photo_path,
    thumbnailPath: row.thumbnail_path,
  };
}
