// Measures every colour token in packages/core against the four surfaces it can
// land on, and checks the result against the rule the token claims for itself.
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

import { colors, fontSize } from '../packages/core/src/theme.ts';

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

console.log('\n' + '='.repeat(78));

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
