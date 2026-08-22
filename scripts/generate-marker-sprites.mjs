/**
 * Draws the map markers as PNG sprites with the glow already baked in.
 *
 * The map hands each marker to the renderer as one image. The alternative --
 * building every marker out of nested views with a shadow on them -- is what
 * makes a map with a few hundred trees freeze on the mid range Android phones
 * the guardians actually carry: each marker becomes a real view tree that the
 * platform re-rasterises while the map moves. A bitmap is uploaded once.
 *
 * Colours and geometry come from packages/core, never from a literal typed in
 * here, so a change to a tree state repaints the markers by re-running this.
 * The output is committed, because Metro bundles the assets and must not
 * depend on this script having been run.
 *
 * Run with `pnpm sprites`.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colorByTrackingStatus } from '../packages/core/src/theme.ts';
import {
  MARKER_GEOMETRY,
  MARKER_RIM_COLOR,
  markerShapeByTrackingStatus,
} from '../packages/core/src/map.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(repoRoot, 'apps', 'mobile', 'assets', 'markers');

const { markSize, rimWidth, glowRadius, selectedMarkSize, selectedRingWidth, scales } =
  MARKER_GEOMETRY;

/** Samples per axis inside one pixel. Four is enough to hide the staircase. */
const SUPERSAMPLE = 4;

function parseHex(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** The rim token, as the components the blender needs. Opaque, as the canvas draws it. */
const RIM_TINT = parseHex(MARKER_RIM_COLOR);

// ---------------------------------------------------------------------------
// Silhouettes
// ---------------------------------------------------------------------------

/**
 * Signed coverage of each shape at a point, in a space centred on the marker
 * where `radius` is the circle every silhouette is inscribed in.
 *
 * Returning a boolean rather than a distance keeps the shapes readable, and the
 * supersampling above turns the hard edges into smooth ones anyway.
 */
const silhouettes = {
  disc: (x, y, radius) => Math.hypot(x, y) <= radius,

  // Rotated square. The 1.25 restores the ink a diamond loses against a disc of
  // the same radius, so the two read at the same weight on the map.
  diamond: (x, y, radius) => Math.abs(x) + Math.abs(y) <= radius * 1.25,

  // Equilateral, pointing up, inscribed in the same circle.
  triangle: (x, y, radius) => {
    const apex = -radius;
    const base = radius * 0.5;
    if (y < apex || y > base) {
      return false;
    }
    const halfWidth = ((y - apex) / (base - apex)) * radius * 1.15;
    return Math.abs(x) <= halfWidth;
  },

  // Two bars crossing at a right angle, turned 45 degrees.
  cross: (x, y, radius) => {
    const arm = radius * 0.42;
    const rotatedX = (x + y) * Math.SQRT1_2;
    const rotatedY = (y - x) * Math.SQRT1_2;
    const inside = Math.max(Math.abs(rotatedX), Math.abs(rotatedY)) <= radius;
    return inside && (Math.abs(rotatedX) <= arm || Math.abs(rotatedY) <= arm);
  },

  // Hollow, which is what makes an archived tree read as an absence.
  ring: (x, y, radius) => {
    const distance = Math.hypot(x, y);
    return distance <= radius && distance >= radius * 0.46;
  },
};

/**
 * Coverage of a shape at a pixel, between 0 and 1, by sampling a grid inside it.
 */
function coverage(shape, px, py, centre, radius) {
  let hits = 0;
  const step = 1 / SUPERSAMPLE;

  for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
    for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
      const x = px + (sx + 0.5) * step - centre;
      const y = py + (sy + 0.5) * step - centre;
      if (silhouettes[shape](x, y, radius)) {
        hits += 1;
      }
    }
  }

  return hits / (SUPERSAMPLE * SUPERSAMPLE);
}

// ---------------------------------------------------------------------------
// Compositing
// ---------------------------------------------------------------------------

/** Source over destination, the only blend this needs. */
function blend(target, offset, colour, alpha) {
  if (alpha <= 0) {
    return;
  }

  const destinationAlpha = target[offset + 3] / 255;
  const outAlpha = alpha + destinationAlpha * (1 - alpha);

  if (outAlpha <= 0) {
    return;
  }

  for (let channel = 0; channel < 3; channel += 1) {
    const destination = target[offset + channel];
    const source = channel === 0 ? colour.r : channel === 1 ? colour.g : colour.b;
    target[offset + channel] = Math.round(
      (source * alpha + destination * destinationAlpha * (1 - alpha)) / outAlpha,
    );
  }

  target[offset + 3] = Math.round(outAlpha * 255);
}

/**
 * Renders one sprite.
 *
 * The glow is a radial falloff from the edge of the silhouette rather than a
 * true gaussian blur: at these sizes the two are indistinguishable, and the
 * falloff needs no second buffer and no separable pass.
 */
function renderSprite({
  spriteSize,
  shape,
  colour,
  glow,
  glowSpread,
  hasRim,
  markDiameter,
  ring,
  scale,
}) {
  const side = spriteSize * scale;
  const pixels = new Uint8Array(side * side * 4);
  const centre = side / 2;
  const radius = (markDiameter / 2) * scale;
  const rim = radius + (hasRim ? rimWidth * scale : 0);
  const tint = parseHex(colour);

  for (let py = 0; py < side; py += 1) {
    for (let px = 0; px < side; px += 1) {
      const offset = (py * side + px) * 4;
      const dx = px + 0.5 - centre;
      const dy = py + 0.5 - centre;
      const distance = Math.hypot(dx, dy);

      // 1. The glow, furthest back and softest.
      if (glow) {
        const spread = glowSpread * scale;
        const beyond = distance - rim;
        if (beyond < spread) {
          const falloff = beyond <= 0 ? 1 : 1 - beyond / spread;
          blend(pixels, offset, tint, falloff ** 2.2 * 0.55);
        }
      }

      // 2. The soft ring the selected marker carries.
      if (ring !== undefined) {
        const outer = rim + ring.width * scale;
        if (distance <= outer) {
          blend(pixels, offset, tint, ring.alpha);
        }
      }

      // 3. The white rim, which cuts the mark out of whatever tile is under it.
      if (hasRim) {
        const rimCoverage = coverage(shape, px, py, centre, rim);
        blend(pixels, offset, RIM_TINT, rimCoverage);
      }

      // 4. The mark itself.
      const markCoverage = coverage(shape, px, py, centre, radius);
      blend(pixels, offset, tint, markCoverage);
    }
  }

  return { pixels, side };
}

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels, side) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0);
  header.writeUInt32BE(side, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // One filter byte per scanline. Filter 0 keeps the encoder trivial and the
  // sprites are small enough that the extra bytes do not matter.
  const raw = Buffer.alloc(side * (side * 4 + 1));
  for (let y = 0; y < side; y += 1) {
    const rowStart = y * (side * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(pixels.buffer, y * side * 4, side * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

mkdirSync(outputDir, { recursive: true });

const written = [];

/**
 * The suffix React Native reads a density from. The 1x file carries no suffix
 * and is the one the code actually requires; the renderer picks the variant.
 */
function densitySuffix(scale) {
  return scale === 1 ? '' : `@${scale}x`;
}

for (const [status, marker] of Object.entries(markerShapeByTrackingStatus)) {
  const colour = colorByTrackingStatus[status];
  const slug = status.replace(/_/g, '-');

  /**
   * The rim and the selection halo are both there to lift a live tree off the
   * tiles, so an archived one takes neither. It is the same condition StatusDot
   * draws the view version with, and the two marks have to match.
   */
  const isActive = status !== 'archived';

  const variants = [
    {
      name: slug,
      spriteSize: MARKER_GEOMETRY.spriteSize,
      glowSpread: glowRadius,
      markDiameter: markSize,
      ring: undefined,
    },
    {
      name: `${slug}-selected`,
      spriteSize: MARKER_GEOMETRY.selectedSpriteSize,
      glowSpread: MARKER_GEOMETRY.selectedGlowRadius,
      markDiameter: selectedMarkSize,
      ring: isActive ? { width: selectedRingWidth, alpha: 0.18 } : undefined,
    },
  ];

  for (const variant of variants) {
    for (const scale of scales) {
      const sprite = renderSprite({
        spriteSize: variant.spriteSize,
        shape: marker.shape,
        colour,
        glow: marker.glow,
        glowSpread: variant.glowSpread,
        hasRim: isActive,
        markDiameter: variant.markDiameter,
        ring: variant.ring,
        scale,
      });

      const fileName = `${variant.name}${densitySuffix(scale)}.png`;
      writeFileSync(join(outputDir, fileName), encodePng(sprite.pixels, sprite.side));
      written.push(fileName);
    }
  }
}

console.log(`Wrote ${written.length} marker sprites to assets/markers:`);
for (const name of written) {
  console.log(`  ${name}`);
}
