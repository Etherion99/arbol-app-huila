// The CSS custom property each design token becomes.
//
// Its own module, and that is not tidiness. It used to live inside
// `generate-design-tokens.mjs`, and when `check-contrast.mjs` imported it from
// there the import *ran the generator* -- rewriting a committed stylesheet as a
// side effect of measuring contrast. A table of names has no business being
// reachable only through a script that writes files.
//
// Two things read it: the generator, which emits the stylesheet, and the
// contrast checker, which translates a Tailwind class back into the token it
// resolves to. A second copy in either would be how the contrast report starts
// measuring a colour the panel no longer paints.

/**
 * The custom property each colour token becomes. Spelled out rather than
 * derived from the key, because the design system's names are not a mechanical
 * transform of the TypeScript ones and a clever converter would quietly rename
 * a token the day someone adds `emerald1000`.
 */
export const colorVars = {
  huilaGreen: 'huila-green',
  platenoOrange: 'plateno-orange',
  sunYellow: 'sun-yellow',
  ripeRed: 'ripe-red',
  riverBlue: 'river-blue',
  earthBrown: 'earth-brown',
  leafWhite: 'leaf-white',
  ink: 'ink',
  slateGrey: 'slate-grey',
  green990: 'green-990',
  green950: 'green-950',
  green900: 'green-900',
  green850: 'green-850',
  green800: 'green-800',
  green700: 'green-700',
  surfacePage: 'surface-page',
  surfaceRaised: 'surface-raised',
  surfaceCard: 'surface-card',
  surfaceOverlay: 'surface-overlay',
  borderSubtle: 'border-subtle',
  borderStrong: 'border-strong',
  borderFocus: 'border-focus',
  emerald300: 'emerald-300',
  emerald400: 'emerald-400',
  emerald500: 'emerald-500',
  emerald600: 'emerald-600',
  emerald700: 'emerald-700',
  emerald900: 'emerald-900',
  accent: 'accent',
  accentStrong: 'accent-strong',
  accentPressed: 'accent-pressed',
  accentSoft: 'accent-soft',
  onAccent: 'on-accent',
  accent2: 'accent-2',
  accent2Soft: 'accent-2-soft',
  onAccent2: 'on-accent-2',
  brandMagenta: 'jil-magenta',
  brandMagentaSoft: 'jil-magenta-soft',
  brandYellow: 'jil-yellow',
  brandYellowSoft: 'jil-yellow-soft',
  stateOk: 'state-ok',
  stateOkSoft: 'state-ok-soft',
  stateDue: 'state-due',
  stateDueSoft: 'state-due-soft',
  stateOverdue: 'state-overdue',
  stateOverdueSoft: 'state-overdue-soft',
  stateDead: 'state-dead',
  stateDeadSoft: 'state-dead-soft',
  stateArchived: 'state-archived',
  stateArchivedSoft: 'state-archived-soft',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  dangerSoft: 'danger-soft',
  infoSoft: 'info-soft',
  textPrimary: 'text-primary',
  textSecondary: 'text-secondary',
  textMuted: 'text-muted',
  textInverse: 'text-inverse',
  textLink: 'text-link',
  textLinkHover: 'text-link-hover',
};
