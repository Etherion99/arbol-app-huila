import { useQuery } from '@tanstack/react-query';
import type { TrackingStatus, Uuid } from '@arbolapp/core';

import { supabase } from '@/lib/supabase/client';
import type { ZoneCatalogue } from '@/features/map/use-zones';

export type MunicipalityBubble = {
  id: Uuid;
  name: string;
  lng: number;
  lat: number;
  count: number;
  status: TrackingStatus;
};

type MunicipalityRow = {
  municipality_id: string | null;
  municipality_name: string | null;
  planted_total: number;
  overdue_total: number;
};

/**
 * One circle per municipality, with the number of trees in it.
 *
 * This is what the map shows when the whole department is on screen. At that
 * distance individual trees are a smear, and grouping them geographically would
 * answer a question nobody asked: what a reader wants from a department view is
 * "how much has each municipality planted", which is an administrative total,
 * not a cluster of whatever happens to be inside a grid cell.
 *
 * It also costs one small query instead of the couple of hundred markers
 * `trees_in_viewport` would return for a viewport that wide -- which is why the
 * screen stops asking for markers at all while this is showing.
 *
 * The totals come from `statistics_by_municipality`, which counts every active
 * tree and knows nothing about the species filter. So this is only used when no
 * filter is set; with one active the map falls back to grouping real markers,
 * where the filter is honoured.
 */
export function useMunicipalityCounts(catalogue: ZoneCatalogue | undefined, isEnabled: boolean) {
  return useQuery({
    queryKey: ['municipality-counts'],
    enabled: isEnabled && catalogue !== undefined,
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<MunicipalityBubble[]> => {
      const { data, error } = await supabase
        .from('statistics_by_municipality')
        .select('municipality_id, municipality_name, planted_total, overdue_total')
        .abortSignal(signal);

      if (error !== null) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as MunicipalityRow[];
      const bubbles: MunicipalityBubble[] = [];

      for (const row of rows) {
        if (row.municipality_id === null) {
          continue;
        }

        // The centroid lives in the zone catalogue, which the coordinator can
        // edit. A municipality without one is counted but cannot be placed, so
        // it is left off the map rather than drawn at a guessed position.
        const zone = catalogue?.municipalities.find(
          (candidate) => candidate.id === row.municipality_id,
        );

        if (zone?.centroid == null) {
          continue;
        }

        bubbles.push({
          id: row.municipality_id,
          name: row.municipality_name ?? zone.name,
          lng: zone.centroid.lng,
          lat: zone.centroid.lat,
          count: row.planted_total,
          // The circle carries the urgency of the municipality, so a
          // department view still shows where somebody needs to go.
          status: row.overdue_total > 0 ? 'overdue' : 'up_to_date',
        });
      }

      return bubbles;
    },
  });
}
