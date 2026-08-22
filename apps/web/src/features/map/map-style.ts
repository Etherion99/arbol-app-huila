/**
 * Google Maps style for the web app, matching the mobile map's appearance.
 *
 * This is the exact same style the mobile app uses, so the public map and the
 * guardian's mobile view show the same basemap. A divergence would turn one
 * familiar and one confusing.
 *
 * The map is the same sheet the rest of the interface is printed on: leaf-white
 * paper, dark ink, and colour reserved for meaning. Every colour comes from
 * the theme tokens in packages/core, because a tile set with its own idea of
 * what green means would put the markers in competition with the landscape.
 *
 * See apps/mobile/src/features/map/map-style.ts for the rationale behind each
 * token choice and the contrast measurements that justify them.
 */

import { colors } from '@arbolapp/core';

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
