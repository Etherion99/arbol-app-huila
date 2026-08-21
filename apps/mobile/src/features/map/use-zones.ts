import { useQuery } from '@tanstack/react-query';
import type { Uuid, ZoneType } from '@arbolapp/core';

import { supabase } from '@/lib/supabase/client';

/**
 * A zone reduced to what the filter needs: a name to show, a centroid to frame
 * the map on, and the parent that puts it under its municipality.
 */
export type ZoneOption = {
  id: Uuid;
  parentId: Uuid | null;
  type: ZoneType;
  name: string;
  centroid: { lng: number; lat: number } | null;
  suggestedZoom: number | null;
};

export type ZoneCatalogue = {
  municipalities: ZoneOption[];
  villagesByMunicipality: Map<Uuid, ZoneOption[]>;
};

type ZoneRow = {
  id: string;
  parent_id: string | null;
  type: ZoneType;
  name: string;
  suggested_zoom: number | null;
  centroid: unknown;
};

/**
 * PostgREST serialises a PostGIS point as a GeoJSON object, so the coordinates
 * arrive as `{ type: 'Point', coordinates: [lng, lat] }`.
 *
 * It is narrowed rather than cast because the catalogue explicitly allows a
 * zone without a centroid -- a coordinator can create a vereda before anyone
 * has placed it -- and a missing point must degrade to "cannot frame this
 * zone", never to a crash inside a render.
 */
function readCentroid(raw: unknown): { lng: number; lat: number } | null {
  if (typeof raw !== 'object' || raw === null || !('coordinates' in raw)) {
    return null;
  }

  const { coordinates } = raw as { coordinates: unknown };

  if (!Array.isArray(coordinates)) {
    return null;
  }

  const [lng, lat] = coordinates;

  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return null;
  }

  return { lng, lat };
}

/**
 * The Municipality then Village catalogue behind the filter.
 *
 * The coordinator edits zones from the panel -- names, centroids, zoom, and new
 * zones altogether -- so this is deliberately not cached for long and never
 * treated as a fixed list. A vereda renamed in the morning shows its new name
 * the next time the filter opens, not next release.
 */
export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    // Short enough that an edit surfaces on the next visit to the screen, long
    // enough that opening the filter twice in a row is not two round trips.
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<ZoneCatalogue> => {
      const { data, error } = await supabase
        .from('zones')
        .select('id, parent_id, type, name, suggested_zoom, centroid')
        .is('archived_at', null)
        .order('name')
        .abortSignal(signal);

      if (error !== null) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as ZoneRow[];

      const options = rows.map<ZoneOption>((row) => ({
        id: row.id,
        parentId: row.parent_id,
        type: row.type,
        name: row.name,
        centroid: readCentroid(row.centroid),
        suggestedZoom: row.suggested_zoom,
      }));

      const municipalities = options.filter((zone) => zone.type === 'municipality');
      const villagesByMunicipality = new Map<Uuid, ZoneOption[]>();

      for (const zone of options) {
        if (zone.type !== 'village' || zone.parentId === null) {
          continue;
        }
        const siblings = villagesByMunicipality.get(zone.parentId) ?? [];
        siblings.push(zone);
        villagesByMunicipality.set(zone.parentId, siblings);
      }

      return { municipalities, villagesByMunicipality };
    },
  });
}
