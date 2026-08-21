import { StyleSheet, View } from 'react-native';
import { colorByTrackingStatus, type TrackingStatus } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { colors, fontSize, radii } from '@/constants/theme';

export type ClusterBubbleProps = {
  count: number;
  status: TrackingStatus;
};

/**
 * A group of trees, drawn as one circle carrying its count.
 *
 * Unlike the tree markers this is a real view rather than a sprite, and that is
 * a deliberate exception: the number inside is different for every group, so it
 * cannot be pre-rendered, and there are only ever a handful of groups on screen
 * -- that is the entire point of grouping. The hundreds of marks that would
 * actually cost frames are the individual trees, and those are bitmaps.
 *
 * It grows with the count so the eye reads weight before it reads the number.
 */
export function ClusterBubble({ count, status }: ClusterBubbleProps) {
  const size = count >= 100 ? 44 : count >= 25 ? 36 : 28;
  const tint = colorByTrackingStatus[status];

  return (
    <View
      style={[
        styles.bubble,
        { width: size, height: size, borderRadius: size / 2, borderColor: tint },
      ]}
    >
      <AppText variant="caption" style={[styles.count, { color: tint }]} numberOfLines={1}>
        {count}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1.5,
    borderRadius: radii.full,
  },
  count: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
