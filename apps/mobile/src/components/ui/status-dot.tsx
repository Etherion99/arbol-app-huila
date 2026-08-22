import { colorByTrackingStatus, type TrackingStatus } from '@arbolapp/core';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii } from '@/constants/theme';

export type StatusDotProps = {
  status: TrackingStatus;
  /** Side in points. The catalogue's default is 12. */
  size?: number;
  /** Off for a dot inside a dense list, where a glow per row is noise. */
  hasGlow?: boolean;
  /** The halo the map draws around the marker the guardian just tapped. */
  isSelected?: boolean;
  style?: ViewStyle;
};

/** Blur radius of the bloom, as a multiple of the dot. 12pt reads 14, 20 reads 24. */
const BLOOM = 1.2;

/** Spread of the selected halo, as a multiple of the dot. A 20pt marker rings at 7. */
const HALO = 0.35;

/** Opacity of that halo. Light enough to sit over a map tile without hiding it. */
const HALO_ALPHA = 0.18;

/**
 * A tree on the map, and the same mark repeated in the legend, the tree list
 * and the detail header.
 *
 * The glow is not a leftover of the night palette. It survives the flip to
 * leaf-white paper because it never worked as illumination: it is a soft bloom
 * of the state's own colour that widens the mark beyond its 12 points, which
 * is what keeps two neighbouring pins apart over a busy map tile and what
 * tells a live marker from a printed symbol on the map itself. The canvas
 * keeps drawing it in v2, so it stays.
 *
 * What did belong to the night is the ring. It used to be an ink so dark it
 * only made sense over a black ground; the canvas now cuts the marker out of
 * the map with `surfaceRaised` white, and the selected halo is the state's own
 * colour instead of one fixed emerald for every state.
 *
 * An archived tree takes neither: no glow and no ring, exactly as the canvas
 * draws it. It is out of the active map, and both of those marks are there to
 * lift a live tree off the tiles.
 */
export function StatusDot({
  status,
  size = 12,
  hasGlow = true,
  isSelected = false,
  style,
}: StatusDotProps) {
  const color = colorByTrackingStatus[status];
  const isActive = status !== 'archived';
  const isLit = hasGlow && isActive;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderWidth: isActive ? 2 : 0,
          boxShadow: isLit ? glowFor(color, size, isSelected) : undefined,
        },
        style,
      ]}
    />
  );
}

/**
 * The tapped marker keeps the plain bloom and adds a wider ring of its own
 * state colour, so the selection is read without moving the pin and without
 * borrowing a hue from another state.
 */
function glowFor(color: string, size: number, isSelected: boolean): string {
  const bloom = `0 0 ${Math.round(size * BLOOM)}px ${color}`;

  if (!isSelected) {
    return bloom;
  }

  return `0 0 0 ${Math.round(size * HALO)}px ${withAlpha(color, HALO_ALPHA)}, ${bloom}`;
}

/** Turns a `#RRGGBB` token into the `rgba()` the halo needs. */
function withAlpha(hex: string, alpha: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: radii.full,
    // The cut-out that separates the mark from whatever tile is under it.
    borderColor: colors.surfaceRaised,
  },
});
