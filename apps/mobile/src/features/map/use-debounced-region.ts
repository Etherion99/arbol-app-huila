import { VIEWPORT_DEBOUNCE_MS, type MapRegion } from '@arbolapp/core';

import { useDebouncedValue } from '@/hooks/use-debounced-value';

/**
 * The region the map settled on, rather than every region it passed through.
 *
 * A pan reports a continuous stream of positions, and querying each one would
 * spend a rural connection on answers that are stale by the time they land, so
 * the region is only published once the map has been still for a moment.
 */
export function useDebouncedRegion(region: MapRegion | null): MapRegion | null {
  return useDebouncedValue(region, VIEWPORT_DEBOUNCE_MS);
}
