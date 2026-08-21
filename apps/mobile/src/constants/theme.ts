/**
 * Design values every screen consumes. The tokens themselves live in
 * packages/core so the mobile app and the web panel cannot drift apart; this
 * file only adds what is specific to a touch interface.
 */
import { StyleSheet } from 'react-native';

import {
  HIT_TARGET,
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

export { colors, effects, fontSize, fontWeight, lineHeight, motion, radii, spacing, tracking };

/**
 * Minimum side of any tappable control. Both platforms recommend it and the
 * app is used outdoors, standing up, often with one hand busy holding a branch.
 */
export const MIN_TOUCH_TARGET = HIT_TARGET;

/** Widest a form gets, so the fields do not stretch on a tablet. */
export const MAX_CONTENT_WIDTH = 520;

/** Rounds a size against its leading, because a fraction of a point is not a line. */
const leading = (size: number, ratio: number) => Math.round(size * ratio);

/**
 * The type scale of the design system, composed from its size and leading
 * tokens rather than from numbers typed in here. Body text never drops below
 * `fontSize.base`: the app is read outdoors, in direct sun, by people of every
 * age in the vereda.
 *
 * The families are still the system ones. The design system asks for Bricolage
 * Grotesque, Archivo and IBM Plex Mono, and none of the three is packaged in
 * the repository yet.
 */
export const typography = StyleSheet.create({
  display: {
    fontSize: fontSize.xxl,
    lineHeight: leading(fontSize.xxl, lineHeight.tight),
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  title: {
    fontSize: fontSize.xl,
    lineHeight: leading(fontSize.xl, lineHeight.snug),
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.lg,
    lineHeight: leading(fontSize.lg, lineHeight.snug),
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: leading(fontSize.md, lineHeight.normal),
    fontWeight: fontWeight.regular,
    color: colors.textPrimary,
  },
  // Secondary rather than muted on purpose: the design system's muted grey only
  // reaches 4.01:1 on the page and cannot carry a paragraph read in direct sun.
  bodyMuted: {
    fontSize: fontSize.md,
    lineHeight: leading(fontSize.md, lineHeight.normal),
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  label: {
    fontSize: fontSize.base,
    lineHeight: leading(fontSize.base, lineHeight.snug),
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: fontSize.sm,
    lineHeight: leading(fontSize.sm, lineHeight.normal),
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
});
