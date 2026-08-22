import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/theme';

/**
 * The design system's icon set, ported from `ui_kits/mobile/Icons.jsx`.
 *
 * They are stroke drawings on a 24×24 grid, not filled shapes: the stroke width
 * stays at 2 whatever the size, which is what keeps a 16pt icon and a 28pt one
 * looking like the same family. Scaling a stroke with the box would make the
 * small ones spidery and the large ones heavy.
 *
 * The paths are transcribed literally from the design system. If one looks
 * wrong, it is wrong there and gets fixed there, never here.
 */
const PATHS = {
  map: 'M9 3l6 2 6-2v16l-6 2-6-2-6 2V5l6-2zM9 3v16M15 5v16',
  sprout:
    'M7 20h10M12 20c0-4.5 1.5-7 5-8 0 0 .5 4-2 6-1.5 1.2-3 2-3 2zm0 0c0-4.5-1.5-7-5-8 0 0-.5 4 2 6 1.5 1.2 3 2 3 2zM12 12V8c0-3 2-5 5-5 0 0 .5 5-5 5',
  camera:
    'M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z M12 17a4 4 0 100-8 4 4 0 000 8z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-6 8-6s8 2 8 6',
  ruler: 'M3 17L17 3l4 4L7 21l-4-4zM8 12l2 2M11 9l2 2M14 6l2 2',
  locate: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3',
  // `chevL` in the design system. Spelled out here because the name is the API
  // the screens read, and the shorthand only saved bytes in a minified kit.
  chevronLeft: 'M15 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  wifiOff: 'M2 7c6-5 14-5 20 0M6 11c4-3 8-3 12 0M10 15c1.5-1 2.5-1 4 0M12 19v.5',
  calendar:
    'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8 3v4M16 3v4',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
} as const;

export type IconName = keyof typeof PATHS;

export type IconProps = {
  name: IconName;
  /** Side in points. The catalogue draws these at 20. */
  size?: number;
  color?: string;
  /**
   * Names the icon for a screen reader. Leave it out when the icon repeats
   * something already written beside it: announcing «mapa, Mapa» is worse than
   * announcing it once.
   */
  accessibilityLabel?: string;
};

export function Icon({
  name,
  size = 20,
  color = colors.textPrimary,
  accessibilityLabel,
}: IconProps) {
  const isDecorative = accessibilityLabel === undefined;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityRole={isDecorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={isDecorative}
      importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'yes'}
    >
      {/* One Path for the whole string. The web version splits it on every «M»
          and emits a path per subpath; react-native-svg takes the compound
          command directly, and splitting a `d` by hand is how a curve loses its
          starting point. */}
      <Path d={PATHS[name]} />
    </Svg>
  );
}
