/**
 * Single entry point for the design values the screens consume. They live in
 * packages/core so the mobile app and the web panel cannot drift apart.
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
