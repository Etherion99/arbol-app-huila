import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontFace, radii, spacing } from '@/constants/theme';
import type { TimelineEntry } from '@/features/trees/use-tree-detail';
import { formatCoordinates, formatShortDate } from '@/lib/dates';

/** How much black the foot of the viewer ends up carrying. */
const FOOT_VEIL_ALPHA = 0.85;

/**
 * A photograph of the growth log at full size, with what is known about it
 * written underneath.
 *
 * ## Why this screen is dark when the app is not
 *
 * The 2026 identity turned the whole app to paper, and this is the one place
 * the canvas leaves black: the artboard draws the frame at `#000` with the
 * picture floating in it. That is the ordinary exception for a photographic
 * viewer -- a picture shown at full size is looked at against nothing, so the
 * ground gets out of its way -- and it is why every colour in this file runs
 * the opposite direction from the rest of the app.
 *
 * The canvas sets the two lines of the foot in `--text-primary` `#1A1A1A` and
 * `--text-secondary` `#4A5A50`, which are the light theme's inks and cannot be
 * what it means: over its own black foot they measure 1.21:1 and 2.87:1, so
 * the caption it draws would be invisible on the ground it draws it on. It
 * reads as a paste from the light artboards, and the same artboard contradicts
 * it two lines above, where the status bar over the identical ground is set in
 * `--text-inverse`. Both lines follow the status bar instead.
 *
 * `textInverse` is the palette's only ink for a dark ground; there is no quiet
 * variant of it, and borrowing a pale decoration token to dim the second line
 * would put a border colour into a sentence. So the hierarchy the canvas draws
 * with two tints is carried here by size and face alone -- the title at
 * `label`, the data line smaller and on the mono face -- and both are the same
 * white.
 *
 * ## Why the foot is veiled
 *
 * `contentFit="contain"` means the picture keeps its own shape, so a portrait
 * photograph reaches the bottom of the frame and the caption lands on the
 * photograph rather than on the black. Against a bright sky white ink on
 * nothing is about 1.1:1. The canvas anticipates this and backs the foot with
 * `linear-gradient(transparent, rgba(0,0,0,.85))`; with that veil the caption
 * measures 20.20:1 over the darkest photograph a guardian could take and
 * 14.56:1 over a pure white one.
 *
 * The veil is drawn taller than the text it protects and reaches full strength
 * halfway down, the same shape and the same reason as the wash at the foot of
 * the tree cover: a gradient measured where it ends says nothing about ink
 * sitting in the middle of its ramp.
 */
export function PhotoViewer({
  entry,
  code,
  onClose,
  onRetry,
}: {
  entry: TimelineEntry | null;
  code: string;
  onClose: () => void;
  /** Signs the photographs again. A signed link expires while a viewer is open. */
  onRetry: () => void;
}) {
  // The URL that failed rather than a flag, so opening a different entry clears
  // the error by itself instead of through an effect that would render twice.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const photoUrl = entry?.photoUrl ?? null;
  const hasFailed = photoUrl !== null && failedUrl === photoUrl;

  return (
    <Modal
      visible={entry !== null}
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.viewer}>
        {photoUrl !== null && !hasFailed ? (
          <Image
            source={{ uri: photoUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            onError={() => setFailedUrl(photoUrl)}
            accessibilityLabel={texts.treeDetail.viewerPhotoLabel(code, entry?.cycle ?? 0)}
          />
        ) : null}

        {/* A failed photograph is said out loud and never left as a black
            rectangle: in a vereda the signed link expiring mid-visit is the
            normal case. The notice carries its own paper ground, because its
            fills are alphas mixed for a light surface and would disappear
            composited over this one. */}
        {hasFailed ? (
          <View style={styles.errorSlot}>
            <View style={styles.errorCard}>
              <Notice
                tone="error"
                title={texts.treeDetail.viewerErrorTitle}
                message={texts.treeDetail.viewerErrorBody}
                onRetry={() => {
                  setFailedUrl(null);
                  onRetry();
                }}
              />
            </View>
          </View>
        ) : null}

        <SafeAreaView style={styles.bar} edges={['top', 'right']}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={texts.treeDetail.viewerClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <AppText variant="subtitle" style={styles.closeGlyph}>
              ✕
            </AppText>
          </Pressable>
        </SafeAreaView>

        {entry !== null ? (
          <View style={styles.foot} pointerEvents="none">
            <FootVeil />
            <SafeAreaView style={styles.footInner} edges={['bottom']}>
              <AppText variant="label" style={styles.ink}>
                {texts.treeDetail.viewerCaption(code, entry.cycle)}
              </AppText>
              <AppText variant="caption" style={[styles.measures, styles.ink]}>
                {texts.treeDetail.viewerMeasures(
                  formatShortDate(entry.capturedAt),
                  entry.heightCm,
                  entry.captureLocation === null
                    ? texts.treeDetail.viewerCaptureMissing
                    : texts.treeDetail.viewerCapture(
                        formatCoordinates(entry.captureLocation.lat, entry.captureLocation.lng),
                      ),
                )}
              </AppText>
            </SafeAreaView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/** The wash the canvas lays under the foot. SVG because the project has no gradient view. */
function FootVeil() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="viewer-foot-veil" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#000000" stopOpacity={FOOT_VEIL_ALPHA} />
          <Stop offset="1" stopColor="#000000" stopOpacity={FOOT_VEIL_ALPHA} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#viewer-foot-veil)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  /**
   * Black rather than a token. `surfacePage` is the paper the app is written
   * on and would light the room the photograph is looked at in; the canvas
   * draws this one frame at `#000` and there is no token for it, because it is
   * the absence of a surface rather than one of the four.
   */
  viewer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  bar: {
    position: 'absolute',
    right: spacing[3],
    top: 0,
  },
  /**
   * The close control carries its own opaque ground for the same reason the
   * back control on the tree cover does: it sits on a photograph, and a
   * photograph is not a colour anything can be measured against. On white the
   * glyph reads 17.40:1 and the outline 4.61:1 against the disc and 4.56:1
   * against the black around it.
   *
   * The canvas draws it at 38 points and it is 44 here, the minimum side of
   * anything tapped outdoors with one hand holding a branch.
   */
  close: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.slateGrey,
    borderRadius: radii.full,
  },
  closeGlyph: {
    color: colors.textPrimary,
  },
  errorSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  foot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  /**
   * The lead-in is what makes the veil legible rather than decorative: the
   * gradient fills this whole block and only reaches full strength halfway
   * down, so the text has to start below that half. At 64 points of lead over
   * roughly 55 points of caption the first line begins at about 54% of the
   * block, on the finished wash.
   */
  footInner: {
    paddingTop: spacing[16],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[1],
  },
  /** The only pale ink in the app, and the only ground that asks for one. */
  ink: {
    color: colors.textInverse,
  },
  // Mono, because the line is a date, a measurement and a pair of coordinates,
  // and the design system keeps every measured figure on the mono face.
  measures: {
    fontFamily: fontFace.monoMedium,
  },
  pressed: {
    opacity: 0.7,
  },
});
