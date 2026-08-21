import { useQuery } from '@tanstack/react-query';
import {
  GROWTH_LOG_BUCKET,
  PHOTO_SIGNED_URL_TTL_SECONDS,
  type TrackingStatus,
  type TreeCardSummary,
  type TreeStatus,
  type Uuid,
} from '@arbolapp/core';

import { supabase } from '@/lib/supabase/client';

/**
 * The card as the screen consumes it: the row the database returns, with the
 * object keys already exchanged for a link the image component can load.
 */
export type TreeCard = Omit<TreeCardSummary, 'latestPhotoPath' | 'latestThumbnailPath'> & {
  /**
   * Signed, or null when there is nothing to show. The card degrades to a
   * placeholder rather than a broken frame, because the seed -- and the first
   * months of the real project -- have rows whose object was never uploaded.
   */
  thumbnailUrl: string | null;
};

type CardRow = {
  tree_id: string;
  code: string;
  species_id: string;
  species_name: string;
  species_raw_text: string;
  tracking_status: string;
  status: TreeStatus;
  planted_at: string;
  last_updated_at: string;
  next_reminder_at: string;
  lng: number;
  lat: number;
  guardian_id: string | null;
  guardian_display_name: string | null;
  guardian_since: string | null;
  village_name: string | null;
  municipality_name: string | null;
  latest_cycle: number | null;
  latest_photo_path: string | null;
  latest_thumbnail_path: string | null;
};

/**
 * Asks Storage to sign one thumbnail.
 *
 * The bucket is private, so there is no URL that simply exists: each one has to
 * be minted. That is exactly why this happens here and not while the map is
 * painting -- signing a URL for every visible marker would be hundreds of
 * requests to look at a screen most of which nobody taps.
 *
 * A failure is not an error the guardian needs to see. The object may genuinely
 * not be there yet, and a card without a photograph is still a useful card, so
 * this resolves to null and the component shows the placeholder.
 */
async function signThumbnail(path: string | null): Promise<string | null> {
  if (path === null || path.trim() === '') {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(GROWTH_LOG_BUCKET)
    .createSignedUrl(path, PHOTO_SIGNED_URL_TTL_SECONDS);

  if (error !== null || data === null) {
    return null;
  }

  return data.signedUrl;
}

/**
 * The card for one tree, fetched when its marker is tapped and not before.
 */
export function useTreeCard(treeId: Uuid | null) {
  return useQuery({
    queryKey: ['tree-card', treeId],
    enabled: treeId !== null,
    // Shorter than the signed URL's own life, so a card reopened from the cache
    // never hands the image component a link that has already expired.
    staleTime: (PHOTO_SIGNED_URL_TTL_SECONDS / 2) * 1_000,
    queryFn: async ({ signal }): Promise<TreeCard | null> => {
      if (treeId === null) {
        return null;
      }

      const { data, error } = await supabase
        .rpc('tree_card', { target_tree_id: treeId })
        .abortSignal(signal)
        .maybeSingle();

      if (error !== null) {
        throw new Error(error.message);
      }

      if (data === null) {
        return null;
      }

      const row = data as CardRow;

      return {
        treeId: row.tree_id,
        code: row.code,
        speciesId: row.species_id,
        speciesName: row.species_name,
        speciesRawText: row.species_raw_text,
        trackingStatus: row.tracking_status as TrackingStatus,
        status: row.status,
        plantedAt: row.planted_at,
        lastUpdatedAt: row.last_updated_at,
        nextReminderAt: row.next_reminder_at,
        lng: row.lng,
        lat: row.lat,
        guardianId: row.guardian_id,
        guardianDisplayName: row.guardian_display_name,
        guardianSince: row.guardian_since,
        villageName: row.village_name,
        municipalityName: row.municipality_name,
        latestCycle: row.latest_cycle,
        thumbnailUrl: await signThumbnail(row.latest_thumbnail_path),
      };
    },
  });
}
