/**
 * Single entry point for the design values the admin panel and the public map
 * consume, shared with the mobile app through packages/core.
 *
 * Anything rendered in CSS should prefer the custom properties in
 * design-tokens.css, which are generated from these same tokens. These exports
 * are for the values a component has to compute with, such as the colour of a
 * map marker.
 */
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
} from '@arbolapp/core';
export type { TrackingStatus, TreeStatus, HealthStatus } from '@arbolapp/core';
