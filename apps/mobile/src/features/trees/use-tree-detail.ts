import { useQuery } from '@tanstack/react-query';
import {
  PHOTO_SIGNED_URL_TTL_SECONDS,
  type Coordinates,
  type HealthStatus,
  type IsoDateTime,
  type TrackingStatus,
  type TreeCardSummary,
  type TreeStatus,
  type Uuid,
} from '@arbolapp/core';

import { signPhotos } from '@/features/photos/growth-log-storage';
import { parseEwkbPoint } from '@/lib/postgis';
import { supabase } from '@/lib/supabase/client';

/** One entry of the growth log, with its photograph already signed. */
export type TimelineEntry = {
  id: Uuid;
  cycle: number;
  capturedAt: IsoDateTime;
  heightCm: number | null;
  visibleBranches: number | null;
  healthStatus: HealthStatus;
  notes: string | null;
  onTime: boolean;
  /**
   * Where the device was when the shutter fired, which is not where the tree
   * is: the guardian stands back to frame it, and a reading taken under a
   * canopy drifts. Null whenever the photograph carried no EXIF position.
   */
  captureLocation: Coordinates | null;
  photoUrl: string | null;
  thumbnailUrl: string | null;
};

export type TreeDetail = {
  card: TreeCardSummary;
  /** Newest cycle first, which is the order the timeline reads in. */
  entries: TimelineEntry[];
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

type EntryRow = {
  id: string;
  cycle: number;
  captured_at: string;
  height_cm: number | null;
  visible_branches: number | null;
  health_status: HealthStatus;
  notes: string | null;
  on_time: boolean;
  /** Hexadecimal EWKB, which is how PostgREST renders a PostGIS geometry. */
  capture_location: string | null;
  photo_path: string;
  thumbnail_path: string;
};

export const treeDetailQueryKey = (treeId: Uuid | null) => ['tree-detail', treeId] as const;

/**
 * Everything the tree detail screen draws: the card, and the whole growth log.
 *
 * The timeline is short by construction -- six entries a year -- so unlike the
 * map, signing every photograph up front is the right trade: the comparator and
 * the viewer both need arbitrary entries on demand, and minting a link at the
 * moment of a swipe would put a network round trip inside a gesture.
 *
 * A photograph that has not been uploaded yet signs to null and the screen shows
 * its placeholder. That is a real state in this phase and not an error: the row
 * is written before its object, so a tree registered on a dead connection has a
 * complete log entry whose picture is still on the guardian's phone.
 */
export function useTreeDetail(treeId: Uuid | null) {
  return useQuery({
    queryKey: treeDetailQueryKey(treeId),
    enabled: treeId !== null,
    // Shorter than the signed links' own life, so a detail reopened from the
    // cache never hands the image component something already expired.
    staleTime: (PHOTO_SIGNED_URL_TTL_SECONDS / 2) * 1_000,
    queryFn: async ({ signal }): Promise<TreeDetail | null> => {
      if (treeId === null) {
        return null;
      }

      const [cardResult, entriesResult] = await Promise.all([
        supabase.rpc('tree_card', { target_tree_id: treeId }).abortSignal(signal).maybeSingle(),
        supabase
          .from('log_entries')
          .select(
            'id, cycle, captured_at, height_cm, visible_branches, health_status, notes, on_time, capture_location, photo_path, thumbnail_path',
          )
          .eq('tree_id', treeId)
          .is('archived_at', null)
          .order('cycle', { ascending: false })
          .abortSignal(signal),
      ]);

      if (cardResult.error !== null) {
        throw new Error(cardResult.error.message);
      }
      if (entriesResult.error !== null) {
        throw new Error(entriesResult.error.message);
      }

      // The tree is archived, or never existed. Not an error: the screen says so
      // and offers the way back, rather than showing a retry that cannot help.
      if (cardResult.data === null) {
        return null;
      }

      const row = cardResult.data as CardRow;
      const rows = (entriesResult.data ?? []) as EntryRow[];

      const photoUrls = await signPhotos(
        rows.map((entry) => entry.photo_path),
        PHOTO_SIGNED_URL_TTL_SECONDS,
      );
      const thumbnailUrls = await signPhotos(
        rows.map((entry) => entry.thumbnail_path),
        PHOTO_SIGNED_URL_TTL_SECONDS,
      );

      return {
        card: {
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
          latestPhotoPath: row.latest_photo_path,
          latestThumbnailPath: row.latest_thumbnail_path,
        },
        entries: rows.map((entry, index) => ({
          id: entry.id,
          cycle: entry.cycle,
          capturedAt: entry.captured_at,
          heightCm: entry.height_cm,
          visibleBranches: entry.visible_branches,
          healthStatus: entry.health_status,
          notes: entry.notes,
          onTime: entry.on_time,
          captureLocation: parseEwkbPoint(entry.capture_location),
          photoUrl: photoUrls[index] ?? null,
          thumbnailUrl: thumbnailUrls[index] ?? null,
        })),
      };
    },
  });
}
