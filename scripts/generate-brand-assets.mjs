/**
 * Cuts every icon the two applications need out of one master logo.
 *
 * The master is `assets/brand/logo-lockup.png`: the mark -- a fruit tree over a
 * map pin over an open map -- with «ÁrbolApp Huila» set under it. Everything
 * downstream is a crop and a resample of that single file, so the day the
 * artwork is redrawn there is one file to replace and one command to run,
 * instead of nine bitmaps to re-cut by hand in an image editor.
 *
 * ## Why this decodes PNG by hand
 *
 * The repository has no image library and does not need one: `deflateSync` and
 * `inflateSync` from `node:zlib` are the only compressed part of a PNG, and the
 * rest is a byte layout. The sprite and token generators already write PNG this
 * way; this one also reads it. Adding a native dependency to crop a rectangle
 * would be paying a build toolchain for arithmetic.
 *
 * ## What the steps are
 *
 * 1. **Lift the paper.** The master was drawn on white, which an icon must not
 *    carry into a transparent layer. The white is removed by flooding inwards
 *    from the border rather than by thresholding the whole bitmap, so the whites
 *    *inside* the art -- the hole in the pin, the folds of the map -- survive.
 * 2. **Split.** The lockup has one band of blank rows between the mark and the
 *    wordmark. That gap is found rather than hard coded, so a redrawn master
 *    with different proportions still splits correctly.
 * 3. **Fit and write.** Each output places one of the two pieces on a canvas of
 *    a given size, with the margin that target asks for.
 *
 * Outputs are committed, because Metro and Next bundle them and must not depend
 * on this script having been run.
 *
 * Run with `pnpm brand`.
 */

import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors } from '../packages/core/src/theme.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const masterPath = join(repoRoot, 'assets', 'brand', 'logo-lockup.png');

const mobileImages = join(repoRoot, 'apps', 'mobile', 'assets', 'images');
const webApp = join(repoRoot, 'apps', 'web', 'src', 'app');

/**
 * The colour every opaque icon sits on.
 *
 * Not `surfacePage`. The mark separates the folds of the map with white lines,
 * and on the faintly green page colour those lines read as a tint rather than
 * as paper. `surfaceRaised` is the white the artwork was drawn against.
 */
const ICON_BACKDROP = colors.surfaceRaised;

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, checksum]);
}

/**
 * An image, as this script passes it around: RGBA bytes and the two dimensions.
 * Alpha is *not* premultiplied here; the resampler premultiplies internally so
 * that a transparent pixel's colour never bleeds into its neighbours.
 */
function image(width, height, pixels = new Uint8ClampedArray(width * height * 4)) {
  return { width, height, pixels };
}

/**
 * Reads the subset of PNG the master is written in: eight bits per channel,
 * RGB or RGBA, not interlaced. Anything else is rejected loudly rather than
 * decoded into noise.
 */
function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('El maestro no es un PNG.');
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const interlace = buffer[28];

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new Error(
      `PNG no soportado: profundidad ${bitDepth}, tipo ${colorType}, entrelazado ${interlace}. ` +
        'Se espera RGB u RGBA de 8 bits sin entrelazar.',
    );
  }

  const parts = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('latin1');
    if (type === 'IDAT') parts.push(buffer.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') break;
    offset += 12 + length;
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(parts));
  const flat = Buffer.alloc(height * stride);

  // Undo the per-row filters. Each byte is predicted from the one to its left
  // (`a`), the one above (`b`) and the one above-left (`c`), in the already
  // reconstructed output rather than in the filtered input.
  let read = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[read];
    read += 1;
    const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[read + x];
      const a = x >= channels ? flat[row + x - channels] : 0;
      const b = y > 0 ? flat[row - stride + x] : 0;
      const c = x >= channels && y > 0 ? flat[row - stride + x - channels] : 0;
      let out;
      if (filter === 0) out = value;
      else if (filter === 1) out = value + a;
      else if (filter === 2) out = value + b;
      else if (filter === 3) out = value + ((a + b) >> 1);
      else if (filter === 4) {
        const estimate = a + b - c;
        const da = Math.abs(estimate - a);
        const db = Math.abs(estimate - b);
        const dc = Math.abs(estimate - c);
        out = value + (da <= db && da <= dc ? a : db <= dc ? b : c);
      } else throw new Error(`Filtro PNG desconocido: ${filter}`);
      flat[row + x] = out & 0xff;
    }
    read += stride;
  }

  const result = image(width, height);
  for (let i = 0, j = 0; i < width * height; i += 1, j += channels) {
    result.pixels[i * 4] = flat[j];
    result.pixels[i * 4 + 1] = flat[j + 1];
    result.pixels[i * 4 + 2] = flat[j + 2];
    result.pixels[i * 4 + 3] = channels === 4 ? flat[j + 3] : 255;
  }
  return result;
}

function encodePng({ width, height, pixels }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const start = y * (stride + 1);
    raw[start] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, start + 1);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Lifting the artwork off the paper
// ---------------------------------------------------------------------------

/**
 * Above this, a channel counts as paper.
 *
 * The master's background is not `#FFFFFF` but a couple of steps under it, and
 * the compression that produced it leaves the odd pixel a step or two further
 * off still. 236 sits well above the lightest colour in the art -- the pale
 * yellow of the lemon -- and well below the paper.
 */
const PAPER_LEVEL = 236;

/**
 * Replaces the background with transparency, flooding inwards from the border.
 *
 * A plain threshold would also erase the whites the artwork uses on purpose:
 * the hole in the map pin and the creases of the folded map. Reaching them
 * requires crossing the coloured outline that encloses them, which the flood
 * cannot do, so they stay.
 *
 * Edge pixels are feathered rather than cut: a pixel that the flood stopped at
 * but that is still nearly paper keeps a proportional alpha, which is what
 * stops the mark from acquiring a white fringe when it is placed on a colour.
 */
function liftPaper(source) {
  const { width, height, pixels } = source;
  const isPaper = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    isPaper[i] =
      pixels[i * 4] >= PAPER_LEVEL &&
      pixels[i * 4 + 1] >= PAPER_LEVEL &&
      pixels[i * 4 + 2] >= PAPER_LEVEL
        ? 1
        : 0;
  }

  const background = new Uint8Array(width * height);
  const queue = [];
  const push = (x, y) => {
    const i = y * width + x;
    if (isPaper[i] && !background[i]) {
      background[i] = 1;
      queue.push(i);
    }
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (queue.length > 0) {
    const i = queue.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }

  const result = image(width, height);
  for (let i = 0; i < width * height; i += 1) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    result.pixels[i * 4] = r;
    result.pixels[i * 4 + 1] = g;
    result.pixels[i * 4 + 2] = b;
    if (background[i]) {
      result.pixels[i * 4 + 3] = 0;
      continue;
    }
    // How far this pixel is from paper, over the last stretch before it. A
    // pixel at the outline's edge is half covered and gets half the alpha.
    const lightest = Math.max(r, g, b);
    const coverage = lightest >= 255 ? 0 : Math.min(1, (255 - lightest) / (255 - PAPER_LEVEL));
    const touchesBackground =
      (i % width > 0 && background[i - 1]) ||
      (i % width < width - 1 && background[i + 1]) ||
      (i >= width && background[i - width]) ||
      (i < width * (height - 1) && background[i + width]);
    result.pixels[i * 4 + 3] = touchesBackground ? Math.round(coverage * 255) : 255;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** The tightest rectangle holding every pixel that is not fully transparent. */
function contentBounds({ width, height, pixels }, top = 0, bottom = height - 1) {
  let left = width;
  let right = -1;
  let first = bottom + 1;
  let last = top - 1;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < first) first = y;
      last = y;
    }
  }
  if (right < 0) throw new Error('La imagen quedó vacía tras quitar el fondo.');
  return { left, top: first, width: right - left + 1, height: last - first + 1 };
}

/**
 * Finds the blank band that separates the mark from the wordmark.
 *
 * Returns the widest run of fully transparent rows inside the artwork. If the
 * master ever stops having one -- a lockup with the name beside the mark rather
 * than under it -- this says so instead of splitting at an arbitrary row.
 */
function findSplitRow(source, bounds) {
  const { width, pixels } = source;
  let widest = null;
  let start = null;
  for (let y = bounds.top; y < bounds.top + bounds.height; y += 1) {
    let empty = true;
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] !== 0) {
        empty = false;
        break;
      }
    }
    if (empty) {
      if (start === null) start = y;
    } else if (start !== null) {
      if (!widest || y - start > widest.height) widest = { top: start, height: y - start };
      start = null;
    }
  }
  if (!widest) {
    throw new Error('No hay una banda vacía entre la marca y el logotipo: el maestro cambió.');
  }
  return widest;
}

function crop(source, { left, top, width, height }) {
  const result = image(width, height);
  for (let y = 0; y < height; y += 1) {
    const from = ((top + y) * source.width + left) * 4;
    result.pixels.set(source.pixels.subarray(from, from + width * 4), y * width * 4);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Resampling
// ---------------------------------------------------------------------------

/**
 * Scales an image with a triangle filter, one axis at a time.
 *
 * The filter's radius grows when the image shrinks, so a large master reduced
 * to a favicon averages every source pixel that falls under the destination one
 * instead of point sampling a few of them and aliasing the leaves into a rash.
 *
 * Colour is weighted by alpha -- premultiplied for the duration -- so that the
 * transparent side of an edge contributes its coverage without dragging its
 * colour, which is what keeps the mark from picking up a dark halo.
 */
function resize(source, width, height) {
  const horizontal = resizeAxis(source, width, 'x');
  return resizeAxis(horizontal, height, 'y');
}

function resizeAxis(source, size, axis) {
  const along = axis === 'x' ? source.width : source.height;
  const across = axis === 'x' ? source.height : source.width;
  const scale = size / along;
  const radius = scale < 1 ? 1 / scale : 1;

  const result = axis === 'x' ? image(size, source.height) : image(source.width, size);

  for (let out = 0; out < size; out += 1) {
    const centre = (out + 0.5) / scale;
    const from = Math.max(0, Math.floor(centre - radius));
    const to = Math.min(along - 1, Math.ceil(centre + radius));

    for (let other = 0; other < across; other += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let total = 0;
      for (let i = from; i <= to; i += 1) {
        const weight = Math.max(0, 1 - Math.abs(i + 0.5 - centre) / radius);
        if (weight === 0) continue;
        const index =
          axis === 'x' ? (other * source.width + i) * 4 : (i * source.width + other) * 4;
        const alpha = source.pixels[index + 3] / 255;
        r += source.pixels[index] * alpha * weight;
        g += source.pixels[index + 1] * alpha * weight;
        b += source.pixels[index + 2] * alpha * weight;
        a += alpha * weight;
        total += weight;
      }
      const outIndex = axis === 'x' ? (other * size + out) * 4 : (out * result.width + other) * 4;
      if (a > 0) {
        result.pixels[outIndex] = r / a;
        result.pixels[outIndex + 1] = g / a;
        result.pixels[outIndex + 2] = b / a;
      }
      result.pixels[outIndex + 3] = total > 0 ? (a / total) * 255 : 0;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function parseHex(hex) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/**
 * Centres a piece of artwork on a canvas.
 *
 * `coverage` is how much of the canvas's shorter side the artwork's longer side
 * is allowed to take. An opaque application icon fills most of the square; an
 * Android adaptive foreground has to stay inside the circle the launcher may
 * crop it to, which is why the two are told different numbers rather than
 * sharing one margin.
 */
function place(artwork, { size, width = size, height = size, coverage, backdrop }) {
  const canvas = image(width, height);
  if (backdrop) {
    const [r, g, b] = parseHex(backdrop);
    for (let i = 0; i < width * height; i += 1) {
      canvas.pixels[i * 4] = r;
      canvas.pixels[i * 4 + 1] = g;
      canvas.pixels[i * 4 + 2] = b;
      canvas.pixels[i * 4 + 3] = 255;
    }
  }

  const box = Math.min(width, height) * coverage;
  const scale = Math.min(box / artwork.width, box / artwork.height);
  const scaled = resize(
    artwork,
    Math.max(1, Math.round(artwork.width * scale)),
    Math.max(1, Math.round(artwork.height * scale)),
  );

  const offsetX = Math.round((width - scaled.width) / 2);
  const offsetY = Math.round((height - scaled.height) / 2);
  for (let y = 0; y < scaled.height; y += 1) {
    for (let x = 0; x < scaled.width; x += 1) {
      const from = (y * scaled.width + x) * 4;
      const to = ((offsetY + y) * width + offsetX + x) * 4;
      const alpha = scaled.pixels[from + 3] / 255;
      if (alpha === 0) continue;
      const under = canvas.pixels[to + 3] / 255;
      const out = alpha + under * (1 - alpha);
      for (let c = 0; c < 3; c += 1) {
        canvas.pixels[to + c] =
          (scaled.pixels[from + c] * alpha + canvas.pixels[to + c] * under * (1 - alpha)) / out;
      }
      canvas.pixels[to + 3] = out * 255;
    }
  }
  return canvas;
}

/**
 * Flattens artwork to a single tint, keeping only its shape.
 *
 * Android's themed icons and the notification tray both take the alpha channel
 * and paint it with a colour of their own choosing, so what they need is a
 * silhouette. Alpha comes from how dark each pixel is rather than from its
 * coverage, which keeps the whites the artwork draws on purpose -- the hole in
 * the pin, the folds of the map -- open instead of filling the mark into a
 * featureless blob.
 */
function silhouette(source, tint) {
  const [r, g, b] = parseHex(tint);
  const result = image(source.width, source.height);
  for (let i = 0; i < source.width * source.height; i += 1) {
    const alpha = source.pixels[i * 4 + 3] / 255;
    const luminance =
      0.2126 * source.pixels[i * 4] +
      0.7152 * source.pixels[i * 4 + 1] +
      0.0722 * source.pixels[i * 4 + 2];
    // 210 and below is ink; 250 and above is paper. The lightest colour the
    // artwork uses -- the yellow of the lemon -- sits at about 208.
    const ink = Math.min(1, Math.max(0, (250 - luminance) / 40));
    result.pixels[i * 4] = r;
    result.pixels[i * 4 + 1] = g;
    result.pixels[i * 4 + 2] = b;
    result.pixels[i * 4 + 3] = Math.round(alpha * ink * 255);
  }
  return result;
}

function fill(size, hex) {
  const [r, g, b] = parseHex(hex);
  const canvas = image(size, size);
  for (let i = 0; i < size * size; i += 1) {
    canvas.pixels[i * 4] = r;
    canvas.pixels[i * 4 + 1] = g;
    canvas.pixels[i * 4 + 2] = b;
    canvas.pixels[i * 4 + 3] = 255;
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Cutting the set
// ---------------------------------------------------------------------------

const master = liftPaper(decodePng(readFileSync(masterPath)));
const lockupBounds = contentBounds(master);
const gap = findSplitRow(master, lockupBounds);

const lockup = crop(master, lockupBounds);
const mark = crop(master, contentBounds(master, lockupBounds.top, gap.top - 1));
const markSilhouette = silhouette(mark, colors.ink);

/**
 * How much of an Android adaptive layer the artwork may occupy.
 *
 * The launcher is free to crop the 108dp layer to any shape inside its middle
 * 66dp, and several of them crop to a circle. 0.6 leaves the mark inside that
 * circle with a hair to spare; anything larger risks the launcher cutting the
 * outermost leaves off.
 */
const ADAPTIVE_COVERAGE = 0.6;

const outputs = [
  // The square icon. iOS refuses transparency in an application icon and
  // Android uses this one wherever the adaptive layers do not apply, so it is
  // opaque and it fills the square: the launcher already rounds the corners.
  {
    path: join(mobileImages, 'icon.png'),
    png: place(mark, { size: 1024, coverage: 0.86, backdrop: ICON_BACKDROP }),
    note: 'icono de la aplicación (iOS y Android)',
  },
  {
    path: join(mobileImages, 'android-icon-foreground.png'),
    png: place(mark, { size: 1024, coverage: ADAPTIVE_COVERAGE }),
    note: 'capa frontal del icono adaptativo',
  },
  {
    path: join(mobileImages, 'android-icon-background.png'),
    png: fill(1024, ICON_BACKDROP),
    note: 'capa de fondo del icono adaptativo',
  },
  {
    path: join(mobileImages, 'android-icon-monochrome.png'),
    png: place(markSilhouette, { size: 1024, coverage: ADAPTIVE_COVERAGE }),
    note: 'capa monocroma (iconos temáticos de Android 13+)',
  },
  // The notification tray masks whatever it is given down to the alpha channel
  // and paints it with the tint app.config.js declares, so a coloured icon
  // arrives as a white blob. This is the silhouette, at the density Android
  // asks for at xxxhdpi.
  {
    path: join(mobileImages, 'notification-icon.png'),
    png: place(silhouette(mark, colors.surfaceRaised), { size: 96, coverage: 0.9 }),
    note: 'icono pequeño de las notificaciones',
  },
  // The splash screen plugin paints a background colour and one bitmap, so the
  // bitmap is the whole lockup -- mark and name together -- rather than the
  // mark alone.
  {
    path: join(mobileImages, 'splash-icon.png'),
    png: place(lockup, {
      width: 1024,
      height: Math.round((1024 * lockup.height) / lockup.width),
      coverage: 1,
    }),
    note: 'bitmap de la pantalla de arranque',
  },
  {
    path: join(mobileImages, 'favicon.png'),
    png: place(mark, { size: 64, coverage: 0.92, backdrop: ICON_BACKDROP }),
    note: 'favicon de la exportación web de Expo',
  },
  // Next.js turns these two file names into the tab icon and the iOS home
  // screen icon on its own; no metadata entry declares them.
  {
    path: join(webApp, 'icon.png'),
    png: place(mark, { size: 512, coverage: 0.92, backdrop: ICON_BACKDROP }),
    note: 'icono del panel web',
  },
  {
    path: join(webApp, 'apple-icon.png'),
    png: place(mark, { size: 180, coverage: 0.86, backdrop: ICON_BACKDROP }),
    note: 'icono del panel web en iOS',
  },
];

console.log('ÁrbolApp Huila — assets de marca\n');
console.log(`  maestro    ${relative(repoRoot, masterPath)} (${master.width} × ${master.height})`);
console.log(`  marca      ${mark.width} × ${mark.height}`);
console.log(`  logotipo   ${lockup.width} × ${lockup.height}`);
console.log(`  fondo      ${ICON_BACKDROP}   surfaceRaised\n`);

for (const output of outputs) {
  const bytes = encodePng(output.png);
  mkdirSync(dirname(output.path), { recursive: true });
  writeFileSync(output.path, bytes);
  const size = `${output.png.width} × ${output.png.height}`.padEnd(11);
  console.log(
    `  ${relative(repoRoot, output.path).replace(/\\/g, '/').padEnd(48)} ${size} ` +
      `${(bytes.length / 1024).toFixed(1).padStart(6)} KB   ${output.note}`,
  );
}

console.log(
  '\n  Los colores y el ancho al que el plugin escala la pantalla de arranque\n' +
    '  están en app.config.js, que los lee de los mismos tokens.\n',
);
