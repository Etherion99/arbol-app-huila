import { onlineManager } from '@tanstack/react-query';
import { growthLogPhotoPath, growthLogThumbnailPath } from '@arbolapp/core';

import { uploadGrowthLogPhoto } from '@/features/photos/growth-log-storage';
import { discardPreparedPhoto, preparedPhotoExists } from '@/features/photos/photo-pipeline';
import type { QueueTransport } from '@/features/sync/sync-queue-engine';
import type { JobTarget, SyncJob } from '@/features/sync/sync-queue-model';
import { supabase } from '@/lib/supabase/client';

/**
 * The queue's one door to the server.
 *
 * Everything Supabase-shaped lives here so the engine beside it stays a plain
 * state machine. Failures are never translated on the way out: the raw
 * PostgREST error carries the SQLSTATE, and the SQLSTATE is what tells a
 * duplicate cycle from a refusal from a radio that dropped.
 */

/**
 * The signed in guardian, mirrored out of Supabase.
 *
 * The queue drains from a timer and from a connectivity listener, neither of
 * which is inside React, so the user id cannot come from the session context.
 * Supabase pushes every change through this one subscription, which is the same
 * source the context reads, so the two cannot disagree.
 */
let currentUserId: string | null = null;

void supabase.auth.getSession().then(({ data }) => {
  currentUserId = data.session?.user.id ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUserId = session?.user.id ?? null;
});

/** The signed in guardian, for the callers that need to know there is one. */
export function queueUserId(): string | null {
  return currentUserId;
}

/**
 * A point as PostGIS reads it off the wire.
 *
 * Extended well known text rather than GeoJSON: PostgREST sends this straight
 * through as a string literal and the geometry input function takes it, with
 * the SRID declared in the value itself so nothing has to guess at 4326.
 */
function toWkt(point: { lat: number; lng: number } | null): string | null {
  return point === null ? null : `SRID=4326;POINT(${point.lng} ${point.lat})`;
}

type RegistrationRow = {
  tree_id: string;
  code: string;
  cycle: number;
};

async function submitPlanting(job: Extract<SyncJob, { kind: 'planting' }>): Promise<JobTarget> {
  const { data, error } = await supabase
    .rpc('register_tree', {
      in_species_raw_text: job.speciesRawText,
      in_zone_id: job.zoneId,
      in_lng: job.location.lng,
      in_lat: job.location.lat,
      in_planted_at: job.plantedAt,
      in_height_cm: job.heightCm,
      in_visible_branches: job.visibleBranches,
      // The EXIF capture time, never the moment this call was made. With a
      // queue between the two those are routinely days apart, and the reminder
      // cadence counts from the former.
      in_captured_at: job.photo.capturedAt,
      in_capture_lng: job.photo.captureLocation?.lng ?? null,
      in_capture_lat: job.photo.captureLocation?.lat ?? null,
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

  return { treeId: row.tree_id, code: row.code, cycle: row.cycle };
}

async function submitLogEntry(job: Extract<SyncJob, { kind: 'log_entry' }>): Promise<JobTarget> {
  const { error } = await supabase.from('log_entries').insert({
    tree_id: job.treeId,
    author_id: currentUserId,
    cycle: job.cycle,
    // Built from the tree and the cycle by the same function the upload uses.
    // That the row and the object agree without either being passed to the
    // other is what makes a retry land on the objects the row already names.
    photo_path: growthLogPhotoPath(job.treeId, job.cycle),
    thumbnail_path: growthLogThumbnailPath(job.treeId, job.cycle),
    captured_at: job.photo.capturedAt,
    capture_location: toWkt(job.photo.captureLocation),
    height_cm: job.heightCm,
    visible_branches: job.visibleBranches,
    health_status: job.healthStatus,
    notes: job.notes,
    // Nothing derived is sent: `on_time` is decided in the database from
    // `captured_at`, so it cannot be reported optimistically from a phone that
    // has been offline for a week.
  });

  if (error !== null) {
    throw error;
  }

  return { treeId: job.treeId, code: null, cycle: job.cycle };
}

/**
 * Whether an interrupted attempt actually wrote its rows.
 *
 * The window this closes is small and real: between PostgREST committing and
 * the phone writing the answer to its own disk, a process that is killed leaves
 * a job that cannot tell whether it planted a tree. Guessing "no" plants it
 * twice; guessing "yes" loses it. So the queue asks.
 *
 * The question is precise because `captured_at` is. It comes from the EXIF of
 * one photograph, to the millisecond, and no two entries share it. For a
 * planting the row to look for is that photograph's cycle 1; for a log entry
 * the tree and the cycle already identify it, and the unique index would have
 * caught a duplicate anyway -- this simply avoids spending the attempt.
 */
async function recover(job: SyncJob): Promise<JobTarget | null> {
  const query = supabase.from('log_entries').select('tree_id, cycle').limit(1);

  const { data, error } =
    job.kind === 'planting'
      ? await query
          .eq('author_id', currentUserId ?? '')
          .eq('cycle', 1)
          .eq('captured_at', job.photo.capturedAt)
      : await query.eq('tree_id', job.treeId).eq('cycle', job.cycle);

  if (error !== null) {
    throw error;
  }

  const row = (data ?? [])[0] as { tree_id: string; cycle: number } | undefined;

  return row === undefined ? null : { treeId: row.tree_id, code: null, cycle: row.cycle };
}

export const supabaseQueueTransport: QueueTransport = {
  /**
   * Signal and a session, both. Without the first every attempt is a wasted
   * timeout; without the second the write would be refused by a row level
   * policy, which the queue would have to read as permanent and would strand
   * work that only needs the guardian to sign in again.
   */
  canSubmit() {
    return onlineManager.isOnline() && currentUserId !== null;
  },

  submit(job) {
    return job.kind === 'planting' ? submitPlanting(job) : submitLogEntry(job);
  },

  recover,

  upload(job, target) {
    return uploadGrowthLogPhoto(target.treeId, target.cycle, job.photo);
  },

  hasPhoto(job) {
    return preparedPhotoExists(job.photo);
  },

  discardPhoto(job) {
    discardPreparedPhoto(job.photo);
  },
};
