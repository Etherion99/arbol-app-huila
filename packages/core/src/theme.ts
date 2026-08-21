/**
 * Provisional palette for ÁrbolApp Huila.
 *
 * Every color used by the app and the web panel comes from this file, so
 * adopting the final visual identity means editing one file instead of
 * revisiting every screen.
 *
 * The tracking colors are the ones painting the map markers, so the project
 * coordinator can read the health of the whole effort at a glance.
 */

export const colors = {
  /** Tree up to date: its log was updated within the two-month cycle. */
  active: '#2ECC71',
  /** Tree waiting for its photo: the cycle expired. */
  needsUpdate: '#F1C40F',
  /** Archived tree, or one left without a guardian. */
  archived: '#7F8C8D',
  /** Tree reported as dead. */
  dead: '#C0392B',

  /** Dark map background, so markers read as points of light. */
  mapBackground: '#0B1F16',
  background: '#0F172A',
  surface: '#1E293B',
  border: '#334155',

  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textOnLight: '#0F172A',

  primary: '#2ECC71',
  primaryDark: '#27AE60',
  danger: '#E74C3C',
} as const;

/** Marker color for each tracking status. */
export const colorByTrackingStatus = {
  up_to_date: colors.active,
  due_soon: colors.needsUpdate,
  overdue: colors.needsUpdate,
  archived: colors.archived,
  dead: colors.dead,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
} as const;

export type ColorKey = keyof typeof colors;
