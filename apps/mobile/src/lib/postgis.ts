/**
 * Reading a PostGIS point back out of PostgREST.
 *
 * PostGIS has no JSON representation of its own, so a `geometry` column
 * selected through PostgREST arrives as the hexadecimal EWKB the type's text
 * output produces -- `0101000020E6100000B654674B75FE52C0175D74D145170240`, a
 * fifty character string that is a point and does not look like one.
 *
 * Everywhere the schema already knew a screen wanted coordinates it projects
 * them in SQL instead: `tree_card()` returns `st_x(location)` and
 * `st_y(location)` as two ordinary doubles, which is the better shape and the
 * one to reach for when a function is being written anyway. `capture_location`
 * on `log_entries` has no such projection -- the column is written by the
 * growth log and read by nothing -- and the timeline selects the table
 * directly rather than through a function, so this decodes what the table
 * actually sends.
 *
 * EWKB is PostGIS's extension of the OGC well known binary format: the OGC
 * header, then an optional SRID, with the presence of each announced by flag
 * bits in the type word. Only a two dimensional point is accepted here,
 * because that is the only thing the column is declared to hold; anything else
 * -- a truncated string, a different geometry, a Z or M ordinate -- returns
 * null and is shown as a missing coordinate rather than as a wrong one.
 */
import type { Coordinates } from '@arbolapp/core';

/** Byte order marks that open a WKB body. */
const BIG_ENDIAN = 0;
const LITTLE_ENDIAN = 1;

/** OGC geometry type of a point, once the EWKB flag bits are masked off. */
const POINT = 1;

/** EWKB flag bits, the high nibble of the type word. */
const HAS_Z = 0x80000000;
const HAS_M = 0x40000000;
const HAS_SRID = 0x20000000;
const FLAGS = HAS_Z | HAS_M | HAS_SRID;

/** Byte order, type word, optional SRID, then two doubles. */
const HEADER_BYTES = 5;
const SRID_BYTES = 4;
const ORDINATE_BYTES = 8;

function toBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * The point a `geometry(Point, 4326)` column encodes, or null when the value is
 * absent or is not one.
 *
 * Null is a real answer and not a failure: `capture_location` is nullable
 * because a photograph can reach the log without an EXIF position, from a
 * phone whose location permission was refused or whose picture came out of the
 * gallery.
 */
export function parseEwkbPoint(value: string | null | undefined): Coordinates | null {
  if (typeof value !== 'string' || value === '') {
    return null;
  }

  const bytes = toBytes(value);
  if (bytes === null || bytes.length < HEADER_BYTES) {
    return null;
  }

  const order = bytes[0];
  if (order !== LITTLE_ENDIAN && order !== BIG_ENDIAN) {
    return null;
  }
  const littleEndian = order === LITTLE_ENDIAN;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const typeWord = view.getUint32(1, littleEndian);

  // A Z or an M ordinate would shift the two this reads, so a point carrying
  // one is refused rather than decoded from the wrong offset.
  if ((typeWord & ~FLAGS) !== POINT || (typeWord & HAS_Z) !== 0 || (typeWord & HAS_M) !== 0) {
    return null;
  }

  const start = HEADER_BYTES + ((typeWord & HAS_SRID) !== 0 ? SRID_BYTES : 0);
  if (bytes.length < start + ORDINATE_BYTES * 2) {
    return null;
  }

  // X is longitude and Y is latitude, the order the column stores and the
  // reverse of the order they are spoken in.
  const lng = view.getFloat64(start, littleEndian);
  const lat = view.getFloat64(start + ORDINATE_BYTES, littleEndian);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return { lng, lat };
}
