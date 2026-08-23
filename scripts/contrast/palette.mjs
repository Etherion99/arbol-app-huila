/**
 * The bridge between a colour value and the name a reader of the code would use
 * for it, on both runtimes.
 *
 * React Native reads the token objects straight out of packages/core, so there
 * the name is simply the key. The web reads custom properties, so the chain from
 * a Tailwind utility to a hex is resolved here by reading the two stylesheets
 * rather than by repeating the mapping: `design-tokens.css` is generated from
 * the same tokens, and `globals.css` is where a utility name is bound to one.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors, fontSize, fontWeight, lineHeight, radii, spacing, tracking } from '../../packages/core/src/theme.ts';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export { colors, fontSize, fontWeight, lineHeight, radii, spacing, tracking };

/**
 * The namespaces a source file imports and then reads a design value out of.
 * Anything not listed here is resolved by following the module graph instead,
 * which is how `typography` and `fontFace` in the mobile app are read.
 */
export const NAMESPACES = { colors, fontSize, fontWeight, lineHeight, radii, spacing, tracking };

/** The four grounds text can land on when nothing nearer sets one. */
export const SURFACES = ['surfacePage', 'surfaceRaised', 'surfaceCard', 'surfaceOverlay'];

const nameByValue = new Map();
for (const [token, value] of Object.entries(colors)) {
  const key = value.toLowerCase();
  if (!nameByValue.has(key)) nameByValue.set(key, []);
  nameByValue.get(key).push(token);
}

/**
 * The tokens that share a value, joined. `#008D46` is `accent`, `stateOk`,
 * `success`, `huilaGreen`, `borderFocus`, `emerald500` and `textLinkHover` all
 * at once, and a report that named only the first would hide which of them a
 * screen actually reached for — so the site's own spelling is kept alongside.
 */
export function tokensFor(value) {
  return nameByValue.get(String(value).toLowerCase()) ?? [];
}

export function describeColor(value, spelling) {
  const tokens = tokensFor(value);
  if (spelling !== undefined && tokens.includes(spelling)) return spelling;
  if (tokens.length > 0) return tokens[0];
  return String(value);
}

/**
 * Every `--name: value` declaration in a stylesheet, in source order, with the
 * last one winning. Both files this reads declare their variables once, and a
 * light-first theme has no cascade to model beyond that: the `.dark` block in
 * globals.css repeats the same bindings on purpose.
 */
function readCustomProperties(path) {
  const source = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = new Map();
  for (const match of source.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    declarations.set(match[1], match[2].trim());
  }
  return declarations;
}

const cssVars = new Map([
  ...readCustomProperties(join(repoRoot, 'apps', 'web', 'src', 'app', 'design-tokens.css')),
  ...readCustomProperties(join(repoRoot, 'apps', 'web', 'src', 'app', 'globals.css')),
]);

/** Follows `var(--a)` chains down to a literal, giving up rather than guessing. */
export function resolveCssVar(name, seen = new Set()) {
  if (seen.has(name)) return undefined;
  seen.add(name);

  const raw = cssVars.get(name);
  if (raw === undefined) return undefined;

  const indirect = raw.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/i);
  if (indirect) return resolveCssVar(indirect[1], seen);

  return raw;
}

/**
 * The colour a Tailwind utility suffix lands on, or `undefined` when the suffix
 * is not a colour at all — which is how `text-sm` and `text-center` are told
 * apart from `text-accent` without a list of exceptions.
 */
export function tailwindColor(suffix) {
  return resolveCssVar(`--color-${suffix}`);
}

/** The size a Tailwind `text-*` suffix lands on, in px. */
export function tailwindFontSize(suffix) {
  const value = resolveCssVar(`--text-${suffix}`);
  if (value === undefined) return undefined;
  const px = value.match(/^([\d.]+)px$/);
  if (px) return Number(px[1]);
  const rem = value.match(/^([\d.]+)rem$/);
  if (rem) return Number(rem[1]) * 16;
  return undefined;
}
