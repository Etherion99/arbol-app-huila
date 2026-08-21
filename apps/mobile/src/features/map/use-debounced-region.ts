import { useEffect, useState } from 'react';
import { VIEWPORT_DEBOUNCE_MS, type MapRegion } from '@arbolapp/core';

/**
 * The region the map settled on, rather than every region it passed through.
 *
 * A pan reports a continuous stream of positions. Querying each one would spend
 * a rural connection on answers that are stale before they arrive, so the
 * region is only published once the map has been still for a moment.
 *
 * This is a timer over an external signal, not state derived from a prop, which
 * is why it is an effect: there is no way to compute "has stopped moving" during
 * a render.
 */
export function useDebouncedRegion(region: MapRegion | null): MapRegion | null {
  const [settled, setSettled] = useState<MapRegion | null>(region);

  useEffect(() => {
    if (region === null) {
      return;
    }

    const timer = setTimeout(() => setSettled(region), VIEWPORT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [region]);

  return settled;
}
