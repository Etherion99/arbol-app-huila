import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  regionToBoundingBox,
  regionToZoom,
  type MapRegion,
  type TrackingStatus,
  type TreeMarker,
  type Uuid,
} from '@arbolapp/core';

import { supabase } from '@/lib/supabase/client';

/** The row shape `trees_in_viewport` returns, in the database's own spelling. */
type ViewportRow = {
  tree_id: string;
  lng: number;
  lat: number;
  tracking_status: string;
  species_id: string;
  species_name: string;
};

export type ViewportFilters = {
  speciesIds: Uuid[] | null;
  zoneIds: Uuid[] | null;
};

export type ViewportResult = {
  trees: TreeMarker[];
  zoom: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  /** True when what is on screen came from the cache and not from the server. */
  isShowingCached: boolean;
  refetch: () => void;
};

/**
 * Snapping the box to a grid before it becomes a cache key.
 *
 * Without this every pixel of movement is a new key and the cache holds a
 * thousand near identical viewports, none of which ever gets a second hit. The
 * grid is proportional to what is on screen, so the tolerance is a fixed
 * fraction of the view rather than a fixed distance.
 */
function snap(value: number, precision: number): number {
  return Math.round(value / precision) * precision;
}

export function useTreesInViewport(
  region: MapRegion | null,
  filters: ViewportFilters,
): ViewportResult {
  const zoom = region === null ? 0 : regionToZoom(region);
  const box = region === null ? null : regionToBoundingBox(region);
  const precision = region === null ? 1 : region.longitudeDelta / 8;

  const key =
    box === null
      ? null
      : {
          minLng: snap(box.minLng, precision),
          minLat: snap(box.minLat, precision),
          maxLng: snap(box.maxLng, precision),
          maxLat: snap(box.maxLat, precision),
        };

  const query = useQuery({
    queryKey: ['trees-in-viewport', key, zoom, filters.speciesIds, filters.zoneIds],
    enabled: box !== null,
    // Keeps the previous viewport's markers on screen while the next one loads,
    // so a pan does not blink the whole map away and back.
    placeholderData: keepPreviousData,
    // A tree's state changes when its guardian uploads a photograph, which is a
    // thing that happens a few times a year per tree. A minute is generous.
    staleTime: 60_000,
    // The map keeps every viewport it has loaded for the whole session. This is
    // what the offline mode is built on: a guardian who loses signal in a
    // vereda still sees the zones they have already looked at, because their
    // markers never left the cache.
    gcTime: Infinity,
    // Try anyway rather than pausing while the radio is down. A cached viewport
    // answers instantly, and one that is not cached fails visibly instead of
    // hanging on a request that was never sent.
    networkMode: 'offlineFirst',
    queryFn: async ({ signal }) => {
      if (box === null) {
        return [];
      }

      // The abort signal is what cancels the request the map has already moved
      // away from. Without it a slow answer for an old viewport can land after
      // a fast answer for the current one and repaint the wrong trees.
      const { data, error } = await supabase
        .rpc('trees_in_viewport', {
          min_lng: box.minLng,
          min_lat: box.minLat,
          max_lng: box.maxLng,
          max_lat: box.maxLat,
          zoom,
          species_filter: filters.speciesIds,
          zone_filter: filters.zoneIds,
        })
        .abortSignal(signal);

      if (error !== null) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as ViewportRow[];

      // The tracking status is passed straight through. It is computed by the
      // `tree_tracking` view against a threshold this client does not own, and
      // recomputing it here is how the map would start disagreeing with the
      // reminders a guardian actually receives.
      return rows.map<TreeMarker>((row) => ({
        treeId: row.tree_id,
        lng: row.lng,
        lat: row.lat,
        trackingStatus: row.tracking_status as TrackingStatus,
        speciesId: row.species_id,
        speciesName: row.species_name,
      }));
    },
  });

  return {
    trees: query.data ?? [],
    zoom,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    // Markers are on screen, but they belong to the viewport the map was on
    // before this one and the current fetch has not answered yet.
    isShowingCached: query.isPlaceholderData,
    refetch: () => {
      void query.refetch();
    },
  };
}
