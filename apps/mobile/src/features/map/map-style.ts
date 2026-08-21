import { colors } from '@/constants/theme';

/**
 * The night forest, as Google Maps understands it.
 *
 * Every colour comes from the token ramp in packages/core, because the whole
 * point of the dark base is that a tree marker is the brightest thing on the
 * screen. A tile set with its own idea of what green means would put the
 * markers in competition with the landscape and the legend would stop reading.
 *
 * Points of interest are switched off entirely rather than dimmed: a restaurant
 * pin next to a tree marker is a second bright dot that means nothing here.
 */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: colors.green950 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.green990 }] },

  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.borderSubtle }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.textSecondary }],
  },

  // The land itself is one step lighter than the page, which is what gives the
  // map its depth without any element being brighter than a marker.
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: colors.green900 }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: colors.green850 }],
  },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: colors.emerald900 }, { visibility: 'on' }],
  },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: colors.green800 }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: colors.green700 }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.green990 }] },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.textMuted }],
  },
];
