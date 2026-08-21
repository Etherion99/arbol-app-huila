/**
 * Design tokens for ÁrbolApp Huila.
 *
 * These mirror the ÁrbolApp Huila Design System in Claude Design, which is the
 * source of truth for colour. When the two disagree the design system wins and
 * this file is corrected, never the other way round.
 *
 * Every colour the app and the web panel use comes from here, so adopting a
 * change of visual identity means editing one file instead of revisiting every
 * screen.
 *
 * The palette is dark first: a forest at night, with the trees as points of
 * light. Emerald is the functional colour and carries meaning; the magenta and
 * yellow inherited from Juventud en línea are brand accents with a fenced off
 * territory, and the magenta never enters the map or the tree states, because
 * it would stop the legend being readable.
 */

export const colors = {
  // ----- Tree states, which are the legend of the map -----
  /** Up to date: the log was updated within the two-month cycle. */
  active: '#3DDC97',
  /** Waiting for its photo: the cycle is about to expire. */
  needsUpdate: '#FFD23F',
  /**
   * Past due. A colour of its own, not shared with `needsUpdate`: the reminder
   * escalation runs from day 0 to day +30 and the map has to show the
   * difference between a tree that is due soon and one nobody has visited.
   */
  overdue: '#FF8A3D',
  /** Archived tree, or one left without a guardian. */
  archived: '#66796F',
  /** Tree reported as dead. */
  dead: '#F0567A',

  // ----- Surfaces -----
  /** Dark map background, so markers read as points of light. */
  mapBackground: '#0B1512',
  background: '#0B1512',
  /** Raised panels: cards, sheets, the tab bar. */
  surface: '#15251F',
  /** One step above the page, below a card. */
  surfaceRaised: '#101D18',
  border: '#22352D',
  borderStrong: '#31473D',

  // ----- Text -----
  text: '#E9F4EE',
  /**
   * Secondary text. The design system also carries a dimmer `#66796F`, which
   * only reaches 4.01:1 on the page and is reserved for the archived state; a
   * paragraph read in direct sun uses this one, at 8.9:1.
   */
  textMuted: '#A3B8AE',
  /** Ink for anything sitting on the emerald or the amber. */
  textOnLight: '#06231A',
  link: '#5CE8AC',

  // ----- Actions and feedback -----
  primary: '#3DDC97',
  primaryDark: '#22B377',
  danger: '#F0567A',
  /** Error and warning text. Both clear AA on the page and on a card. */
  dangerText: '#F0567A',
  warningText: '#FFD23F',
  info: '#4DB8FF',

  // ----- Juventud en línea, brand only -----
  /** Affiliation microlabel on the splash, the intro and the about screen. */
  brandMagenta: '#E93CAC',
  brandYellow: '#FFD23F',
} as const;

/** Marker colour for each tracking status. Five states, five colours. */
export const colorByTrackingStatus = {
  up_to_date: colors.active,
  due_soon: colors.needsUpdate,
  overdue: colors.overdue,
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
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

/** Minimum side of any tappable control, on every platform. */
export const HIT_TARGET = 44;

export type ColorKey = keyof typeof colors;
