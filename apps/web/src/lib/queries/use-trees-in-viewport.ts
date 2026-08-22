import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';
import type { TreeMarker, ViewportBounds, TreeFilters } from '@/features/public-map';

interface TreesInViewportRow {
  tree_id: string;
  lng: number;
  lat: number;
  tracking_status: string;
  species_id: string;
  species_name: string;
}

interface UseTreesInViewportOptions {
  viewport: ViewportBounds | null;
  filters?: TreeFilters;
  enabled?: boolean;
}

/**
 * Fetches tree markers for the current viewport.
 *
 * The map never carries photographs, guardian details, or measurements: every
 * pan and zoom should pay only for a dot and nothing else. The card is fetched
 * separately when a marker is tapped.
 *
 * Results are limited by zoom level: 250 dots at z<11, 750 at z<15, 1000 above.
 */
export function useTreesInViewport({
  viewport,
  filters,
  enabled = true,
}: UseTreesInViewportOptions) {
  const supabase = createClient();

  return useQuery({
    queryKey: [
      'trees-in-viewport',
      viewport?.minLat,
      viewport?.minLng,
      viewport?.maxLat,
      viewport?.maxLng,
      viewport?.zoom,
      filters?.species,
      filters?.zones,
    ],
    queryFn: async () => {
      if (!viewport) return [];

      const { data, error } = await supabase.rpc('trees_in_viewport', {
        min_lng: viewport.minLng,
        min_lat: viewport.minLat,
        max_lng: viewport.maxLng,
        max_lat: viewport.maxLat,
        zoom: viewport.zoom,
        species_filter: filters?.species || null,
        zone_filter: filters?.zones || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map((row: TreesInViewportRow) => ({
        id: row.tree_id,
        lng: row.lng,
        lat: row.lat,
        status: row.tracking_status as TreeMarker['status'],
        species: row.species_name,
      })) as TreeMarker[];
    },
    enabled: enabled && viewport !== null,
    staleTime: 1000 * 60, // 1 minute
  });
}
