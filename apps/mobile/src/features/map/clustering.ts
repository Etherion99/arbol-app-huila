import {
  CLUSTER_ZOOM,
  clusterCellSize,
  type TrackingStatus,
  type TreeMarker,
} from '@arbolapp/core';

/**
 * A group of trees drawn as one circle carrying its count.
 *
 * `dominantStatus` is what colours it, and it is the worst state in the group
 * rather than the most common one: a circle of forty trees where one is overdue
 * has to look like something needs doing, or grouping would hide exactly the
 * thing the map exists to surface.
 */
export type TreeCluster = {
  id: string;
  lng: number;
  lat: number;
  count: number;
  dominantStatus: TrackingStatus;
};

export type MapMarks =
  | { kind: 'trees'; trees: TreeMarker[] }
  | { kind: 'clusters'; clusters: TreeCluster[] };

/**
 * Worst first. A group takes the colour of the most urgent tree in it.
 * Archived never reaches the map, and dead is not urgency -- a dead tree needs
 * nothing from its guardian -- so it sits below the two states that do.
 */
const STATUS_PRIORITY: TrackingStatus[] = ['overdue', 'due_soon', 'dead', 'up_to_date', 'archived'];

function worseStatus(a: TrackingStatus, b: TrackingStatus): TrackingStatus {
  return STATUS_PRIORITY.indexOf(a) <= STATUS_PRIORITY.indexOf(b) ? a : b;
}

/**
 * Groups the markers for a zoom level, or hands them back untouched when the
 * map is close enough that every tree is worth its own dot.
 *
 * Grouping happens on a fixed grid rather than by distance between points. Two
 * trees fall in the same cell because of where they are, never because of where
 * the camera is, so panning does not make the groups reshuffle under the
 * guardian's thumb -- which is what a distance based clusterer does, and what
 * makes a map feel broken even when the counts are right.
 */
export function clusterMarkers(trees: TreeMarker[], zoom: number): MapMarks {
  if (zoom >= CLUSTER_ZOOM.individualMarkers) {
    return { kind: 'trees', trees };
  }

  const cell = clusterCellSize(zoom);
  const cells = new Map<
    string,
    { lngSum: number; latSum: number; count: number; status: TrackingStatus }
  >();

  for (const tree of trees) {
    const column = Math.floor(tree.lng / cell);
    const row = Math.floor(tree.lat / cell);
    const key = `${column}:${row}`;
    const existing = cells.get(key);

    if (existing === undefined) {
      cells.set(key, {
        lngSum: tree.lng,
        latSum: tree.lat,
        count: 1,
        status: tree.trackingStatus,
      });
      continue;
    }

    existing.lngSum += tree.lng;
    existing.latSum += tree.lat;
    existing.count += 1;
    existing.status = worseStatus(existing.status, tree.trackingStatus);
  }

  const clusters: TreeCluster[] = [];

  for (const [key, cellData] of cells) {
    clusters.push({
      id: key,
      // The centre of mass, not the centre of the cell, so a group sits on its
      // trees instead of floating on the grid. A cell holding a single tree
      // therefore lands exactly on it.
      lng: cellData.lngSum / cellData.count,
      lat: cellData.latSum / cellData.count,
      count: cellData.count,
      dominantStatus: cellData.status,
    });
  }

  return { kind: 'clusters', clusters };
}
