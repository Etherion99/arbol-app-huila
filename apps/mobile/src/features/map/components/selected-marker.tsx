import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { MARKER_GEOMETRY, type TrackingStatus } from '@arbolapp/core';

import { mapMotion } from '@/features/map/map-motion';
import { markerSprite } from '@/features/map/marker-sprites';

export type SelectedMarkerProps = {
  status: TrackingStatus;
};

/**
 * The one marker on the map that is allowed to move.
 *
 * Everything else is a still bitmap with `tracksViewChanges` switched off,
 * because a few hundred markers that re-rasterise on every frame is what makes
 * this screen unusable on a mid range Android phone. The selected tree is the
 * single exception the design allows, and it is affordable precisely because
 * there is never more than one of it.
 *
 * The pulse runs on the native driver, so the loop does not compete with the
 * JavaScript thread while the guardian is still panning the map.
 */
export function SelectedMarker({ status }: SelectedMarkerProps) {
  // Lazy state rather than a ref: the value has to survive every render without
  // being rebuilt, and a ref read during render is exactly what it should not be.
  const [scale] = useState(() => new Animated.Value(1));

  // A looping animation is a subscription to something outside React, and it
  // has to be stopped when the marker goes away: a loop left running against an
  // unmounted view keeps a frame callback alive for the rest of the session.
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: mapMotion.selectedPulseScale,
          duration: mapMotion.selectedPulseMs,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: mapMotion.selectedPulseMs,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [scale]);

  return (
    <Animated.Image
      source={markerSprite(status, true)}
      style={[styles.sprite, { transform: [{ scale }] }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  sprite: {
    width: MARKER_GEOMETRY.selectedSpriteSize,
    height: MARKER_GEOMETRY.selectedSpriteSize,
  },
});
