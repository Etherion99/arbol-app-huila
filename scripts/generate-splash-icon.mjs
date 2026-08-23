// Draws the splash logotype from the design system, as a PNG the splash plugin
// can actually use.
//
// ## Why this script exists at all
//
// `expo-splash-screen` paints one background colour and one bitmap. The canvas
// composes the splash out of type: «ÁrbolApp» in Montserrat 800 over «Huila» in
// the secondary accent, «Sembrando vida en La Plata» under it in Open Sans, and
// the affiliation microlabel in mono below that. None of that is expressible in
// the plugin's configuration, which is why `splash-icon.png` stayed byte for
// byte the Expo template logo through seven phases: there was no vector to put
// in its place and no way to typeset one at build time.
//
// So the wordmark is typeset here, from the same Montserrat the app registers
// with `expo-font`, and written out as the bitmap the plugin takes. The colours
// come from `packages/core`, so a change to the palette repaints the splash by
// re-running this rather than by somebody opening an image editor.
//
// The output is committed, because Metro bundles assets and must not depend on
// this script having been run.
//
// ## What it does not do
//
// It does not draw a logo. There is no mark for this project -- the 2026
// branding guide exists as a photograph of a printed page -- and inventing one
// here would be putting a design decision into a build script. What it draws is
// exactly what the canvas draws: the name, set in the project's own typeface,
// in the project's own colours. The day a real mark exists, it replaces this.
//
// Run with `pnpm splash`.

import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors } from '../packages/core/src/theme.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontPath = join(
  repoRoot,
  'node_modules',
  '@expo-google-fonts',
  'montserrat',
  '800ExtraBold',
  'Montserrat_800ExtraBold.ttf',
);
const outputPath = join(repoRoot, 'apps', 'mobile', 'assets', 'images', 'splash-icon.png');

/**
 * How wide the bitmap is drawn, in pixels.
 *
 * `imageWidth` in app.config.js is what the plugin scales it to on the device,
 * and it is measured in points. Drawing at four times that leaves the wordmark
 * sharp on a 3x screen with a pixel to spare, and the file is still a few
 * kilobytes because it is two words of flat colour.
 */
const CANVAS_WIDTH = 1024;

/** Cap height of «ÁrbolApp», in the same pixels. */
const LINE_SIZE = 190;

/** Space between the two lines, as the canvas sets it: tight, at 1.1 leading. */
const LINE_GAP = Math.round(LINE_SIZE * 0.1);

const LINES = [
  { text: 'ÁrbolApp', color: colors.accent },
  { text: 'Huila', color: colors.accent2 },
];

// ---------------------------------------------------------------------------
// Reading the typeface
// ---------------------------------------------------------------------------

/**
 * The parts of a TrueType file this needs, and nothing else.
 *
 * A full font parser is a large thing; what a wordmark needs is four tables.
 * `head` gives the em size and how `loca` is stored, `loca` gives where each
 * glyph starts, `glyf` gives the outlines, `hmtx` gives how far the pen moves
 * afterwards, and `cmap` maps a character to a glyph. Kerning is deliberately
 * not read: Montserrat's `kern` table is empty and its pair adjustments live in
 * `GPOS`, which is a great deal of machinery for two words that do not need it.
 */
function readFont(path) {
  const data = readFileSync(path);
  const tables = new Map();

  const tableCount = data.readUInt16BE(4);
  for (let index = 0; index < tableCount; index += 1) {
    const record = 12 + index * 16;
    const tag = data.toString('ascii', record, record + 4);
    tables.set(tag, { offset: data.readUInt32BE(record + 8) });
  }

  const head = tables.get('head').offset;
  const unitsPerEm = data.readUInt16BE(head + 18);
  const indexToLocFormat = data.readInt16BE(head + 50);
  const numGlyphs = data.readUInt16BE(tables.get('maxp').offset + 4);
  const numberOfHMetrics = data.readUInt16BE(tables.get('hhea').offset + 34);

  return { data, tables, unitsPerEm, indexToLocFormat, numGlyphs, numberOfHMetrics };
}

/**
 * Character to glyph index, through the format 4 subtable.
 *
 * Format 4 is the one every modern font ships for the Basic Multilingual Plane,
 * and it is all this needs: the wordmark is Latin letters and one Á.
 */
function buildCharacterMap(font) {
  const { data, tables } = font;
  const cmap = tables.get('cmap').offset;
  const subtableCount = data.readUInt16BE(cmap + 2);

  let best = null;
  for (let index = 0; index < subtableCount; index += 1) {
    const record = cmap + 4 + index * 8;
    const platform = data.readUInt16BE(record);
    const encoding = data.readUInt16BE(record + 2);
    const offset = cmap + data.readUInt32BE(record + 4);
    if (data.readUInt16BE(offset) !== 4) continue;
    // Windows Unicode BMP first, then anything else that is format 4.
    if (best === null || (platform === 3 && encoding === 1)) best = offset;
  }

  if (best === null) throw new Error('the font has no format 4 character map');

  const segCount = data.readUInt16BE(best + 6) / 2;
  const endAt = best + 14;
  const startAt = endAt + segCount * 2 + 2;
  const deltaAt = startAt + segCount * 2;
  const rangeAt = deltaAt + segCount * 2;

  return (codePoint) => {
    for (let segment = 0; segment < segCount; segment += 1) {
      const end = data.readUInt16BE(endAt + segment * 2);
      if (codePoint > end) continue;

      const start = data.readUInt16BE(startAt + segment * 2);
      if (codePoint < start) return 0;

      const delta = data.readInt16BE(deltaAt + segment * 2);
      const rangeOffset = data.readUInt16BE(rangeAt + segment * 2);

      if (rangeOffset === 0) return (codePoint + delta) & 0xffff;

      const glyphAt = rangeAt + segment * 2 + rangeOffset + (codePoint - start) * 2;
      const glyph = data.readUInt16BE(glyphAt);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

/** Where a glyph's outline starts and ends inside `glyf`. */
function glyphRange(font, glyphIndex) {
  const { data, tables, indexToLocFormat } = font;
  const loca = tables.get('loca').offset;

  const read = (index) =>
    indexToLocFormat === 0
      ? data.readUInt16BE(loca + index * 2) * 2
      : data.readUInt32BE(loca + index * 4);

  return { start: read(glyphIndex), end: read(glyphIndex + 1) };
}

/** How far the pen moves after drawing a glyph, in font units. */
function advanceWidth(font, glyphIndex) {
  const { data, tables, numberOfHMetrics } = font;
  const hmtx = tables.get('hmtx').offset;
  const index = Math.min(glyphIndex, numberOfHMetrics - 1);
  return data.readUInt16BE(hmtx + index * 4);
}

/**
 * A glyph's contours, in font units, as closed lists of points.
 *
 * TrueType curves are quadratic and stored with the on-curve control points
 * implied: two consecutive off-curve points have an on-curve point exactly
 * halfway between them, which is what the midpoint below reconstructs. The
 * curves are then flattened into line segments, because the filler works on
 * edges and at these sizes sixteen segments is smoother than the pixel grid.
 */
function glyphContours(font, glyphIndex, depth = 0) {
  const { data, tables } = font;
  const { start, end } = glyphRange(font, glyphIndex);

  // An empty range is a blank glyph, which is what a space is.
  if (start === end) return [];

  const glyf = tables.get('glyf').offset + start;
  const contourCount = data.readInt16BE(glyf);

  if (contourCount < 0) {
    // A composite glyph -- Á is A plus an acute accent, which is exactly why
    // this branch has to exist for a Spanish wordmark.
    if (depth > 4) return [];

    const contours = [];
    let cursor = glyf + 10;

    for (;;) {
      const flags = data.readUInt16BE(cursor);
      const componentGlyph = data.readUInt16BE(cursor + 2);
      cursor += 4;

      let dx;
      let dy;
      if (flags & 0x0001) {
        dx = data.readInt16BE(cursor);
        dy = data.readInt16BE(cursor + 2);
        cursor += 4;
      } else {
        dx = data.readInt8(cursor);
        dy = data.readInt8(cursor + 1);
        cursor += 2;
      }

      // Scaling components is legal and Montserrat does not use it, so the
      // transform bytes are skipped rather than applied: applying a transform
      // nobody sets would be code with no way to be right or wrong.
      if (flags & 0x0008) cursor += 2;
      else if (flags & 0x0040) cursor += 4;
      else if (flags & 0x0080) cursor += 8;

      for (const contour of glyphContours(font, componentGlyph, depth + 1)) {
        contours.push(contour.map((point) => ({ x: point.x + dx, y: point.y + dy })));
      }

      if (!(flags & 0x0020)) break;
    }

    return contours;
  }

  const endPoints = [];
  for (let index = 0; index < contourCount; index += 1) {
    endPoints.push(data.readUInt16BE(glyf + 10 + index * 2));
  }

  const pointCount = endPoints[endPoints.length - 1] + 1;
  let cursor = glyf + 10 + contourCount * 2;
  cursor += 2 + data.readUInt16BE(cursor); // instructions, which are not run

  const flags = [];
  while (flags.length < pointCount) {
    const flag = data.readUInt8(cursor);
    cursor += 1;
    flags.push(flag);
    if (flag & 0x08) {
      let repeat = data.readUInt8(cursor);
      cursor += 1;
      while (repeat-- > 0) flags.push(flag);
    }
  }

  const readCoordinates = (shortBit, sameBit) => {
    const values = [];
    let value = 0;
    for (const flag of flags) {
      if (flag & shortBit) {
        const delta = data.readUInt8(cursor);
        cursor += 1;
        value += flag & sameBit ? delta : -delta;
      } else if (!(flag & sameBit)) {
        value += data.readInt16BE(cursor);
        cursor += 2;
      }
      values.push(value);
    }
    return values;
  };

  const xs = readCoordinates(0x02, 0x10);
  const ys = readCoordinates(0x04, 0x20);

  const contours = [];
  let first = 0;

  for (const last of endPoints) {
    const raw = [];
    for (let index = first; index <= last; index += 1) {
      raw.push({ x: xs[index], y: ys[index], onCurve: (flags[index] & 0x01) !== 0 });
    }
    first = last + 1;
    if (raw.length === 0) continue;

    // Rebuild the implied on-curve points, then flatten.
    const points = [];
    for (let index = 0; index < raw.length; index += 1) {
      const current = raw[index];
      const next = raw[(index + 1) % raw.length];
      points.push(current);
      if (!current.onCurve && !next.onCurve) {
        points.push({ x: (current.x + next.x) / 2, y: (current.y + next.y) / 2, onCurve: true });
      }
    }

    const startIndex = points.findIndex((point) => point.onCurve);
    if (startIndex === -1) continue;

    const ordered = [...points.slice(startIndex), ...points.slice(0, startIndex)];
    const flat = [{ x: ordered[0].x, y: ordered[0].y }];

    for (let index = 1; index <= ordered.length; index += 1) {
      const point = ordered[index % ordered.length];

      if (point.onCurve) {
        flat.push({ x: point.x, y: point.y });
        continue;
      }

      const from = flat[flat.length - 1];
      const to = ordered[(index + 1) % ordered.length];
      const SEGMENTS = 16;

      for (let step = 1; step <= SEGMENTS; step += 1) {
        const t = step / SEGMENTS;
        const inverse = 1 - t;
        flat.push({
          x: inverse * inverse * from.x + 2 * inverse * t * point.x + t * t * to.x,
          y: inverse * inverse * from.y + 2 * inverse * t * point.y + t * t * to.y,
        });
      }
      index += 1;
    }

    contours.push(flat);
  }

  return contours;
}

// ---------------------------------------------------------------------------
// Filling
// ---------------------------------------------------------------------------

/** Samples per axis inside one pixel. Four hides the staircase on a curve. */
const SUPERSAMPLE = 4;

/**
 * Fills a set of contours with the non-zero winding rule.
 *
 * Non-zero and not even-odd, because that is what TrueType specifies: the
 * counter of an «o» is a contour wound the other way, and even-odd would fill
 * it in on any glyph where the two happen to overlap.
 */
function fillContours(pixels, width, height, contours, colour, alpha = 1) {
  const edges = [];
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const contour of contours) {
    for (let index = 0; index < contour.length; index += 1) {
      const from = contour[index];
      const to = contour[(index + 1) % contour.length];
      if (from.y === to.y) continue;
      edges.push({ from, to, winding: to.y > from.y ? 1 : -1 });
      minY = Math.min(minY, from.y, to.y);
      maxY = Math.max(maxY, from.y, to.y);
    }
  }

  if (edges.length === 0) return;

  const firstRow = Math.max(0, Math.floor(minY));
  const lastRow = Math.min(height - 1, Math.ceil(maxY));
  const step = 1 / SUPERSAMPLE;
  const coverage = new Float32Array(width);

  for (let row = firstRow; row <= lastRow; row += 1) {
    coverage.fill(0);

    for (let sub = 0; sub < SUPERSAMPLE; sub += 1) {
      const scanY = row + (sub + 0.5) * step;
      const crossings = [];

      for (const edge of edges) {
        const { from, to, winding } = edge;
        const low = Math.min(from.y, to.y);
        const high = Math.max(from.y, to.y);
        if (scanY < low || scanY >= high) continue;
        crossings.push({
          x: from.x + ((scanY - from.y) / (to.y - from.y)) * (to.x - from.x),
          winding,
        });
      }

      if (crossings.length === 0) continue;
      crossings.sort((a, b) => a.x - b.x);

      let winding = 0;
      for (let index = 0; index < crossings.length - 1; index += 1) {
        winding += crossings[index].winding;
        if (winding === 0) continue;

        const spanStart = crossings[index].x;
        const spanEnd = crossings[index + 1].x;

        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const offsetX = (sx + 0.5) * step;
          const from = Math.max(0, Math.ceil(spanStart - offsetX));
          const to = Math.min(width - 1, Math.floor(spanEnd - offsetX));
          for (let column = from; column <= to; column += 1) {
            coverage[column] += 1;
          }
        }
      }
    }

    const denominator = SUPERSAMPLE * SUPERSAMPLE;
    for (let column = 0; column < width; column += 1) {
      const value = (coverage[column] / denominator) * alpha;
      if (value <= 0) continue;
      blend(pixels, (row * width + column) * 4, colour, Math.min(1, value));
    }
  }
}

/** Source over destination, the only blend this needs. */
function blend(target, offset, colour, alpha) {
  const destinationAlpha = target[offset + 3] / 255;
  const outAlpha = alpha + destinationAlpha * (1 - alpha);
  if (outAlpha <= 0) return;

  const channels = [colour.r, colour.g, colour.b];
  for (let channel = 0; channel < 3; channel += 1) {
    target[offset + channel] = Math.round(
      (channels[channel] * alpha + target[offset + channel] * destinationAlpha * (1 - alpha)) /
        outAlpha,
    );
  }
  target[offset + 3] = Math.round(outAlpha * 255);
}

function parseHex(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

// ---------------------------------------------------------------------------
// Typesetting
// ---------------------------------------------------------------------------

const font = readFont(fontPath);
const glyphOf = buildCharacterMap(font);

/** One line's outlines, already scaled and positioned, plus how wide it is. */
function layoutLine(text, size, penX, baselineY) {
  const scale = size / font.unitsPerEm;
  const contours = [];
  let pen = penX;

  for (const character of text) {
    const glyphIndex = glyphOf(character.codePointAt(0));

    for (const contour of glyphContours(font, glyphIndex)) {
      contours.push(
        // The y axis is flipped: TrueType counts up from the baseline and a
        // bitmap counts down from the top.
        contour.map((point) => ({
          x: pen + point.x * scale,
          y: baselineY - point.y * scale,
        })),
      );
    }

    pen += advanceWidth(font, glyphIndex) * scale;
  }

  return { contours, width: pen - penX };
}

// Measured first with the pen at zero, so each line can then be centred.
const measured = LINES.map((line) => layoutLine(line.text, LINE_SIZE, 0, 0));
const widest = Math.max(...measured.map((line) => line.width));

/**
 * The bitmap is only as big as the wordmark, with a small margin.
 *
 * `expo-splash-screen` centres the image on the background colour, so padding
 * the file out to a screen-sized canvas would only make the asset heavier and
 * the mark smaller. The margin exists so the ascender of the Á and the
 * descender of the p are not clipped by a rounding.
 */
const MARGIN = Math.round(LINE_SIZE * 0.22);
const lineHeight = LINE_SIZE + LINE_GAP;
const canvasHeight = MARGIN * 2 + lineHeight * LINES.length;
const canvasWidth = Math.max(CANVAS_WIDTH, Math.ceil(widest) + MARGIN * 2);

const pixels = new Uint8Array(canvasWidth * canvasHeight * 4);

LINES.forEach((line, index) => {
  const { width } = measured[index];
  const penX = (canvasWidth - width) / 2;
  // The baseline sits at the foot of each line's box, minus the descender room
  // the margin already reserves.
  const baselineY = MARGIN + lineHeight * index + LINE_SIZE;

  const laid = layoutLine(line.text, LINE_SIZE, penX, baselineY);
  fillContours(pixels, canvasWidth, canvasHeight, laid.contours, parseHex(line.color));
});

// ---------------------------------------------------------------------------
// Writing the file
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

function encodePng(data, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(data.buffer, y * width * 4, width * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const png = encodePng(pixels, canvasWidth, canvasHeight);
writeFileSync(outputPath, png);

console.log('ÁrbolApp Huila — splash logotype\n');
console.log(`  typeface   Montserrat 800 ExtraBold, from @expo-google-fonts`);
console.log(`  «ÁrbolApp» ${colors.accent}   Verde Huilense`);
console.log(`  «Huila»    ${colors.accent2}   Naranja Plateño`);
console.log(`  canvas     ${canvasWidth} × ${canvasHeight}`);
console.log(`  written    ${outputPath} (${(png.length / 1024).toFixed(1)} KB)\n`);
console.log('  The background colour and the width the plugin scales this to are');
console.log('  in app.config.js, which reads both from the same tokens.\n');
