/**
 * Domain types for ÁrbolApp Huila, shared by the mobile app and the web panel
 * so both speak the same vocabulary.
 */

/** Status of the tree out in the field. */
export type TreeStatus = 'alive' | 'at_risk' | 'dead' | 'replanted';

/** Health reported by the guardian on each log entry. */
export type HealthStatus = 'healthy' | 'at_risk' | 'sick' | 'dead';

/** Status of the bimonthly update cycle, used to paint the map marker. */
export type TrackingStatus = 'up_to_date' | 'due_soon' | 'overdue' | 'archived' | 'dead';

export type UserRole = 'guardian' | 'coordinator';

export type ZoneType = 'department' | 'municipality' | 'village';

/** How often a guardian is asked to update the growth log. */
export const MONTHS_BETWEEN_UPDATES = 2;

/** Days after the due date on which the guardian is reminded again. */
export const REMINDER_FOLLOW_UP_DAYS = [7, 21] as const;

/** Days after the due date on which the tree is flagged as overdue. */
export const DAYS_UNTIL_OVERDUE = 30;

/**
 * Builds the grouping key for a species name typed by hand, so the per-species
 * count adds up. The text the guardian actually wrote is stored separately and
 * never altered: this key exists only for grouping.
 *
 * `Mandarinos ` and `mandarino` collapse into the same key.
 */
export function normalizeSpecies(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/s$/, '');
}
