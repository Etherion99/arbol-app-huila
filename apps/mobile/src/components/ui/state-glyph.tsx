import { StyleSheet, View } from 'react-native';
import { markerShapeByTrackingStatus, type MarkerShape, type TrackingStatus } from '@arbolapp/core';

import { colorByTrackingStatus } from '@/constants/theme';

export type StateGlyphProps = {
  status: TrackingStatus;
  /** Side of the glyph. The badge uses the small one, the legend the map size. */
  size?: number;
};

/**
 * The silhouette of a tracking state, drawn at label size.
 *
 * It is the same second channel the map markers carry, and it is here for the
 * same reason: five states told apart by hue alone are fewer than five states
 * for a guardian who does not separate red from green. The map has bitmaps
 * because it draws hundreds at once; a list draws a handful, so these are plain
 * views and there is no sprite to keep in step.
 *
 * The shape comes from `markerShapeByTrackingStatus` and the colour from
 * `colorByTrackingStatus`, both in packages/core, so a state redrawn on the map
 * is redrawn here without anybody remembering to.
 */
export function StateGlyph({ status, size = 10 }: StateGlyphProps) {
  const { shape, glow } = markerShapeByTrackingStatus[status];
  const color = colorByTrackingStatus[status];

  // The light belongs to the living: a dead or an archived tree is drawn flat,
  // which is the design system's own rule for the map motif.
  const halo = glow ? { boxShadow: `0 0 6px ${color}` } : null;

  return (
    <View
      style={[styles.frame, { width: size, height: size }]}
      // Decoration for a screen reader: the state is always spelled out in the
      // text beside it, so announcing the shape as well would be noise.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {renderShape(shape, size, color, halo)}
    </View>
  );
}

function renderShape(
  shape: MarkerShape,
  size: number,
  color: string,
  halo: { boxShadow: string } | null,
) {
  switch (shape) {
    case 'disc':
      return (
        <View style={[styles.fill, { borderRadius: size / 2, backgroundColor: color }, halo]} />
      );

    case 'diamond':
      // A square turned 45 degrees, scaled back up so it carries the same ink
      // as the disc it sits next to in a legend.
      return (
        <View
          style={[
            styles.fill,
            { backgroundColor: color, transform: [{ rotate: '45deg' }, { scale: 0.78 }] },
            halo,
          ]}
        />
      );

    case 'triangle':
      // Borders rather than a path: a transparent box whose bottom border is
      // the only one painted resolves to a triangle on both platforms.
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size / 2,
            borderRightWidth: size / 2,
            borderBottomWidth: size * 0.88,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            ...(halo ?? {}),
          }}
        />
      );

    case 'cross':
      return (
        <View style={[styles.fill, styles.centre]}>
          <View
            style={[
              styles.bar,
              {
                width: size,
                height: size * 0.3,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.bar,
              {
                width: size,
                height: size * 0.3,
                backgroundColor: color,
                transform: [{ rotate: '-45deg' }],
              },
            ]}
          />
        </View>
      );

    case 'ring':
      return (
        <View
          style={[
            styles.fill,
            {
              borderRadius: size / 2,
              borderWidth: Math.max(2, size * 0.26),
              borderColor: color,
            },
          ]}
        />
      );
  }
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    borderRadius: 1,
  },
});
