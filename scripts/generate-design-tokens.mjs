/**
 * Generates the CSS custom properties the web app consumes from the TypeScript
 * tokens in packages/core.
 *
 * React Native needs the tokens as objects and the web needs them as custom
 * properties. Writing both by hand guarantees they drift, so TypeScript is the
 * source and this script is the only thing allowed to produce the stylesheet.
 * The variable names are the ones the design system uses, so a token can be
 * traced from `tokens/colors.css` through here to a screen without guessing.
 *
 * Run with `pnpm tokens`. The output is committed, because the web build reads
 * a plain stylesheet and must not depend on this script having been run.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HIT_TARGET,
  colors,
  effects,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  motion,
  radii,
  spacing,
  tracking,
} from '../packages/core/src/theme.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(repoRoot, 'apps', 'web', 'src', 'app', 'design-tokens.css');

/**
 * The custom property each colour token becomes. Spelled out rather than
 * derived from the key, because the design system's names are not a mechanical
 * transform of the TypeScript ones and a clever converter would quietly rename
 * a token the day someone adds `emerald1000`.
 */
const colorVars = {
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

const fontSizeVars = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  xxl: 'text-2xl',
  xxxl: 'text-3xl',
};

const effectVars = {
  shadowCard: 'shadow-card',
  shadowOverlay: 'shadow-overlay',
  glowAccent: 'glow-accent',
  glowMagenta: 'glow-magenta',
  focusRing: 'focus-ring',
  backdropBlur: 'backdrop-blur',
};

/**
 * Fails the build when a token exists in TypeScript but nobody said what to
 * call it in CSS. Silence here is how the two halves start to diverge.
 */
function mapTokens(tokens, names, group, format = String) {
  return Object.entries(tokens).map(([key, value]) => {
    const name = names[key];
    if (name === undefined) {
      throw new Error(`${group}: token "${key}" has no CSS variable name in ${import.meta.url}`);
    }
    return [name, format(value)];
  });
}

const px = (value) => `${value}px`;
const ms = (value) => `${value}ms`;

const groups = [
  [
    'Base: the forest at night, and the surfaces built from it',
    mapTokens(colors, colorVars, 'colors'),
  ],
  [
    'Spacing, radii and the minimum touch target',
    [
      ...Object.entries(spacing).map(([step, value]) => [`space-${step}`, px(value)]),
      ...Object.entries(radii).map(([key, value]) => [`radius-${key}`, px(value)]),
      ['hit-target', px(HIT_TARGET)],
    ],
  ],
  [
    'Typography',
    [
      ...Object.entries(fontFamily).map(([key, value]) => [`font-${key}`, value]),
      ...mapTokens(fontSize, fontSizeVars, 'fontSize', px),
      ...Object.entries(lineHeight).map(([key, value]) => [`leading-${key}`, String(value)]),
      ...Object.entries(tracking).map(([key, value]) => [`tracking-${key}`, `${value}em`]),
      ...Object.entries(fontWeight).map(([key, value]) => [`weight-${key}`, value]),
    ],
  ],
  [
    'Effects and motion',
    [
      ...mapTokens(effects, effectVars, 'effects'),
      ['ease-out', motion.easeOut],
      ['dur-fast', ms(motion.durationFast)],
      ['dur-base', ms(motion.durationBase)],
    ],
  ],
];

const body = groups
  .map(([title, entries]) => {
    const lines = entries.map(([name, value]) => `  --${name}: ${value};`).join('\n');
    return `  /* ===== ${title} ===== */\n${lines}`;
  })
  .join('\n\n');

const output = `/* Generated by scripts/generate-design-tokens.mjs from packages/core/src/theme.ts.
   Do not edit: run \`pnpm tokens\` instead. The TypeScript tokens are the source,
   so the mobile app and the web panel cannot drift apart. */

:root {
${body}
}
`;

writeFileSync(outputPath, output, 'utf8');

const count = groups.reduce((total, [, entries]) => total + entries.length, 0);
console.log(`Wrote ${count} custom properties to ${outputPath}`);
