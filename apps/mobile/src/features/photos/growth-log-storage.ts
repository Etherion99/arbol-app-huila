import { File } from 'expo-file-system';
import {
  GROWTH_LOG_BUCKET,
  growthLogPhotoPath,
  growthLogThumbnailPath,
  type Uuid,
} from '@arbolapp/core';

import type { PreparedPhoto } from '@/features/photos/photo-pipeline';
import { supabase } from '@/lib/supabase/client';

/**
 * Getting the two objects of a cycle into the private bucket.
 *
 * The order is not an implementation detail, it is the whole safety argument of
 * this phase. The storage policies decide ownership by reading a tree id out of
 * the object name, so nothing can be uploaded until the row that owns it
 * exists. The row is therefore written first, in one transaction with its log
 * entry, and the photograph follows.
 *
 * What that buys: a failed upload leaves a complete, correct registration whose
 * photograph is still on the phone, and the retry is a plain re-upload to the
 * same deterministic key. The opposite order would leave either an orphaned
 * object nobody can reach or a guardian whose whole form vanished because the
 * radio dropped.
 */

/** Raised when the photograph is no longer on the phone to be sent. */
export class MissingLocalPhotoError extends Error {
  constructor() {
    super('the prepared photograph is no longer on this device');
    this.name = 'MissingLocalPhotoError';
  }
}

async function putObject(objectKey: string, localUri: string): Promise<void> {
  const file = new File(localUri);

  if (!file.exists) {
    throw new MissingLocalPhotoError();
  }

  const body = await file.arrayBuffer();

  const { error } = await supabase.storage.from(GROWTH_LOG_BUCKET).upload(objectKey, body, {
    contentType: 'image/jpeg',
    // A retry re-sends the same bytes to the same key. Without this the second
    // attempt would fail as "already exists" and a guardian retrying after a
    // dropped connection would be told their own successful upload was an
    // error. It is also how a guardian replaces a photograph that came out
    // unusable, which the storage update policy explicitly allows.
    upsert: true,
  });

  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Sends the photograph and its thumbnail for one cycle.
 *
 * The full photograph goes first. If only one of the two makes it, the one
 * worth having is the evidence rather than the preview: every surface that
 * loads a thumbnail already degrades to a placeholder when the object is
 * missing, and none of them breaks.
 */
export async function uploadGrowthLogPhoto(
  treeId: Uuid,
  cycle: number,
  photo: Pick<PreparedPhoto, 'photoUri' | 'thumbnailUri'>,
): Promise<void> {
  await putObject(growthLogPhotoPath(treeId, cycle), photo.photoUri);
  await putObject(growthLogThumbnailPath(treeId, cycle), photo.thumbnailUri);
}

/**
 * Signs one object key for reading.
 *
 * The bucket is private, so there is no URL that simply exists: each one has to
 * be minted. A failure resolves to null rather than throwing, because an object
 * that is not there yet is a normal state in this phase -- the row is written
 * before its photograph -- and a card without a photograph is still a useful
 * card.
 */
export async function signPhoto(path: string | null, ttlSeconds: number): Promise<string | null> {
  if (path === null || path.trim() === '') {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(GROWTH_LOG_BUCKET)
    .createSignedUrl(path, ttlSeconds);

  if (error !== null || data === null) {
    return null;
  }

  return data.signedUrl;
}

/** Signs several object keys at once, keeping nulls where nothing was there. */
export async function signPhotos(
  paths: readonly (string | null)[],
  ttlSeconds: number,
): Promise<(string | null)[]> {
  return Promise.all(paths.map((path) => signPhoto(path, ttlSeconds)));
}
