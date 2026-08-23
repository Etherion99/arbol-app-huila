/**
 * Marker grouping, kept at the path the map screen has always imported from.
 *
 * The implementation moved to `packages/core/src/map.ts` so the performance
 * check could measure the function the app actually calls instead of a copy of
 * it. This file stays because the screen import is correct as it is, and
 * rewriting it would only spread one move across two files.
 */
export { clusterMarkers, type MapMarks, type TreeCluster } from '@arbolapp/core';
