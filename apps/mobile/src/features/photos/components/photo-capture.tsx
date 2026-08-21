import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, effects, fontSize, radii, spacing } from '@/constants/theme';
import {
  PhotoTooHeavyError,
  preparePhoto,
  type PreparedPhoto,
} from '@/features/photos/photo-pipeline';

export type PhotoCaptureProps = {
  /** The prepared photograph, once one has been taken. */
  photo: PreparedPhoto | null;
  onCaptured: (photo: PreparedPhoto) => void;
  /** Clears the photograph so the viewfinder comes back. */
  onRetake: () => void;
  /**
   * The previous cycle's photograph, shown as a ghost over the live preview so
   * the series lines up. Null on a planting, and on any cycle whose predecessor
   * could not be loaded.
   */
  ghostUrl?: string | null;
  /** Stamped into the entry when the camera reports no coordinate of its own. */
  fallbackLocation?: { lat: number; lng: number } | null;
  /** Height of the viewfinder. The canvas uses 390 when planting and 420 in the log. */
  height?: number;
};

/**
 * The viewfinder, its ghost overlay, and everything that can go wrong between
 * pressing the shutter and holding a compressed file.
 *
 * The ghost is the reason the growth log is evidence rather than an album. Two
 * photographs of the same tree taken from different angles two months apart say
 * nothing about growth; the same framing twice says everything. So the previous
 * cycle is drawn over the live preview at low opacity and the guardian lines the
 * trunk up before pressing the shutter.
 *
 * The camera is offered rather than the photo library because the photograph is
 * the evidence the whole project rests on. That is a design decision, not the
 * anti-fraud verification -- proving a photograph is live belongs to Phase 8 and
 * nothing here claims to do it.
 */
export function PhotoCapture({
  photo,
  onCaptured,
  onRetake,
  ghostUrl = null,
  fallbackLocation = null,
  height = 390,
}: PhotoCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [failure, setFailure] = useState<{ title: string; body: string } | null>(null);
  const [isGhostVisible, setIsGhostVisible] = useState(true);

  const capture = useCallback(async () => {
    if (cameraRef.current === null || isPreparing) {
      return;
    }

    setIsPreparing(true);
    setFailure(null);

    try {
      // `exif: true` is what makes the capture time real. Without it the only
      // timestamp left would be the upload, and in a vereda those are hours or
      // days apart.
      const captured = await cameraRef.current.takePictureAsync({ exif: true });

      if (captured === undefined) {
        throw new Error('the camera returned no picture');
      }

      onCaptured(await preparePhoto(captured, fallbackLocation));
    } catch (error) {
      setFailure(
        error instanceof PhotoTooHeavyError
          ? { title: texts.photo.tooHeavyTitle, body: texts.photo.tooHeavyBody }
          : { title: texts.photo.prepareFailedTitle, body: texts.photo.prepareFailedBody },
      );
    } finally {
      setIsPreparing(false);
    }
  }, [fallbackLocation, isPreparing, onCaptured]);

  // The permission has not been read yet. Nothing is claimed either way until
  // it has, because a denial notice that flashes on every mount teaches people
  // to dismiss it without reading.
  if (permission === null) {
    return <View style={[styles.frame, { height }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.frame, styles.centred, { height }]}>
        <AppText variant="subtitle" style={styles.deniedTitle}>
          {texts.photo.permissionTitle}
        </AppText>
        <AppText variant="bodyMuted" style={styles.deniedBody}>
          {texts.photo.permissionBody}
        </AppText>

        {/* Two different dead ends need two different ways out: the system will
            still ask, or it will not and only the settings app can undo it. */}
        {permission.canAskAgain ? (
          <Button label={texts.photo.permissionAllow} onPress={() => void requestPermission()} />
        ) : (
          <Button
            label={texts.photo.permissionSettings}
            onPress={() => void Linking.openSettings()}
            variant="secondary"
          />
        )}
      </View>
    );
  }

  if (photo !== null) {
    return (
      <View style={styles.stack}>
        <View style={[styles.frame, { height }]}>
          <Image
            source={{ uri: photo.photoUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel={texts.a11y.photoPreview}
          />

          <View style={styles.readyPill}>
            <AppText variant="caption" style={styles.readyLabel}>
              {texts.photo.ready(Math.round(photo.photoBytes / 1024))}
            </AppText>
          </View>
        </View>

        <Button
          label={texts.photo.retake}
          onPress={() => {
            setFailure(null);
            onRetake();
          }}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <View style={[styles.frame, { height }]}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="picture" />

        {ghostUrl !== null && isGhostVisible ? (
          <Image
            source={{ uri: ghostUrl }}
            style={[StyleSheet.absoluteFill, styles.ghost]}
            contentFit="cover"
            // Purely an alignment aid over a live preview. A screen reader user
            // is not framing by eye, and announcing it would only get in the way
            // of the shutter.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : null}

        {ghostUrl !== null ? (
          <>
            <View style={styles.hint} pointerEvents="none">
              <AppText variant="caption" style={styles.hintLabel}>
                {texts.growthLog.ghostHint}
              </AppText>
            </View>

            <Pressable
              onPress={() => setIsGhostVisible((current) => !current)}
              accessibilityRole="switch"
              accessibilityState={{ checked: isGhostVisible }}
              accessibilityLabel={
                isGhostVisible ? texts.growthLog.ghostToggleOff : texts.growthLog.ghostToggleOn
              }
              style={({ pressed }) => [styles.ghostToggle, pressed && styles.pressed]}
            >
              <View style={[styles.ghostDot, isGhostVisible && styles.ghostDotOn]} />
              <AppText variant="caption" style={styles.ghostBadge}>
                {texts.growthLog.ghostBadge}
              </AppText>
            </Pressable>
          </>
        ) : null}

        <View style={styles.shutterRow} pointerEvents="box-none">
          <Pressable
            onPress={() => void capture()}
            disabled={isPreparing}
            accessibilityRole="button"
            accessibilityLabel={texts.photo.shutter}
            accessibilityState={{ disabled: isPreparing, busy: isPreparing }}
            style={({ pressed }) => [styles.shutter, pressed && styles.pressed]}
          >
            {isPreparing ? <ActivityIndicator color={colors.textPrimary} /> : null}
          </Pressable>
        </View>
      </View>

      {isPreparing ? (
        <AppText variant="caption" style={styles.status} accessibilityLiveRegion="polite">
          {texts.photo.preparing}
        </AppText>
      ) : (
        <AppText variant="caption" style={styles.status}>
          {texts.photo.compressNote}
        </AppText>
      )}

      {failure !== null ? (
        <Notice
          tone="error"
          title={failure.title}
          message={failure.body}
          onRetry={() => setFailure(null)}
          retryLabel={texts.common.close}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[2],
  },
  frame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.green800,
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  deniedTitle: {
    textAlign: 'center',
  },
  deniedBody: {
    textAlign: 'center',
  },
  // Low enough to line a trunk up against, high enough to see under sunlight.
  ghost: {
    opacity: 0.28,
  },
  hint: {
    position: 'absolute',
    top: spacing[3],
    alignSelf: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: 'rgba(7, 14, 12, 0.85)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
  },
  hintLabel: {
    color: colors.textPrimary,
  },
  ghostToggle: {
    position: 'absolute',
    right: spacing[3],
    top: spacing[3] + MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    backgroundColor: 'rgba(21, 37, 31, 0.85)',
    borderWidth: 1,
    borderColor: colors.emerald600,
    borderRadius: radii.md,
  },
  ghostDot: {
    width: 14,
    height: 14,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.emerald400,
  },
  ghostDotOn: {
    backgroundColor: colors.emerald400,
  },
  ghostBadge: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  shutterRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[4],
    alignItems: 'center',
  },
  shutter: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  readyPill: {
    position: 'absolute',
    left: spacing[3],
    bottom: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: 'rgba(7, 14, 12, 0.85)',
    borderRadius: radii.full,
    boxShadow: effects.shadowCard,
  },
  readyLabel: {
    color: colors.accent,
  },
  status: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
