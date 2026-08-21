import type { ImageURISource } from 'react-native';
import type { TrackingStatus } from '@arbolapp/core';

/**
 * The type both consumers accept: react-native-maps takes a marker image as a
 * bundled asset id or a source object, which is narrower than the union the
 * plain Image component allows.
 */
type MarkerImage = ImageURISource | number;

/**
 * The pre-rendered marker bitmaps, one per tracking state plus its selected
 * variant.
 *
 * Two things about these `require` calls are deliberate:
 *
 * - The paths are literal. Metro resolves `require` at build time, so a path
 *   built from the status string would bundle nothing and the map would come up
 *   with no markers at all.
 * - They are relative rather than aliased. The `@/` alias points at `src`, and
 *   these live in the app's `assets` folder next to the icons, so the alias
 *   would resolve to a directory that does not exist.
 *
 * Only the 1x name is named here. The 2x and 3x files sit beside each one and
 * the renderer picks the right density, which is what makes a marker 44 dp on
 * every screen.
 *
 * Regenerate them with `pnpm sprites` after any change to the state colours or
 * to the marker geometry in packages/core.
 */
const sprites: Record<TrackingStatus, { normal: MarkerImage; selected: MarkerImage }> = {
  up_to_date: {
    normal: require('../../../assets/markers/up-to-date.png'),
    selected: require('../../../assets/markers/up-to-date-selected.png'),
  },
  due_soon: {
    normal: require('../../../assets/markers/due-soon.png'),
    selected: require('../../../assets/markers/due-soon-selected.png'),
  },
  overdue: {
    normal: require('../../../assets/markers/overdue.png'),
    selected: require('../../../assets/markers/overdue-selected.png'),
  },
  dead: {
    normal: require('../../../assets/markers/dead.png'),
    selected: require('../../../assets/markers/dead-selected.png'),
  },
  archived: {
    normal: require('../../../assets/markers/archived.png'),
    selected: require('../../../assets/markers/archived-selected.png'),
  },
};

export function markerSprite(status: TrackingStatus, isSelected: boolean): MarkerImage {
  const pair = sprites[status];
  return isSelected ? pair.selected : pair.normal;
}
