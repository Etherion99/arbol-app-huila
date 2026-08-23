import 'server-only';

import { cache } from 'react';

import {
  GROWTH_LOG_BUCKET,
  type FlaggedRegistration,
  type RegistrationFlagReason,
} from '@arbolapp/core';

import { createClient } from '@/lib/supabase/server';

/**
 * The registrations a coordinator has to judge.
 *
 * This is the queue the canvas has drawn since the first version — the cards
 * reading «GPS difiere 240 m de la foto» and «duplicado a <3 m» — and until now
 * it had nothing behind it. `registration_flags` and
 * `registration_review_queue()` are what it reads.
 *
 * ## What a flag is, and what it is not
 *
 * It is a signal, never a verdict. The tree is registered, it is on the public
 * map, its guardian owns it, and its growth log runs exactly as any other
 * tree's does. What a flag says is that one of three cheap checks noticed
 * something, and that a person should look. Under canopy a GPS wanders by more
 * than the threshold through nobody's fault, and two saplings really can stand
 * three metres apart, so most of what lands here is honest work — which is
 * precisely why nothing was refused on the way in.
 */

/** Result shape shared with the screen, which distinguishes failure from empty. */
export type ReviewQueueResult = { flags: FlaggedRegistration[] } | { error: true };

type QueueRow = {
  flag_id: string;
  tree_id: string;
  code: string;
  species_name: string;
  village_name: string | null;
  municipality_name: string | null;
  guardian_id: string | null;
  guardian_display_name: string | null;
  reason: string;
  distance_metres: number | string | null;
  related_tree_id: string | null;
  related_tree_code: string | null;
  planted_at: string;
  flagged_at: string;
  photo_path: string | null;
};

/**
 * `numeric` arrives from PostgREST as a string, because JavaScript cannot hold
 * every value the type can. These are metres with two decimals, so a number is
 * safe — but the conversion has to be deliberate rather than an implicit coerce
 * that would turn a null into a zero and report a perfect match.
 */
function metres(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const getRegistrationReviewQueue = cache(async (): Promise<ReviewQueueResult> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('registration_review_queue', {
    include_resolved: false,
  });

  if (error || !data) return { error: true };

  const rows = data as QueueRow[];

  return {
    flags: rows.map((row) => ({
      flagId: row.flag_id,
      treeId: row.tree_id,
      code: row.code,
      speciesName: row.species_name,
      villageName: row.village_name,
      municipalityName: row.municipality_name,
      guardianId: row.guardian_id,
      guardianDisplayName: row.guardian_display_name,
      reason: row.reason as RegistrationFlagReason,
      distanceMetres: metres(row.distance_metres),
      relatedTreeId: row.related_tree_id,
      relatedTreeCode: row.related_tree_code,
      plantedAt: row.planted_at,
      flaggedAt: row.flagged_at,
      photoPath: row.photo_path,
    })),
  };
});

/** How long a signed photograph link is good for on this screen. */
const PHOTO_TTL_SECONDS = 600;

/**
 * Signs the photographs of a batch of flags, in one request.
 *
 * The panel is the one surface in the project that genuinely needs to see the
 * picture: the whole judgement a coordinator is making is whether this looks
 * like a tree somebody stood in front of. Every other screen degrades happily
 * to a placeholder, so they never sign anything.
 *
 * A failure loses the photographs and not the queue. A card that says which
 * tree it is, how far the coordinate drifted and who registered it is still
 * worth judging, and refusing to render the screen because a signing call
 * failed would take the whole queue away over a thumbnail.
 */
export async function signFlagPhotos(
  flags: readonly FlaggedRegistration[],
): Promise<Map<string, string>> {
  const paths = [...new Set(flags.map((flag) => flag.photoPath).filter((p) => p !== null))];

  if (paths.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(GROWTH_LOG_BUCKET)
    .createSignedUrls(paths, PHOTO_TTL_SECONDS);

  const signed = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      signed.set(item.path, item.signedUrl);
    }
  }
  return signed;
}
