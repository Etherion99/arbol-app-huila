/**
 * Design tokens for ÁrbolApp Huila.
 *
 * This file mirrors the ÁrbolApp Huila Design System in Claude Design, which is
 * the source of truth. When the two disagree the design system wins and this
 * file is corrected, never the other way round. The groups and the token names
 * below follow the ones in `tokens/*.css` so a change there can be traced here
 * without guesswork.
 *
 * It is also the single source for both runtimes. React Native reads these
 * objects directly; the web gets the same values as CSS custom properties,
 * generated from this file by `scripts/generate-design-tokens.mjs`. Nothing is
 * transcribed by hand into a stylesheet, because two hand-kept copies drift.
 *
 * The palette is dark first: a forest at night, with the trees as points of
 * light. Emerald is the functional colour and carries meaning; the magenta and
 * yellow inherited from Juventud en línea are brand accents with a fenced off
 * territory, and neither enters the map or the tree states, because it would
 * stop the legend being readable.
 *
 * ## Contrast
 *
 * Measured against the three surfaces a guardian actually reads text on, with
 * the app held at arm's length in direct sun. Everything below clears WCAG AA
 * for small text (4.5:1) except the three cases named here, which are the only
 * restrictions this file imposes on its own tokens:
 *
 * - `textMuted` and `stateArchived` are the same grey `#66796F` and reach only
 *   4.01:1 on the page, 3.74:1 raised and 3.44:1 on a card. They are legal as
 *   a dot, a rule, an icon or large text, and never as small text. Small text
 *   that wants to recede uses `textSecondary`, which clears 7.6:1 everywhere.
 * - `danger` clears AA on the page, raised and card surfaces, but drops to
 *   4.31:1 on `surfaceOverlay`. The design system has no lighter red, so a
 *   dialog over an overlay needs its error text at large size, or on a card.
 * - `brandMagenta` clears AA on the page and raised only. It is a brand accent
 *   on those two surfaces and never a carrier of state.
 */

export const colors = {
  // ----- Base ramp: the forest at night -----
  // The map builds its own background from this ramp, exactly as the design
  // system's map motif does: a radial gradient from green900 out to green990.
  green990: '#070E0C',
  green950: '#0B1512',
  green900: '#101D18',
  green850: '#15251F',
  green800: '#1B2E27',
  green700: '#254036',

  // ----- Surfaces -----
  /** The page itself, and the ground the map sits on. */
  surfacePage: '#0B1512',
  /** One step above the page: headers, the tab bar, a list section. */
  surfaceRaised: '#101D18',
  /** Cards, sheets and any panel holding its own content. */
  surfaceCard: '#15251F',
  /** Dialogs and menus floating over everything else. */
  surfaceOverlay: '#1B2E27',

  // ----- Borders -----
  borderSubtle: '#22352D',
  borderStrong: '#31473D',
  /** Keyboard focus. Deliberately the accent, so focus is never ambiguous. */
  borderFocus: '#3DDC97',

  // ----- Emerald ramp -----
  emerald300: '#8FF2C6',
  emerald400: '#5CE8AC',
  emerald500: '#3DDC97',
  emerald600: '#22B377',
  emerald700: '#178A5C',
  emerald900: '#0E3B2B',

  // ----- Accent: the primary action -----
  accent: '#3DDC97',
  accentStrong: '#5CE8AC',
  accentPressed: '#22B377',
  /** Badge and selected-row background. Composites over whatever is behind. */
  accentSoft: 'rgba(61, 220, 151, 0.14)',
  /** Ink for anything sitting on an accent fill. Clears 9.4:1 on the accent. */
  onAccent: '#06231A',

  // ----- Juventud en línea, brand only -----
  // The affiliation microlabel on the splash, the intro and the about screen.
  // Neither colour is allowed to mean anything about a tree.
  brandMagenta: '#E93CAC',
  brandMagentaSoft: 'rgba(233, 60, 172, 0.16)',
  brandYellow: '#FFD23F',
  brandYellowSoft: 'rgba(255, 210, 63, 0.15)',

  // ----- Tree states, which are the legend of the map -----
  /** Up to date: the log was updated within the two-month cycle. */
  stateOk: '#3DDC97',
  stateOkSoft: 'rgba(61, 220, 151, 0.16)',
  /** Waiting for its photo: the cycle is about to expire. */
  stateDue: '#FFD23F',
  stateDueSoft: 'rgba(255, 210, 63, 0.16)',
  /**
   * Past due. A colour of its own, never shared with `stateDue`: the reminder
   * escalation runs from day 0 to day +30 and the map, the list and the legend
   * all have to show the difference between a tree that is due soon and one
   * nobody has visited.
   */
  stateOverdue: '#FF8A3D',
  stateOverdueSoft: 'rgba(255, 138, 61, 0.16)',
  /** Tree reported as dead. */
  stateDead: '#F0567A',
  stateDeadSoft: 'rgba(240, 86, 122, 0.16)',
  /** Archived tree, or one left without a guardian. Never small text. */
  stateArchived: '#66796F',
  stateArchivedSoft: 'rgba(102, 121, 111, 0.18)',

  // ----- Feedback -----
  success: '#3DDC97',
  warning: '#FFD23F',
  danger: '#F0567A',
  info: '#4DB8FF',
  dangerSoft: 'rgba(240, 86, 122, 0.14)',
  infoSoft: 'rgba(77, 184, 255, 0.14)',

  // ----- Text -----
  textPrimary: '#E9F4EE',
  /** Anything that should recede and still be read. 7.6:1 at worst. */
  textSecondary: '#A3B8AE',
  /** Decoration, rules and large labels only. See the contrast note above. */
  textMuted: '#66796F',
  /** Ink on a light fill. */
  textInverse: '#0B1512',
  textLink: '#5CE8AC',
  textLinkHover: '#8FF2C6',
} as const;

/**
 * Marker colour for each tracking status. Five states, five distinct colours:
 * the map legend is unreadable if two of them collapse into one.
 */
export const colorByTrackingStatus = {
  up_to_date: colors.stateOk,
  due_soon: colors.stateDue,
  overdue: colors.stateOverdue,
  archived: colors.stateArchived,
  dead: colors.stateDead,
} as const;

/**
 * The spacing scale, keyed by the same step numbers the design system uses, so
 * `spacing[4]` here and `--space-4` there are the same 16px.
 */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
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

/**
 * The type families the design system asks for. They are declared so the value
 * is recorded in one place, but no screen may use them yet: the font files are
 * not in the repository and nothing loads them. Until they are packaged and
 * registered with `expo-font`, both apps fall back to the system stack, which
 * is what the trailing `system-ui` entry gives them.
 */
export const fontFamily = {
  display: "'Bricolage Grotesque', system-ui, sans-serif",
  body: "'Archivo', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

/**
 * Body text never drops below `base`: the app is read outdoors, in direct sun,
 * by people of every age in the vereda.
 */
export const fontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 26,
  xxl: 34,
  xxxl: 46,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
} as const;

/**
 * Letter spacing for uppercase labels, in em. CSS takes it as is; React Native
 * measures letter spacing in points, so a native style multiplies it by the
 * font size of the text it is applied to.
 */
export const tracking = {
  wide: 0.08,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
} as const;

/**
 * Shadows and glows as CSS shadow strings. React Native reads the same syntax
 * through its `boxShadow` style prop.
 *
 * `focusRing` is composed from the tokens above rather than from CSS variables,
 * so the native and the web build resolve to the identical two rings.
 */
export const effects = {
  shadowCard: '0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.35)',
  shadowOverlay: '0 8px 40px rgba(0, 0, 0, 0.6)',
  /** A tree as a point of light on the map. */
  glowAccent: '0 0 0 1px rgba(61, 220, 151, 0.35), 0 0 18px rgba(61, 220, 151, 0.35)',
  glowMagenta: '0 0 14px rgba(233, 60, 172, 0.45)',
  focusRing: `0 0 0 2px ${colors.surfacePage}, 0 0 0 4px ${colors.borderFocus}`,
  backdropBlur: 'blur(12px)',
} as const;

/** Durations in milliseconds. */
export const motion = {
  easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  durationFast: 120,
  durationBase: 200,
} as const;

export type ColorKey = keyof typeof colors;
export type SpacingStep = keyof typeof spacing;
