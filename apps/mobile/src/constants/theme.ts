/**
 * Design values every screen consumes. The tokens themselves live in
 * packages/core so the mobile app and the web panel cannot drift apart; this
 * file only adds what is specific to a touch interface.
 */
import { StyleSheet } from 'react-native';

import {
  HIT_TARGET,
  colorByTrackingStatus,
  colors,
  effects,
  fontSize,
  fontWeight,
  lineHeight,
  motion,
  radii,
  spacing,
  tracking,
} from '@arbolapp/core';

export {
  colorByTrackingStatus,
  colors,
  effects,
  fontSize,
  fontWeight,
  lineHeight,
  motion,
  radii,
  spacing,
  tracking,
};

/**
 * Minimum side of any tappable control. Both platforms recommend it and the
 * app is used outdoors, standing up, often with one hand busy holding a branch.
 */
export const MIN_TOUCH_TARGET = HIT_TARGET;

/** Widest a form gets, so the fields do not stretch on a tablet. */
export const MAX_CONTENT_WIDTH = 520;

/**
 * The loaded font faces, one name per family and weight.
 *
 * React Native does not pick a weight out of a family the way CSS does: each
 * weight is its own registered face, and asking for a bold that was never
 * loaded gets a synthetic smear instead. So styles name a face here and never
 * set `fontWeight` alongside it.
 *
 * The names are the exports of `@expo-google-fonts`, which is why they are the
 * one place in the app that does not follow the design system's own naming.
 * Which family serves which size is the design system's rule: display from
 * 26px up, body at 20px and below.
 *
 * Only the faces something renders are listed, and `appFonts` in the root
 * layout registers exactly these. Each typeface is around 120KB in the app, so
 * a weight nobody uses is 120KB a guardian downloads for nothing. Adding one
 * back is two lines: an entry here and an import there.
 */
export const fontFace = {
  displaySemibold: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  bodyRegular: 'Archivo_400Regular',
  bodyMedium: 'Archivo_500Medium',
  bodySemibold: 'Archivo_600SemiBold',
  bodyBold: 'Archivo_700Bold',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

/** Rounds a size against its leading, because a fraction of a point is not a line. */
const leading = (size: number, ratio: number) => Math.round(size * ratio);

/**
 * The type scale of the design system, composed from its size and leading
 * tokens rather than from numbers typed in here. Body text never drops below
 * `fontSize.base`: the app is read outdoors, in direct sun, by people of every
 * age in the vereda.
 */
export const typography = StyleSheet.create({
  display: {
    fontFamily: fontFace.displayBold,
    fontSize: fontSize.xxl,
    lineHeight: leading(fontSize.xxl, lineHeight.tight),
    color: colors.textPrimary,
  },
  title: {
    fontFamily: fontFace.displaySemibold,
    fontSize: fontSize.xl,
    lineHeight: leading(fontSize.xl, lineHeight.snug),
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFace.bodySemibold,
    fontSize: fontSize.lg,
    lineHeight: leading(fontSize.lg, lineHeight.snug),
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFace.bodyRegular,
    fontSize: fontSize.md,
    lineHeight: leading(fontSize.md, lineHeight.normal),
    color: colors.textPrimary,
  },
  // Secondary rather than muted on purpose: the design system's muted grey only
  // reaches 4.01:1 on the page and cannot carry a paragraph read in direct sun.
  bodyMuted: {
    fontFamily: fontFace.bodyRegular,
    fontSize: fontSize.md,
    lineHeight: leading(fontSize.md, lineHeight.normal),
    color: colors.textSecondary,
  },
  label: {
    fontFamily: fontFace.bodySemibold,
    fontSize: fontSize.base,
    lineHeight: leading(fontSize.base, lineHeight.snug),
    color: colors.textPrimary,
  },
  caption: {
    fontFamily: fontFace.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: leading(fontSize.sm, lineHeight.normal),
    color: colors.textSecondary,
  },
  /** Coordinates, measurements, dates and IDs. Always mono, per the design system. */
  data: {
    fontFamily: fontFace.monoMedium,
    fontSize: fontSize.md,
    lineHeight: leading(fontSize.md, lineHeight.normal),
    color: colors.textPrimary,
  },
  /** The uppercase microlabels: vereda, cycle, section headers. */
  overline: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.xs,
    lineHeight: leading(fontSize.xs, lineHeight.normal),
    letterSpacing: fontSize.xs * tracking.wide,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
});
