import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';
import type { TreeCard } from '@/features/public-map';

/**
 * Fetches the complete tree card data for a single tree.
 *
 * This query is made separately from the map viewport query, so panning
 * never pays for photographs or guardian details that nobody tapped.
 *
 * Returns null if the tree is archived or does not exist.
 *
 * Note: photoUrl and thumbnailUrl are signed URLs returned by tree_card() SQL function.
 * They are ready to use in <img> tags without additional client-side signing.
 */
export function useTreeCard(treeId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['tree-card', treeId],
    queryFn: async () => {
      if (!treeId) return null;

      const { data, error } = await supabase.rpc('tree_card', {
        target_tree_id: treeId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const row = data[0];

      return {
        id: row.tree_id,
        code: row.code,
        speciesId: row.species_id,
        species: row.species_name,
        speciesOriginal: row.species_raw_text,
        trackingStatus: row.tracking_status,
        status: row.status,
        plantedAt: row.planted_at,
        lastUpdatedAt: row.last_updated_at,
        nextReminderAt: row.next_reminder_at,
        location: {
          lat: row.lat,
          lng: row.lng,
          vereda: row.village_name,
          municipality: row.municipality_name,
        },
        cycle: row.latest_cycle,
        guardianId: row.guardian_id,
        guardianName: row.guardian_display_name,
        photoUrl: row.latest_photo_url,
        thumbnailUrl: row.latest_thumbnail_url,
      } as TreeCard;
    },
    enabled: treeId !== null,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
