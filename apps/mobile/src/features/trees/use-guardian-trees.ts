import { useQuery } from '@tanstack/react-query';
import {
  PHOTO_SIGNED_URL_TTL_SECONDS,
  type GuardianTreeSummary,
  type TrackingStatus,
  type TreeStatus,
} from '@arbolapp/core';

import { useSession } from '@/features/auth/session-provider';
import { signPhoto } from '@/features/photos/growth-log-storage';
import { supabase } from '@/lib/supabase/client';

/**
 * A tree as the "Mis árboles" list draws it. The photograph is still an object
 * key here: the card signs its own link once it is on screen.
 */
export type GuardianTree = GuardianTreeSummary;

type GuardianTreeRow = {
  tree_id: string;
  code: string;
  species_name: string;
  species_raw_text: string;
  tracking_status: string;
  status: TreeStatus;
  planted_at: string;
  last_updated_at: string;
  next_reminder_at: string;
  village_name: string | null;
  municipality_name: string | null;
  latest_cycle: number | null;
  latest_thumbnail_path: string | null;
};

export const guardianTreesQueryKey = (userId: string | null) => ['guardian-trees', userId] as const;

/**
 * The signed in guardian's trees, in the order they fall due.
 *
 * The thumbnails are deliberately not signed here. The bucket is private, so
 * every link has to be minted, and signing one per row before the list is on
 * screen would be a round trip per tree just to paint it. The list draws the
 * placeholder and the cards that scroll into view ask for their own link.
 *
 * `guardian_trees()` is a function rather than a select because the tracking
 * status lives in a view and the newest cycle in a lateral join, neither of
 * which PostgREST can express against the trees table on its own. The status is
 * never recomputed here: if the client's idea of "vencido" and the database's
 * drifted apart, the list and the map would disagree about the same tree.
 */
export function useGuardianTrees() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: guardianTreesQueryKey(userId),
    enabled: userId !== null,
    // Long enough that returning from a tree detail is not a refetch, short
    // enough that a photograph just uploaded shows up on the way back.
    staleTime: 30_000,
    queryFn: async ({ signal }): Promise<GuardianTree[]> => {
      const { data, error } = await supabase.rpc('guardian_trees').abortSignal(signal);

      if (error !== null) {
        throw new Error(error.message);
      }

      return ((data ?? []) as GuardianTreeRow[]).map((row) => ({
        treeId: row.tree_id,
        code: row.code,
        speciesName: row.species_name,
        speciesRawText: row.species_raw_text,
        trackingStatus: row.tracking_status as TrackingStatus,
        status: row.status,
        plantedAt: row.planted_at,
        lastUpdatedAt: row.last_updated_at,
        nextReminderAt: row.next_reminder_at,
        villageName: row.village_name,
        municipalityName: row.municipality_name,
        latestCycle: row.latest_cycle,
        latestThumbnailPath: row.latest_thumbnail_path,
      }));
    },
  });
}

/**
 * Signs one thumbnail, for a card that is actually on screen.
 *
 * Kept shorter than the link's own life so a card scrolled back to from the
 * cache never hands the image component something that has already expired.
 */
export function useTreeThumbnail(path: string | null) {
  return useQuery({
    queryKey: ['tree-thumbnail', path],
    enabled: path !== null,
    staleTime: (PHOTO_SIGNED_URL_TTL_SECONDS / 2) * 1_000,
    // A missing object is a normal state in this phase -- the row is written
    // before its photograph -- so this must not spend three retries and a
    // backoff discovering that the placeholder was the right answer.
    retry: false,
    queryFn: () => signPhoto(path, PHOTO_SIGNED_URL_TTL_SECONDS),
  });
}
