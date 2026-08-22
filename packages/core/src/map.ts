/**
 * Everything both map surfaces agree on: where the map opens, when dots become
 * groups, and how big a marker is drawn.
 *
 * The mobile map and the public web map are two different renderers over the
 * same data, and a threshold that disagrees between them is a bug nobody sees
 * until someone compares two screens. So the numbers live here, once.
 */

import type { TrackingStatus } from './domain';

/** A rectangle of the world, in the order `trees_in_viewport` takes it. */
export type BoundingBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

/** A camera position expressed the way a map library reports it. */
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/**
 * Where the map opens: the whole department, so a guardian sees the project
 * before they see their own vereda, then a move in to La Plata where every
 * tree actually is. The two framings come from the `zones` catalogue, whose
 * centroids the coordinator can correct at any time; these are the fallback
 * for the first paint, before the catalogue has answered.
 */
export const HUILA_FRAMING: MapRegion = {
  latitude: 2.55,
  longitude: -75.55,
  latitudeDelta: 2.2,
  longitudeDelta: 2.2,
};

export const LA_PLATA_FRAMING: MapRegion = {
  latitude: 2.3936,
  longitude: -75.8916,
  latitudeDelta: 0.28,
  longitudeDelta: 0.28,
};

/**
 * Wait after the map stops moving before asking the server for the new
 * viewport. A pan is a stream of regions, not one, and firing on each of them
 * would spend a rural connection on answers that are already stale by the time
 * they land.
 */
export const VIEWPORT_DEBOUNCE_MS = 400;

/**
 * Zoom levels where the map changes what a mark means.
 *
 * Below `MUNICIPALITY_CLUSTERS` the whole department is on screen and single
 * trees would be a smear of overlapping dots, so each municipality shows as one
 * circle carrying its count. Between there and `INDIVIDUAL_MARKERS` the map
 * groups whatever falls in the same grid cell. At or above `INDIVIDUAL_MARKERS`
 * every tree is its own marker, which is the only level where tapping one is a
 * meaningful act.
 *
 * The upper threshold is deliberately one level below the point where
 * `trees_in_viewport` raises its ceiling to a thousand rows, so the map is
 * already showing individual markers by the time the server is willing to send
 * that many.
 */
export const CLUSTER_ZOOM = {
  municipalityClusters: 10,
  // Deliberately the same level the zone catalogue suggests for a vereda, so
  // choosing one in the filter lands on individual trees. Framing a vereda and
  // still being shown a bubble with a number in it would make the filter feel
  // broken.
  individualMarkers: 13,
} as const;

/** How many grouping cells span the screen. */
const CELLS_ACROSS_VIEW = 6;

/**
 * Side of the grouping cell, in degrees, at a given zoom level.
 *
 * It is derived from how much world is on screen at that zoom rather than from
 * a fixed base, so a group always covers about a sixth of the view. A constant
 * that ignores the zoom produces cells wider than the screen at the far out
 * levels, which collapses a whole municipality into one or two bubbles and
 * tells the guardian nothing.
 *
 * Clustering on a fixed grid rather than by distance between points is what
 * keeps a group from jittering while the map moves: a tree falls in a cell
 * because of where it is, never because of where the camera is, so panning does
 * not reshuffle the groups under the guardian's thumb.
 */
export function clusterCellSize(zoom: number): number {
  const degreesOnScreen = 360 / 2 ** Math.max(0, zoom);
  return degreesOnScreen / CELLS_ACROSS_VIEW;
}

/**
 * The silhouette each state is drawn with, which is the map's second channel.
 *
 * It is not decoration. Five states told apart by hue alone are fewer than five
 * states for a guardian who does not separate red from green, and the legend is
 * the whole point of this screen. Every shape is inscribed in the same circle
 * the design system draws, so the silhouettes differ while the "points of
 * light" motif does not change.
 *
 * `glow` marks the states the canvas lifts off the tiles with a bloom of their
 * own colour. Only an archived tree goes without it, because it is out of the
 * active map altogether; a dead tree is still a tree somebody has to find and
 * visit, so it keeps the bloom and the rim like every other live state. This
 * table and `StatusDot`, which draws the same mark as a view, must agree on
 * that, and `StatusDot` gates both on `status !== 'archived'`.
 *
 * The colour is deliberately not repeated here. It already has exactly one
 * home, `colorByTrackingStatus`, and a second table carrying it would be a copy
 * waiting to disagree with the first.
 */
export type MarkerShape = 'disc' | 'diamond' | 'triangle' | 'cross' | 'ring';

export const markerShapeByTrackingStatus: Record<
  TrackingStatus,
  { shape: MarkerShape; glow: boolean }
> = {
  up_to_date: { shape: 'disc', glow: true },
  due_soon: { shape: 'diamond', glow: true },
  overdue: { shape: 'triangle', glow: true },
  dead: { shape: 'cross', glow: true },
  archived: { shape: 'ring', glow: false },
};

/**
 * Marker geometry in density independent pixels, taken from the design system's
 * map motif: a 12 dp mark, a 2 dp white rim that cuts it out of the tile, and a
 * 14 dp glow. The sprite is square and large enough to hold the glow without
 * clipping it.
 */
export const MARKER_GEOMETRY = {
  /** Diameter of the circle every silhouette is inscribed in. */
  markSize: 12,
  /** The cut-out rim, `2px solid var(--surface-raised)` in the design system. */
  rimWidth: 2,
  /** Blur radius of the glow. */
  glowRadius: 14,
  /** Side of the whole sprite. */
  spriteSize: 44,
  /** The selected marker is drawn larger, with a soft ring around it. */
  selectedMarkSize: 20,
  selectedRingWidth: 7,
  selectedGlowRadius: 24,
  selectedSpriteSize: 64,
  /**
   * The densities each sprite is emitted at.
   *
   * React Native picks the variant from the file name suffix and lays the image
   * out at its density independent size, so a marker is 44 dp on every screen
   * and crisp on none of them by accident. Emitting only the 3x file would make
   * the marker three times too big, because there would be no 1x to scale from.
   */
  scales: [1, 2, 3],
} as const;

/**
 * The rim of every marker: `surfaceRaised`, opaque, so the mark is cut out of
 * the map instead of sitting on it.
 *
 * The annotation is the point. The sprite generator and `StatusDot` both have
 * to land on exactly this white, and the generator runs under Node's type
 * stripping, which cannot follow an extensionless import into `theme` — so the
 * value cannot simply be read from `colors` here. Typing it as the token
 * instead makes a drift between the two a compile error rather than a marker
 * that quietly stops matching the dot beside it in the legend.
 */
export const MARKER_RIM_COLOR: (typeof import('./theme').colors)['surfaceRaised'] = '#FFFFFF';

/**
 * How long a signed photograph URL stays valid.
 *
 * Long enough to open the card, look at the photograph and move on to the tree
 * detail without a second round trip; short enough that a link copied out of a
 * log is useless by the time anyone reads it. The bucket is private and this is
 * the only door into it.
 */
export const PHOTO_SIGNED_URL_TTL_SECONDS = 600;

/**
 * Converts a camera region into the bounding box `trees_in_viewport` expects.
 *
 * The deltas a map reports are full widths, not radii, which is the mistake
 * this function exists to stop anyone making twice.
 */
export function regionToBoundingBox(region: MapRegion): BoundingBox {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;

  return {
    minLng: region.longitude - halfLng,
    minLat: region.latitude - halfLat,
    maxLng: region.longitude + halfLng,
    maxLat: region.latitude + halfLat,
  };
}

/**
 * The tile zoom level a region corresponds to.
 *
 * Map libraries report how much world is on screen, while the server reasons in
 * zoom levels, because that is what its row ceiling is keyed on. The 360 is the
 * width of the world in degrees at zoom 0.
 */
export function regionToZoom(region: MapRegion): number {
  const zoom = Math.log2(360 / Math.max(region.longitudeDelta, Number.EPSILON));
  return Math.max(0, Math.min(22, Math.round(zoom)));
}

/** The region that frames a zone, from its centroid and its suggested zoom. */
export function framingForZone(
  centroid: { lng: number; lat: number },
  suggestedZoom: number | null,
): MapRegion {
  // The catalogue may have no zoom yet for a zone the coordinator just created.
  // The village default is the right guess, since that is what most zones are.
  const zoom = suggestedZoom ?? 13;
  const delta = 360 / 2 ** zoom;

  return {
    latitude: centroid.lat,
    longitude: centroid.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}
