import { motion } from '@/constants/theme';

/**
 * Every duration the map animates with, expressed as a multiple of the design
 * system's own timing tokens rather than as numbers chosen by eye.
 *
 * A camera flight is necessarily longer than a button transition -- moving
 * across a department in 200 ms is a jump cut, not a move -- but it still has to
 * belong to the same rhythm as the rest of the app, so the base token is what it
 * is built from. Change `motion.durationBase` and the whole screen keeps time.
 */
export const mapMotion = {
  /**
   * One direction of the selected marker's pulse. Slow enough to read as
   * breathing rather than blinking.
   */
  selectedPulseMs: motion.durationBase * 2,
  /** How far the selected marker grows at the top of its pulse. */
  selectedPulseScale: 1.14,
  /** Moving to a zone the guardian chose in the filter or the search. */
  zoneFlightMs: motion.durationBase * 3,
  /** Opening a group by zooming into it. */
  clusterFlightMs: motion.durationBase * 2,
  /** The opening move, from the whole department in to the municipality. */
  openingFlightMs: motion.durationBase * 7,
} as const;
