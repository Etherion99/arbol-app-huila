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
 * The palette is light first: leaf-white paper, dark ink, and colour reserved
 * for meaning. Verde Huilense is the primary and carries every affordance;
 * Naranja Plateño is the secondary accent. The magenta and yellow inherited
 * from Juventud en línea are affiliation marks only and never enter the
 * interface, so they cannot compete with the map legend.
 *
 * ## Contrast
 *
 * Every number below is measured, not estimated: `pnpm test:contrast` reads this
 * file and prints the whole table, and it fails the moment a token stops
 * matching the rule written here. If you change a hex, run it.
 *
 * Text is read on two surfaces, not four. `surfacePage` is `#F4FDF4` and the
 * raised, card and overlay surfaces are all plain white, so the page is always
 * the worst case and a ratio that holds there holds everywhere. The figures
 * below are that worst case.
 *
 * ### What "large text" means in this scale
 *
 * WCAG's 3:1 concession starts at 24px regular or 18.66px bold. In the scale
 * below that is `fontSize.xl` (26) regular, or `fontSize.lg` (20) bold. Nothing
 * smaller qualifies — in particular `fontSize.md` (17) bold does **not**, and
 * neither does `base` (15). Treat everything from `md` down as small text.
 *
 * ### Tokens that carry small text anywhere
 *
 * `textPrimary` (16.74:1), `textSecondary` (7.04:1), `textLink` (5.60:1),
 * `earthBrown` (5.78:1), `danger` and `stateDead` (4.54:1), `accentPressed` and
 * `emerald600` (5.60:1), `emerald700`, `emerald900`, `green950`, `green990`.
 *
 * When a text should recede and still be read, use `textSecondary`. It is the
 * only quiet tone in the palette that clears AA, and that is what it is for.
 *
 * ### Tokens for large text, icons, dots, rules and borders only
 *
 * `accent`, `stateOk`, `success`, `textLinkHover`, `borderFocus`, `huilaGreen`
 * and `emerald500` are all `#008D46` at 4.12:1 — a hair under. `textMuted` and
 * `stateArchived` are `#757575` at 4.43:1, also under. `accent2`,
 * `stateOverdue` and `platenoOrange` reach 3.03:1, `info` 3.14:1,
 * `accentStrong` 3.11:1, `brandMagenta` 3.54:1.
 *
 * The green ones are the trap, because 4.12 looks like it passes and does not.
 * `accent` fills a button; it does not set a sentence. That is exactly why
 * `textLink` is the darker `#00753A`.
 *
 * ### Tokens that must never carry text
 *
 * `stateDue`, `warning`, `brandYellow` and `sunYellow` are `#FFD700` at
 * **1.35:1** — below even the 3:1 bar, so not large text either. Yellow is a
 * fill, a dot or a rule, and nothing else. `emerald300`/`green700` (1.63:1),
 * `emerald400`/`green800` (2.42:1), `borderSubtle` (1.19:1) and `borderStrong`
 * (1.52:1) are likewise decoration only; the two borders do not even reach the
 * 3:1 that SC 1.4.11 asks of a control boundary, which is fine for a divider
 * and not fine for the edge of an input.
 *
 * ### Ink on a fill
 *
 * - `onAccent` (white) on `accent` is **4.29:1**. It clears large text and
 *   fails small, and flipping to `textPrimary` does not rescue it (4.06:1).
 *   Neither ink works at the size the primary button actually uses. This is
 *   open as **PD-07** in `PLAN-FIDELIDAD-UI.md`; until design rules on it, do
 *   not invent a third green.
 * - `onAccent2` (white) on `accent2` is 3.15:1, but `textPrimary` on the same
 *   orange is **5.52:1**. Dark ink is the correct ink for Naranja Plateño.
 * - `accentPressed` takes white at 5.82:1, `accentStrong` takes `textPrimary`
 *   at 5.39:1. The two press states want opposite inks.
 * - A solid state chip: `stateDue` takes `textPrimary` (12.41:1),
 *   `stateOverdue` takes `textPrimary` (5.52:1), `stateDead` (4.72:1) and
 *   `stateArchived` (4.61:1) take white, `stateOk` clears neither.
 *
 * ### Ink on a soft fill
 *
 * **No `*Soft` fill can carry its own colour as a label.** All eleven fail once
 * the alpha is composited over the page: the best of them, `dangerSoft`,
 * reaches 3.75:1 and `stateDueSoft` reaches 1.25:1. A badge keeps its colour in
 * the border and the dot and sets its label in `textPrimary` or
 * `textSecondary`, both of which clear AA over every soft fill in the palette.
 * The v2 canvas already draws the yellow badge this way, with `earthBrown` ink.
 */

export const colors = {
  // ----- Brand, 2026 branding guide -----
  // The named palette the guide ships. Every functional token below is drawn
  // from it; these keys exist so a screen can name the brand colour itself when
  // the functional name would be a lie, such as a logo or an illustration.
  huilaGreen: '#008D46',
  platenoOrange: '#F26522',
  sunYellow: '#FFD700',
  ripeRed: '#E31B23',
  riverBlue: '#0097DA',
  earthBrown: '#8B572A',
  leafWhite: '#F4FDF4',
  ink: '#1A1A1A',
  slateGrey: '#757575',

  // ----- Base ramp: leaf paper -----
  // Runs dark to light, so `green990` is the deepest ink green and `green700`
  // the palest wash.
  green990: '#0A2E1B',
  green950: '#00592C',
  green900: '#00753A',
  green850: '#008D46',
  green800: '#3FB877',
  green700: '#7ED9A8',

  // ----- Surfaces -----
  /** The page itself, and the ground the map sits on. */
  surfacePage: '#F4FDF4',
  /** One step above the page: headers, the tab bar, a list section. */
  surfaceRaised: '#FFFFFF',
  /** Cards, sheets and any panel holding its own content. */
  surfaceCard: '#FFFFFF',
  /** Dialogs and menus floating over everything else. */
  surfaceOverlay: '#FFFFFF',

  // ----- Borders -----
  borderSubtle: '#DCEBDF',
  borderStrong: '#B9D4C1',
  /** Keyboard focus. Deliberately the accent, so focus is never ambiguous. */
  borderFocus: '#008D46',

  // ----- Verde Huilense ramp -----
  // The `emerald*` names are kept from the dark palette on purpose: they are
  // referenced across both apps and renaming them would turn a colour change
  // into a repo-wide rewrite. The values are Verde Huilense, light first.
  emerald300: '#7ED9A8',
  emerald400: '#3FB877',
  emerald500: '#008D46',
  emerald600: '#00753A',
  emerald700: '#00592C',
  emerald900: '#0A2E1B',

  // ----- Accent: the primary action -----
  accent: '#008D46',
  accentStrong: '#00A552',
  accentPressed: '#00753A',
  /** Badge and selected-row background. Composites over whatever is behind. */
  accentSoft: 'rgba(0, 141, 70, 0.12)',
  /** Ink for anything sitting on an accent fill. See the contrast note above. */
  onAccent: '#FFFFFF',

  // ----- Naranja Plateño: the secondary accent -----
  accent2: '#F26522',
  accent2Soft: 'rgba(242, 101, 34, 0.14)',
  onAccent2: '#FFFFFF',

  // ----- Juventud en línea, affiliation only -----
  // The affiliation microlabel on the splash, the intro and the about screen.
  // Neither colour is allowed into the interface, nor to mean anything about a
  // tree.
  brandMagenta: '#E93CAC',
  brandMagentaSoft: 'rgba(233, 60, 172, 0.14)',
  brandYellow: '#FFD700',
  brandYellowSoft: 'rgba(255, 215, 0, 0.18)',

  // ----- Tree states, which are the legend of the map -----
  /** Up to date: the log was updated within the two-month cycle. */
  stateOk: '#008D46',
  stateOkSoft: 'rgba(0, 141, 70, 0.14)',
  /** Waiting for its photo: the cycle is about to expire. */
  stateDue: '#FFD700',
  stateDueSoft: 'rgba(255, 215, 0, 0.22)',
  /**
   * Past due. A colour of its own, never shared with `stateDue`: the reminder
   * escalation runs from day 0 to day +30 and the map, the list and the legend
   * all have to show the difference between a tree that is due soon and one
   * nobody has visited.
   */
  stateOverdue: '#F26522',
  stateOverdueSoft: 'rgba(242, 101, 34, 0.16)',
  /** Tree reported as dead. */
  stateDead: '#E31B23',
  stateDeadSoft: 'rgba(227, 27, 35, 0.14)',
  /** Archived tree, or one left without a guardian. Never small text. */
  stateArchived: '#757575',
  stateArchivedSoft: 'rgba(117, 117, 117, 0.16)',

  // ----- Feedback -----
  success: '#008D46',
  warning: '#FFD700',
  danger: '#E31B23',
  info: '#0097DA',
  dangerSoft: 'rgba(227, 27, 35, 0.12)',
  infoSoft: 'rgba(0, 151, 218, 0.12)',

  // ----- Text -----
  textPrimary: '#1A1A1A',
  /** Anything that should recede and still be read. 7.0:1 at worst. */
  textSecondary: '#4A5A50',
  /** Decoration, rules and large labels only. See the contrast note above. */
  textMuted: '#757575',
  /** Ink on a dark or saturated fill. */
  textInverse: '#F4FDF4',
  textLink: '#00753A',
  textLinkHover: '#008D46',
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
 * is recorded in one place; whether a face is actually packaged and registered
 * with `expo-font` is decided in the mobile app, and the trailing `system-ui`
 * entry is what both runtimes fall back to until it is.
 *
 * `subhead` is a role of its own: section headings and subtitles sit between
 * the display face of a title and the body face of a paragraph.
 */
export const fontFamily = {
  display: "'Montserrat', system-ui, sans-serif",
  subhead: "'Open Sans', system-ui, sans-serif",
  body: "'Roboto', system-ui, sans-serif",
  mono: "'Roboto Mono', ui-monospace, monospace",
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
 * The shadows are cast in ink rather than black, at the low opacities a light
 * surface needs: on leaf-white paper a heavy black shadow reads as dirt.
 *
 * `focusRing` is composed from the tokens above rather than from CSS variables,
 * so the native and the web build resolve to the identical two rings.
 */
export const effects = {
  shadowCard: '0 1px 2px rgba(26, 26, 26, 0.06), 0 4px 14px rgba(26, 26, 26, 0.08)',
  shadowOverlay: '0 12px 40px rgba(26, 26, 26, 0.22)',
  /** The halo on a selected map pin. */
  glowAccent: '0 0 0 1px rgba(0, 141, 70, 0.3), 0 0 14px rgba(0, 141, 70, 0.35)',
  /** Legacy name, kept so callers survive the rebrand; it glows orange now. */
  glowMagenta: '0 0 14px rgba(242, 101, 34, 0.4)',
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
