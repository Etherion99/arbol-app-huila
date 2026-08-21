import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  growthLogPhotoPath,
  growthLogThumbnailPath,
  type HealthStatus,
  type Uuid,
} from '@arbolapp/core';

import { useSession } from '@/features/auth/session-provider';
import { uploadGrowthLogPhoto } from '@/features/photos/growth-log-storage';
import { discardPreparedPhoto, type PreparedPhoto } from '@/features/photos/photo-pipeline';
import { TreeOperationError, isDuplicateCycle } from '@/features/trees/tree-errors';
import { guardianTreesQueryKey } from '@/features/trees/use-guardian-trees';
import { treeDetailQueryKey } from '@/features/trees/use-tree-detail';
import { supabase } from '@/lib/supabase/client';

export type AddLogEntryInput = {
  treeId: Uuid;
  /**
   * The cycle this entry claims. Sent explicitly rather than left to the trigger
   * because the object key is derived from it, and the photograph has to be
   * uploaded to a path that is known before the row comes back.
   *
   * The unique index on `(tree_id, cycle)` is what makes that safe: two attempts
   * at the same cycle cannot both land.
   */
  cycle: number;
  heightCm: number | null;
  visibleBranches: number | null;
  healthStatus: HealthStatus;
  notes: string | null;
  photo: PreparedPhoto;
};

export type AddLogEntryResult = {
  cycle: number;
  isPhotoUploaded: boolean;
  uploadError: unknown;
  /**
   * True when the row was already there from an earlier attempt. Worth saying
   * out loud: the guardian pressed save twice and nothing was duplicated, which
   * is reassurance rather than an error.
   */
  wasAlreadyRecorded: boolean;
};

/**
 * Adding a cycle to a growth log.
 *
 * The same order as planting, for the same reason: the row goes in first,
 * because the storage policies read ownership out of the object name and the
 * photograph cannot be uploaded against an entry that does not exist. A failed
 * upload therefore leaves a correct entry with its photograph on the phone and
 * an explicit retry, never a lost visit to a tree.
 *
 * Everything else the entry causes is the database's, and none of it is repeated
 * here: a trigger moves `trees.last_updated_at` to the capture time, recomputes
 * the cycle number, resolves the open reminders and propagates a death to
 * `trees.status`; `next_reminder_at` is a generated column and `on_time` is
 * derived from `captured_at`. Doing any of it from the client would either
 * duplicate the effect or overwrite it with a worse answer.
 */
export function useAddLogEntry() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useMutation({
    mutationFn: async (input: AddLogEntryInput): Promise<AddLogEntryResult> => {
      if (userId === null) {
        throw new TreeOperationError('42501', 'not signed in');
      }

      let wasAlreadyRecorded = false;

      const { error } = await supabase.from('log_entries').insert({
        tree_id: input.treeId,
        author_id: userId,
        cycle: input.cycle,
        photo_path: growthLogPhotoPath(input.treeId, input.cycle),
        thumbnail_path: growthLogThumbnailPath(input.treeId, input.cycle),
        // From the photograph's EXIF, not from now. With intermittent signal
        // hours pass between the shutter and the upload, and the date that
        // matters is the one the photograph was taken on.
        captured_at: input.photo.capturedAt,
        capture_location: toWkt(input.photo.captureLocation),
        height_cm: input.heightCm,
        visible_branches: input.visibleBranches,
        health_status: input.healthStatus,
        notes: input.notes,
        // `cycle` aside, nothing derived is sent: `on_time` is decided in the
        // database from `captured_at`, so it cannot be reported optimistically.
      });

      if (error !== null) {
        if (!isDuplicateCycle(error)) {
          throw error;
        }
        // A retry after the first attempt reached the server and the answer did
        // not come back. The entry is already recorded, so this is not a
        // failure -- it just means the only thing left to do is the upload.
        wasAlreadyRecorded = true;
      }

      try {
        await uploadGrowthLogPhoto(input.treeId, input.cycle, input.photo);
      } catch (uploadError) {
        return { cycle: input.cycle, isPhotoUploaded: false, uploadError, wasAlreadyRecorded };
      }

      discardPreparedPhoto(input.photo);

      return { cycle: input.cycle, isPhotoUploaded: true, uploadError: null, wasAlreadyRecorded };
    },

    onSuccess: (_result, input) => {
      // The tree's own screens change: a new timeline entry, a new due date, and
      // possibly a new marker colour on the map.
      void queryClient.invalidateQueries({ queryKey: treeDetailQueryKey(input.treeId) });
      void queryClient.invalidateQueries({ queryKey: guardianTreesQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ['tree-card', input.treeId] });
      void queryClient.invalidateQueries({ queryKey: ['trees-in-viewport'] });
    },
  });
}

/**
 * A point as PostGIS reads it off the wire.
 *
 * Extended well known text rather than GeoJSON: PostgREST sends this straight
 * through as a string literal and the geometry input function takes it, with the
 * SRID declared in the value itself so nothing has to guess at 4326.
 */
function toWkt(point: { lat: number; lng: number } | null): string | null {
  return point === null ? null : `SRID=4326;POINT(${point.lng} ${point.lat})`;
}
