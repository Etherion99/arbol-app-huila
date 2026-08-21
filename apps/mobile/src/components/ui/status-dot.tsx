import { colorByTrackingStatus, type TrackingStatus } from '@arbolapp/core';
import { StyleSheet, View, type ViewStyle } from 'react-native';

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

/**
 * A tree as a point of light. The map legend, the tree list and the detail
 * header all key off this shape.
 *
 * An archived tree never glows: it is out of the active map, and lighting it
 * up would say the opposite. The catalogue makes the same exception.
 */
export function StatusDot({
  status,
  size = 12,
  hasGlow = true,
  isSelected = false,
  style,
}: StatusDotProps) {
  const color = colorByTrackingStatus[status];
  const isLit = hasGlow && status !== 'archived';

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
          boxShadow: isLit ? glowFor(color, size, isSelected) : undefined,
        },
        style,
      ]}
    />
  );
}

/**
 * The selected halo is the accent at low opacity plus a wider bloom, which is
 * what separates the tapped marker from its neighbours without moving it.
 */
function glowFor(color: string, size: number, isSelected: boolean): string {
  if (isSelected) {
    return `0 0 0 ${Math.round(size / 2)}px rgba(61, 220, 151, 0.18), 0 0 ${size * 1.6}px ${color}`;
  }

  return `0 0 ${size}px ${color}`;
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: 999,
    // Against the night ground, so a dot stays legible over a pale map tile.
    borderWidth: 2,
    borderColor: 'rgba(7, 14, 12, 0.9)',
  },
});
