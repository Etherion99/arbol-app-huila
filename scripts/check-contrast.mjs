// Measures the palette, and then measures what the application actually paints
// with it.
//
// Two halves, and the second is the one that catches things. The first walks
// every colour token against the four surfaces and checks the result against the
// rule the token claims for itself. The second walks the pairs the screens
// really render -- this ink, on that ground, at that size -- and fails when one
// of them does not clear AA.
//
// The second half exists because the first was green for weeks while a screen
// showed text at 1.40:1. `warning` was correctly documented as a token that may
// never carry text, and nothing checked whether anything did. A verifier that
// cannot see the problem is worse than no verifier, because it gives permission
// not to look.
//
// The rules live in the docblock of packages/core/src/theme.ts, which is where
// somebody reaching for a colour actually reads. This script is what keeps that
// docblock honest: `EXPECTED` below is the same claim in machine-readable form,
// and the run fails when a measured token stops matching its claim. A hand-kept
// table would go stale the first time anyone nudges a hex; this one cannot.
//
// A token that fails AA is not a bug this script wants fixed. The palette is the
// 2026 branding guide and the design system owns it. The failure is the finding:
// it tells a screen which token may carry small text and which may only be a dot,
// a rule or an icon.
//
// Run with `pnpm test:contrast`.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors, fontSize } from '../packages/core/src/theme.ts';
import { colorVars } from './design-token-names.mjs';
import { EXEMPT, PAIRS, SCANNED, SKIPPED } from './contrast-pairs.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// WCAG 2.1 SC 1.4.3 and 1.4.11.
const SMALL_TEXT = 4.5;
const LARGE_TEXT = 3;

/**
 * The four grounds text can land on. In the 2026 palette three of them are the
 * same white and only the page differs, so most rows come out nearly flat. That
 * is the design, not a broken loop: the dark palette had four distinct greenish
 * greys and every row had four different numbers.
 */
const SURFACES = ['surfacePage', 'surfaceRaised', 'surfaceCard', 'surfaceOverlay'];

/**
 * What each foreground token is allowed to be, and what the docblock promises:
 *
 * - `small` — clears 4.5:1 everywhere. Any text, any size.
 * - `large` — clears 3:1 but not 4.5:1. Large text, icons, dots, rules, borders.
 * - `none`  — under 3:1. A fill or a decoration, never a foreground.
 *
 * The surface tokens are absent on purpose: they are the ground, not the ink.
 * The `*Soft` fills are alpha and are measured further down, over each surface.
 */
const EXPECTED = {
  // Brand, as the 2026 guide names them.
  huilaGreen: 'large',
  platenoOrange: 'large',
  sunYellow: 'none',
  ripeRed: 'small',
  riverBlue: 'large',
  earthBrown: 'small',
  leafWhite: 'none',
  ink: 'small',
  slateGrey: 'large',

  // Base ramp.
  green990: 'small',
  green950: 'small',
  green900: 'small',
  green850: 'large',
  green800: 'none',
  green700: 'none',

  // Borders. Judged at 3:1, the bar SC 1.4.11 sets for a control boundary; the
  // two decorative ones do not reach it and are not meant to.
  borderSubtle: 'none',
  borderStrong: 'none',
  borderFocus: 'large',

  // Verde Huilense ramp.
  emerald300: 'none',
  emerald400: 'none',
  emerald500: 'large',
  emerald600: 'small',
  emerald700: 'small',
  emerald900: 'small',

  // Accents.
  accent: 'large',
  accentStrong: 'large',
  accentPressed: 'small',
  onAccent: 'none',
  accent2: 'large',
  onAccent2: 'none',

  // Juventud en línea. Affiliation only, but the microlabel is still text.
  brandMagenta: 'large',
  brandYellow: 'none',

  // Tree states.
  stateOk: 'large',
  stateDue: 'none',
  stateOverdue: 'large',
  stateDead: 'small',
  stateArchived: 'large',

  // Feedback.
  success: 'large',
  warning: 'none',
  danger: 'small',
  info: 'large',

  // Text.
  textPrimary: 'small',
  textSecondary: 'small',
  textMuted: 'large',
  textInverse: 'none',
  textLink: 'small',
  textLinkHover: 'large',
};

/**
 * Solid fills that carry a label, each with the two inks worth trying. White and
 * ink are the only two the palette offers, so a fill that fails both needs a
 * different fill, which is a decision for the design system and not for a screen.
 */
const FILLS = [
  ['accent', 'the primary button'],
  ['accentStrong', 'the primary button, hovered'],
  ['accentPressed', 'the primary button, pressed'],
  ['accent2', 'the secondary accent'],
  ['stateOk', 'a solid up-to-date chip'],
  ['stateDue', 'a solid due-soon chip'],
  ['stateOverdue', 'a solid overdue chip'],
  ['stateDead', 'a solid dead chip'],
  ['stateArchived', 'a solid archived chip'],
];

/** The inks a fill or a soft badge can reach for, best first. */
const INKS = ['onAccent', 'textPrimary', 'textSecondary', 'earthBrown', 'green950'];

/** The translucent badge fills, and the state colour each one belongs to. */
const SOFT_FILLS = [
  ['accentSoft', 'accent'],
  ['accent2Soft', 'accent2'],
  ['stateOkSoft', 'stateOk'],
  ['stateDueSoft', 'stateDue'],
  ['stateOverdueSoft', 'stateOverdue'],
  ['stateDeadSoft', 'stateDead'],
  ['stateArchivedSoft', 'stateArchived'],
  ['brandMagentaSoft', 'brandMagenta'],
  ['brandYellowSoft', 'brandYellow'],
  ['dangerSoft', 'danger'],
  ['infoSoft', 'info'],
];

function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 };
  }

  const rgba = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgba) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
      alpha: Number(rgba[4]),
    };
  }

  throw new Error(`Unrecognised colour: ${value}`);
}

/**
 * A translucent fill has no contrast of its own — what a reader sees is the fill
 * already blended with whatever is behind it. Browsers and React Native both
 * blend in plain sRGB, so this does too, and the result is a solid colour the
 * ratio formula can take.
 */
function composite(over, under) {
  const top = parseColor(over);
  const bottom = parseColor(under);
  return {
    rgb: top.rgb.map((channel, index) =>
      Math.round(channel * top.alpha + bottom.rgb[index] * (1 - top.alpha)),
    ),
    alpha: 1,
  };
}

/**
 * WCAG 2.1 relative luminance. The 0.04045 knee and the 2.4 exponent are the
 * ones the specification gives; rounding either shifts every ratio in the table
 * by a hundredth or two, which is enough to move a token across 4.5.
 */
function luminance({ rgb }) {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function tierOf(ratio) {
  if (ratio >= SMALL_TEXT) return 'small';
  if (ratio >= LARGE_TEXT) return 'large';
  return 'none';
}

const MARK = { small: 'AA', large: 'large', none: '--' };

function ratioCell(ratio) {
  return ratio.toFixed(2).padStart(6);
}

console.log('ÁrbolApp Huila — the 2026 palette against WCAG 2.1 AA');
console.log('Tokens read from packages/core/src/theme.ts.\n');
console.log(
  `Small text needs ${SMALL_TEXT}:1. Large text, icons, dots and control ` +
    `borders need ${LARGE_TEXT}:1.`,
);
console.log(
  `Large text is 24px regular or 18.66px bold, so in this scale it starts at ` +
    `fontSize.xl (${fontSize.xl}) regular or fontSize.lg (${fontSize.lg}) bold. ` +
    `fontSize.md (${fontSize.md}) bold does not qualify.\n`,
);

console.log('## Surfaces\n');
for (const surface of SURFACES) {
  console.log(`  ${surface.padEnd(16)} ${colors[surface]}`);
}
console.log(
  '\n  Three of the four are the same white, so the columns below run nearly ' +
    'flat.\n  Only surfacePage differs, and it is the darker of the two, so it ' +
    'sets the worst case.\n',
);

console.log('## 1 · Foreground tokens on every surface\n');
console.log(
  `${'token'.padEnd(16)} ${'hex'.padEnd(9)} ${SURFACES.map((s) =>
    s.replace('surface', '').toLowerCase().padStart(6),
  ).join(' ')} ${'worst'.padStart(6)}  verdict`,
);
console.log('-'.repeat(78));

const failures = [];

for (const [token, expected] of Object.entries(EXPECTED)) {
  const value = colors[token];
  if (value === undefined) {
    failures.push(`${token} is declared in this script but no longer exists in theme.ts`);
    continue;
  }

  const foreground = parseColor(value);
  const ratios = SURFACES.map((surface) => contrast(foreground, parseColor(colors[surface])));
  const worst = Math.min(...ratios);
  const measured = tierOf(worst);

  if (measured !== expected) {
    failures.push(
      `${token} (${value}) measures ${worst.toFixed(2)}:1 at worst, which is ` +
        `"${measured}", but theme.ts documents it as "${expected}"`,
    );
  }

  console.log(
    `${token.padEnd(16)} ${value.padEnd(9)} ${ratios.map(ratioCell).join(' ')} ` +
      `${ratioCell(worst)}  ${MARK[measured]}${measured === expected ? '' : '  MISMATCH'}`,
  );
}

console.log('-'.repeat(78));

console.log('\n## 2 · Ink on a solid fill\n');
console.log(
  `${'fill'.padEnd(16)} ${'hex'.padEnd(9)} ${'white'.padStart(6)} ${'ink'.padStart(6)}  best ink, and what it carries`,
);
console.log('-'.repeat(78));

for (const [token, role] of FILLS) {
  const fill = parseColor(colors[token]);
  const white = contrast(parseColor(colors.onAccent), fill);
  const ink = contrast(parseColor(colors.textPrimary), fill);
  const best = white >= ink ? 'white' : 'ink';
  const bestRatio = Math.max(white, ink);

  console.log(
    `${token.padEnd(16)} ${colors[token].padEnd(9)} ${ratioCell(white)} ${ratioCell(ink)}  ` +
      `${best.padEnd(5)} ${MARK[tierOf(bestRatio)].padEnd(5)} ${role}`,
  );
}

console.log('-'.repeat(78));
console.log(
  '\n  The `--accent` row is the one that decides component work: the primary\n' +
    '  button is white on Verde Huilense, and neither ink clears small text on it.\n',
);

console.log('## 3 · Ink on a soft badge fill\n');
console.log(
  '  Each soft fill composited over surfacePage — the darker ground, so the\n' +
    '  worst case — then measured against every ink the palette offers.\n',
);
console.log(
  `${'soft fill'.padEnd(18)} ${'blended'.padEnd(9)} ${'own'.padStart(6)} ${INKS.map((i) =>
    i.slice(0, 6).padStart(6),
  ).join(' ')}`,
);
console.log('-'.repeat(78));

const badgeAdvice = [];

for (const [softToken, ownToken] of SOFT_FILLS) {
  const blended = composite(colors[softToken], colors.surfacePage);
  const own = contrast(parseColor(colors[ownToken]), blended);
  const inkRatios = INKS.map((ink) => contrast(parseColor(colors[ink]), blended));

  const asHex = `#${blended.rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  console.log(
    `${softToken.padEnd(18)} ${asHex.padEnd(9)} ${ratioCell(own)} ${inkRatios
      .map(ratioCell)
      .join(' ')}`,
  );

  if (own < SMALL_TEXT) {
    const readable = INKS.filter((_, index) => inkRatios[index] >= SMALL_TEXT);
    badgeAdvice.push(
      `${softToken}: its own ${ownToken} reaches only ${own.toFixed(2)}:1 on the ` +
        `blend. Readable ink: ${readable.join(', ') || 'none in the palette'}.`,
    );
  }
}

console.log('-'.repeat(78));
console.log(`\n  Ink columns, in order: ${INKS.join(', ')}.\n`);

console.log('## 4 · Badges whose own colour cannot set their label\n');
for (const line of badgeAdvice) {
  console.log(`  - ${line}`);
}

// ---------------------------------------------------------------------------
// 5 · The pairs the code actually renders
// ---------------------------------------------------------------------------

/**
 * A photograph under the app's standard dark wash.
 *
 * A photograph has no colour this script can know, so the wash is measured over
 * white -- the brightest picture a guardian could take, and therefore the worst
 * case for the pale ink that sits on it. Ink that clears its threshold here
 * clears it over every photograph.
 */
const PHOTO_SCRIM = ['rgba(0, 0, 0, 0.85)', '#FFFFFF'];

/** The colour a background entry names: a token, a literal, or the scrim. */
function valueOf(entry) {
  if (entry === 'PHOTO_SCRIM') return null;
  return colors[entry] ?? entry;
}

/** Resolves a background, which may be a stack of translucent fills. */
function groundOf(background) {
  const stack = (Array.isArray(background) ? background : [background]).flatMap((entry) =>
    entry === 'PHOTO_SCRIM' ? PHOTO_SCRIM : [entry],
  );

  let resolved = parseColor(valueOf(stack[stack.length - 1]));

  // Back to front, so an alpha fill lands on what is really underneath it.
  for (let index = stack.length - 2; index >= 0; index -= 1) {
    resolved = composite(valueOf(stack[index]), toHex(resolved));
  }
  return resolved;
}

function toHex({ rgb }) {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function nameOf(background) {
  return Array.isArray(background) ? background.join(' over ') : background;
}

/**
 * What a pair owes, by what it is.
 *
 * `decoration` is the one that owes nothing, and it is not a loophole: SC
 * 1.4.11 asks 3:1 of non-text content that *conveys information* or bounds a
 * control, and explicitly not of a purely decorative edge. The seam under a
 * shelf and the hairline round a thumbnail well carry nothing — remove them and
 * the screen still says everything it said. A row is only allowed to be
 * `decoration` when whatever it outlines is named in words somewhere else, and
 * the role column has to say what that is.
 */
const REQUIRED = {
  small: SMALL_TEXT,
  large: LARGE_TEXT,
  graphic: LARGE_TEXT,
  decoration: 0,
  exempt: 0,
};

console.log('\n## 5 · The pairs the code actually renders\n');
console.log(
  '  Every row is an ink a component paints on a ground it paints it on, at the\n' +
    '  size it is set at. This is the half that fails a screen rather than a token.\n',
);

const pairFailures = [];
/** Which tokens each file has a measured pair for, so the scan can check coverage. */
const covered = new Map();

for (const group of PAIRS) {
  console.log(`  ${group.file}`);

  // A pair table that names a file nobody has any more is worse than no table:
  // it reads as coverage and measures nothing. This is the check that caught
  // the entries left behind when the queue components were renamed.
  if (!existsSync(join(repoRoot, group.file))) {
    pairFailures.push(`${group.file} is in the pair table and no longer exists`);
    console.log('    (this file is gone — the table is stale)\n');
    continue;
  }

  for (const [foreground, background, size, role] of group.pairs) {
    if (colors[foreground] === undefined) {
      pairFailures.push(
        `${group.file}: the pair table names "${foreground}", which no longer exists`,
      );
      continue;
    }

    const seen = covered.get(group.file) ?? new Set();
    seen.add(foreground);
    covered.set(group.file, seen);

    const ratio = contrast(parseColor(colors[foreground]), groundOf(background));
    const owed = REQUIRED[size];
    const passes = ratio >= owed;

    console.log(
      `    ${foreground.padEnd(16)} on ${nameOf(background).padEnd(28)} ` +
        `${ratioCell(ratio)}  ${size.padEnd(8)} ${passes ? 'ok' : 'FAIL'}  ${role}`,
    );

    if (!passes && EXEMPT[foreground] === undefined) {
      pairFailures.push(
        `${group.file}: ${foreground} on ${nameOf(background)} measures ` +
          `${ratio.toFixed(2)}:1 and owes ${owed}:1 as ${size} — ${role}`,
      );
    }
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// 6 · Coverage: every foreground the code uses has to be measured somewhere
// ---------------------------------------------------------------------------

/** Every source file under a root, ignoring what the repository never reads. */
function sourceFiles(root) {
  const found = [];
  const skip = new Set(['node_modules', '.expo', '.next', 'dist', 'android', 'ios']);

  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      if (skip.has(name) || name.startsWith('.')) continue;
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/\.(ts|tsx)$/.test(name)) {
        found.push(path);
      }
    }
  };

  walk(join(repoRoot, root));
  return found;
}

/** The token a Tailwind fragment resolves to, or null when it is not a colour. */
const tokenByVar = new Map(Object.entries(colorVars).map(([token, name]) => [name, token]));

console.log('## 6 · Foregrounds the code uses that nothing measures\n');
console.log(
  '  Only the ones that need measuring. A token clearing 4.5:1 on every surface\n' +
    '  in the palette is readable wherever it lands, so asking somebody to write\n' +
    '  down where it lands would add a line and no information. What has to be\n' +
    '  declared is a token whose verdict depends on the ground or the size —\n' +
    '  which is every token that does not clear AA on its own.\n',
);

/** The worst this token measures against any of the four surfaces. */
function worstOnSurfaces(token) {
  return Math.min(
    ...SURFACES.map((surface) => contrast(parseColor(colors[token]), parseColor(colors[surface]))),
  );
}

const uncovered = [];

for (const { root, foreground } of SCANNED) {
  for (const path of sourceFiles(root)) {
    const relativePath = relative(repoRoot, path).split('\\').join('/');
    if (SKIPPED[relativePath] !== undefined) continue;

    // Comments are stripped first. Half the colour decisions in this project
    // are argued out in a docblock that names the token it rejected, and a scan
    // that reads those would report every explanation as a use.
    const source = readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

    const seen = covered.get(relativePath) ?? new Set();

    for (const match of source.matchAll(new RegExp(foreground.source, 'g'))) {
      const token = tokenByVar.get(match[1]) ?? (colors[match[1]] === undefined ? null : match[1]);

      // Not a colour token at all: `text-sm`, `border-2`, a Tailwind utility
      // that happens to start with the same prefix.
      if (token === null) continue;
      if (seen.has(token) || EXEMPT[token] !== undefined) continue;

      seen.add(token);
      covered.set(relativePath, seen);

      const worst = worstOnSurfaces(token);
      if (worst >= SMALL_TEXT) continue;

      uncovered.push(
        `${relativePath} paints ${token}, which reaches only ${worst.toFixed(2)}:1 on the ` +
          `${worst < LARGE_TEXT ? 'page and cannot be ink at any size' : 'page and depends on its size'}` +
          `, and no pair in scripts/contrast-pairs.mjs says where it sits`,
      );
    }
  }
}

if (uncovered.length === 0) {
  console.log('  None. Every foreground that needs a ground has one.\n');
} else {
  for (const line of [...new Set(uncovered)]) {
    console.log(`  - ${line}`);
  }
  console.log('');
}

console.log('## Exemptions\n');
for (const [token, why] of Object.entries(EXEMPT)) {
  console.log(`  ${token}: ${why}\n`);
}

console.log('\n' + '='.repeat(78));

if (pairFailures.length > 0 || uncovered.length > 0) {
  console.error(
    `\n${pairFailures.length + uncovered.length} problem(s) in what the code paints:\n`,
  );
  for (const line of [...pairFailures, ...new Set(uncovered)]) {
    console.error(`  - ${line}`);
  }
  console.error(
    '\nA pair under its threshold is a screen somebody cannot read. Fix the pair —\n' +
      'a darker ink from the palette, or a larger size — and never the hex: the\n' +
      'design system owns the palette, and a token that fails AA is escalated.\n' +
      'A foreground nothing measures is added to scripts/contrast-pairs.mjs.',
  );
  process.exit(1);
}

if (failures.length > 0) {
  console.error(
    `\n${failures.length} token(s) no longer match the rules documented in ` +
      `packages/core/src/theme.ts:\n`,
  );
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error(
    '\nEither the token moved or the docblock is stale. Fix whichever is wrong,\n' +
      'and remember the design system owns the palette: a token that fails AA is\n' +
      'a finding to escalate, not a hex to nudge here.',
  );
  process.exit(1);
}

console.log(
  `\nAll ${Object.keys(EXPECTED).length} foreground tokens match the rules ` +
    `documented in packages/core/src/theme.ts.`,
);
