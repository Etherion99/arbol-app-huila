/**
 * The WCAG 2.1 arithmetic, kept apart from everything that reads source code so
 * the two halves can be reasoned about separately: this file knows nothing about
 * tokens, components or files, and only turns colours into ratios.
 */

/** SC 1.4.3, small text. */
export const SMALL_TEXT = 4.5;

/** SC 1.4.3 large text, and the bar SC 1.4.11 sets for a meaningful graphic. */
export const LARGE_TEXT = 3;

/**
 * Where WCAG's large-text concession begins. 18.66px is 14pt, the point at which
 * the specification allows bold text to drop to 3:1; regular text has to reach
 * 24px. React Native measures in density-independent pixels, which map one to
 * one onto the CSS pixels the specification is written in.
 */
export const LARGE_SIZE = 24;
export const LARGE_BOLD_SIZE = 18.66;
export const BOLD_WEIGHT = 700;

export function parseColor(value) {
  const short = value.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const [r, g, b] = short[1].split('');
    return parseColor(`#${r}${r}${g}${g}${b}${b}`);
  }

  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 };
  }

  const hex8 = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i);
  if (hex8) {
    return { ...parseColor(`#${hex8[1]}`), alpha: Number.parseInt(hex8[2], 16) / 255 };
  }

  const rgba = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgba) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
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
export function composite(over, under) {
  const top = typeof over === 'string' ? parseColor(over) : over;
  const bottom = typeof under === 'string' ? parseColor(under) : under;
  if (top.alpha >= 1) return top;

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
export function luminance(color) {
  const { rgb } = typeof color === 'string' ? parseColor(color) : color;
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

export function tierOf(ratio) {
  if (ratio >= SMALL_TEXT) return 'small';
  if (ratio >= LARGE_TEXT) return 'large';
  return 'none';
}

export function toHex({ rgb }) {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The threshold a pair owes, from the type it is set in.
 *
 * An unknown size is treated as small on purpose. A checker that assumed the
 * generous bar whenever it could not read the size would clear itself of the
 * cases it understands least, which is the failure this whole file exists to
 * stop repeating.
 */
export function requiredRatio({ fontSize, fontWeight }) {
  if (fontSize === undefined) return SMALL_TEXT;
  if (fontSize >= LARGE_SIZE) return LARGE_TEXT;
  if (fontSize >= LARGE_BOLD_SIZE && (fontWeight ?? 400) >= BOLD_WEIGHT) return LARGE_TEXT;
  return SMALL_TEXT;
}

export function describeSize({ fontSize, fontWeight }) {
  if (fontSize === undefined) return 'size unread';
  const weight = fontWeight ?? 400;
  return `${fontSize}px/${weight}`;
}
