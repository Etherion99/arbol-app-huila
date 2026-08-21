/**
 * Design values every screen consumes. The palette itself lives in
 * packages/core so the mobile app and the web panel cannot drift apart; this
 * file only adds what is specific to a touch interface.
 */
import { StyleSheet } from 'react-native';

import { HIT_TARGET, colors, radii, spacing } from '@arbolapp/core';

export { colors, radii, spacing };

/**
 * Minimum side of any tappable control. Both platforms recommend it and the
 * app is used outdoors, standing up, often with one hand busy holding a branch.
 */
export const MIN_TOUCH_TARGET = HIT_TARGET;

/** Widest a form gets, so the fields do not stretch on a tablet. */
export const MAX_CONTENT_WIDTH = 520;

/**
 * The type scale of the design system. Body text never drops under 15px: the
 * app is read outdoors, in direct sun, by people of every age in the vereda.
 *
 * The families are still the system ones. The design system asks for Bricolage
 * Grotesque, Archivo and IBM Plex Mono, and none of the three is packaged in
 * the repository yet.
 */
export const typography = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 39, fontWeight: '800', color: colors.text },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: colors.text },
  body: { fontSize: 17, lineHeight: 26, fontWeight: '400', color: colors.text },
  bodyMuted: { fontSize: 17, lineHeight: 26, fontWeight: '400', color: colors.textMuted },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.text },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: colors.textMuted },
});
