import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';
import { formatShortDate } from '@/lib/dates';

export type HeightPoint = {
  capturedAt: string;
  heightCm: number;
};

export type HeightChartProps = {
  /** Oldest first, which is the order a growth curve reads in. */
  points: HeightPoint[];
  height?: number;
};

/**
 * Height against time, drawn with plain views.
 *
 * There is no SVG library in this project and this chart is not a reason to add
 * one: a growth log is six points a year, and a polyline of six segments is six
 * rotated rectangles. Each segment is positioned at its start point, given the
 * length of the hypotenuse and rotated by the angle between the two -- which is
 * exactly what a line is -- so the result is the same picture the canvas draws
 * without a fourth native dependency in a build chain that cannot currently be
 * compiled on this machine.
 *
 * The x axis is time and not the index. A guardian who missed a cycle has a real
 * gap in their series, and spacing the points evenly would draw over precisely
 * the thing the chart exists to show.
 */
export function HeightChart({ points, height = 86 }: HeightChartProps) {
  const [width, setWidth] = useState(0);

  const geometry = useMemo(() => {
    if (points.length < 2 || width === 0) {
      return null;
    }

    const times = points.map((point) => new Date(point.capturedAt).getTime());
    const heights = points.map((point) => point.heightCm);

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);

    // A tree that has not grown between two readings is a flat line, not a
    // division by zero, so a zero span degrades to the middle of the box.
    const timeSpan = maxTime - minTime || 1;
    const heightSpan = maxHeight - minHeight || 1;

    const padding = 8;
    const usableWidth = Math.max(1, width - padding * 2);
    const usableHeight = Math.max(1, height - padding * 2);

    const placed = points.map((point, index) => ({
      x: padding + ((times[index] - minTime) / timeSpan) * usableWidth,
      // Inverted, because a view's y grows downwards and a taller tree goes up.
      y: padding + (1 - (heights[index] - minHeight) / heightSpan) * usableHeight,
      point,
    }));

    const segments = placed.slice(0, -1).map((from, index) => {
      const to = placed[index + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;

      return {
        left: from.x,
        top: from.y,
        length: Math.hypot(dx, dy),
        angle: `${Math.atan2(dy, dx)}rad`,
      };
    });

    return { placed, segments };
  }, [height, points, width]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (points.length < 2) {
    return (
      <View style={[styles.frame, { height }]} onLayout={onLayout}>
        <AppText variant="caption" style={styles.empty}>
          {texts.treeDetail.heightEmpty}
        </AppText>
      </View>
    );
  }

  const last = points[points.length - 1];

  return (
    <View
      style={[styles.frame, { height }]}
      onLayout={onLayout}
      // The picture is announced as a sentence, because a chart nobody can see
      // is a chart that has to be read out.
      accessibilityRole="image"
      accessibilityLabel={texts.treeDetail.heightChartLabel(
        points.length,
        points[0].heightCm,
        last.heightCm,
      )}
    >
      {geometry?.segments.map((segment, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              left: segment.left,
              top: segment.top,
              width: segment.length,
              transform: [{ rotate: segment.angle }],
            },
          ]}
        />
      ))}

      {geometry?.placed.map(({ x, y, point }, index) => {
        const isLast = index === geometry.placed.length - 1;
        return (
          <View
            key={point.capturedAt}
            style={[
              styles.dot,
              isLast && styles.dotLatest,
              { left: x - (isLast ? 4 : 3), top: y - (isLast ? 4 : 3) },
            ]}
          />
        );
      })}

      <AppText variant="caption" style={styles.latest}>
        {last.heightCm}
      </AppText>
      <AppText variant="caption" style={styles.since}>
        {formatShortDate(points[0].capturedAt)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    justifyContent: 'center',
  },
  segment: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.accent,
    // Rotation is about the segment's own start, which is where it is placed.
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  dotLatest: {
    width: 8,
    height: 8,
    backgroundColor: colors.emerald300,
  },
  latest: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontFamily: 'IBMPlexMono_500Medium',
    color: colors.emerald300,
  },
  since: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    fontFamily: 'IBMPlexMono_500Medium',
    color: colors.textSecondary,
  },
  empty: {
    paddingHorizontal: spacing[2],
    textAlign: 'center',
  },
});
