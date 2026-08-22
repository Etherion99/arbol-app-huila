import { colors } from '@arbolapp/core';

/**
 * Leaf paper, as Google Maps understands it.
 *
 * The map is the same sheet the rest of the app is printed on: the ground is
 * `surfacePage`, so the tiles and the screen around them read as one surface
 * and a white panel floating over the map still has an edge. Every colour comes
 * from the token ramp in packages/core, because a tile set with its own idea of
 * what green means would put the markers in competition with the landscape and
 * the legend would stop reading.
 *
 * Points of interest stay switched off rather than dimmed, and so do transit,
 * road shields, land parcels and local road labels. That is the one part of
 * this file the light rework did not revisit, because the reasoning never
 * depended on the palette: a restaurant pin next to a tree marker is a second
 * dot that means nothing here. The map answers one question — which tree is
 * where — and anything that does not help answer it is noise a guardian has to
 * look past while standing in direct sun.
 *
 * See packages/mobile/src/features/map/map-style.ts for the complete contrast
 * analysis and reasoning behind each choice.
 */
export const lightMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: colors.surfacePage }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.surfaceRaised }] },

  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.borderStrong }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.textPrimary }],
  },

  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: colors.surfacePage }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: colors.surfaceRaised }],
  },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: colors.borderSubtle }, { visibility: 'on' }],
  },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: colors.surfaceRaised }] },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.borderStrong }],
  },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: colors.borderStrong }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.textMuted }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.riverBlue }] },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.textPrimary }],
  },
];
