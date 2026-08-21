import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_EDGE_PX,
  PHOTO_QUALITY_LADDER,
  PHOTO_TARGET_BYTES,
  THUMBNAIL_SIZE_PX,
} from '@arbolapp/core';

/**
 * Turning a camera original into the two objects the bucket stores.
 *
 * The compression is not a nicety. The free storage plan gives one gigabyte for
 * the whole year and a camera original is around four megabytes, so uploading
 * untouched photographs would exhaust the allowance inside the first semester.
 * The bucket refuses anything over a mebibyte, which is the backstop rather
 * than the target.
 *
 * The prepared files are written to the app's document directory, not to the
 * cache. The cache is what the operating system reclaims when storage runs low,
 * and a guardian who registered a tree in a vereda on Saturday and got signal
 * on Monday would find the photograph gone.
 */

/** A photograph ready to be sent, with everything the log entry row needs. */
export type PreparedPhoto = {
  /** Local file URI of the compressed photograph. */
  photoUri: string;
  /** Local file URI of the square thumbnail. */
  thumbnailUri: string;
  photoBytes: number;
  /**
   * When the shutter was pressed, read from the EXIF of the original. Never the
   * moment the upload succeeded: in the field those can be days apart, and the
   * date that means something is the one the photograph was taken on.
   */
  capturedAt: string;
  /** Where the device was when the photograph was taken, when it knew. */
  captureLocation: { lat: number; lng: number } | null;
};

/** Everything a camera hands back that this module can read something out of. */
export type CameraResult = {
  uri: string;
  exif?: Record<string, unknown> | null;
};

const PHOTO_DIRECTORY = 'growth-log';

function photoDirectory(): Directory {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
  return directory;
}

/**
 * Reads a number out of an EXIF bag without trusting its type.
 *
 * EXIF comes off the camera hardware and its shape differs between Android
 * vendors and iOS versions, so every field is checked rather than cast. A
 * missing or malformed value degrades to null, never to `NaN` on a map.
 */
function exifNumber(exif: Record<string, unknown> | null | undefined, key: string): number | null {
  const raw = exif?.[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * The instant the photograph was taken.
 *
 * EXIF writes local wall clock time as `YYYY:MM:DD HH:MM:SS`, with colons where
 * a date needs dashes and no zone at all. It is rewritten into something `Date`
 * can parse and interpreted as the device's own zone, which for this project is
 * Colombia.
 *
 * When the camera reports nothing usable the fallback is the moment of capture
 * on the device clock -- which is still the capture moment, and still not the
 * upload moment, so the rule the domain cares about holds either way.
 */
export function readCapturedAt(
  exif: Record<string, unknown> | null | undefined,
  fallback: Date,
): string {
  for (const key of ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime']) {
    const raw = exif?.[key];
    if (typeof raw !== 'string') {
      continue;
    }

    const normalised = raw.trim().replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const parsed = new Date(normalised);

    // A camera with a dead backup battery reports 1970 or 1980. That is not a
    // capture time, it is a flat cell, and taking it would push the tree's
    // whole reminder cadence into the past.
    if (!Number.isNaN(parsed.getTime()) && parsed.getUTCFullYear() > 2000) {
      return parsed.toISOString();
    }
  }

  return fallback.toISOString();
}

/**
 * The coordinate stamped into the photograph, when the camera stamped one.
 *
 * Phase 8 uses it to spot an entry recorded far from the tree it claims to
 * show. Nothing looks at it today; it is captured now because a photograph
 * taken in 2026 cannot grow a coordinate in 2027.
 */
export function readCaptureLocation(
  exif: Record<string, unknown> | null | undefined,
): { lat: number; lng: number } | null {
  const lat = exifNumber(exif, 'GPSLatitude');
  const lng = exifNumber(exif, 'GPSLongitude');

  if (lat === null || lng === null || (lat === 0 && lng === 0)) {
    return null;
  }

  // EXIF stores the hemisphere apart from the magnitude, so a southern latitude
  // arrives as a positive number with an 'S' beside it.
  const latRef = exif?.GPSLatitudeRef;
  const lngRef = exif?.GPSLongitudeRef;

  return {
    lat: latRef === 'S' ? -Math.abs(lat) : lat,
    lng: lngRef === 'W' ? -Math.abs(lng) : lng,
  };
}

/** Raised when no quality in the ladder brings the photograph under the ceiling. */
export class PhotoTooHeavyError extends Error {
  constructor(readonly bytes: number) {
    super(`the photograph is still ${bytes} bytes after the last quality step`);
    this.name = 'PhotoTooHeavyError';
  }
}

/**
 * Moves a render out of the cache and into durable storage.
 *
 * `saveAsync` writes to the cache directory, which is exactly what the system
 * reclaims when the phone runs low. A guardian who registers a tree in a vereda
 * on Saturday and finds signal on Monday would otherwise come back to a
 * photograph the operating system had thrown away in between.
 */
async function keepJpeg(sourceUri: string, name: string): Promise<File> {
  const destination = new File(photoDirectory(), name);
  if (destination.exists) {
    destination.delete();
  }
  await new File(sourceUri).move(destination);
  return destination;
}

/**
 * Compresses a camera original down to the storage budget and cuts its
 * thumbnail, leaving both in durable storage.
 *
 * The quality ladder walks down rather than binary searching: a well lit
 * photograph clears the budget on the first step and never pays for the rest,
 * while the noisy ones -- which are exactly the heavy ones -- take the extra
 * passes they need. Resizing happens once, before the ladder, because scale is
 * what actually removes the bytes and re-encoding at a smaller size repeatedly
 * would only compound the artefacts.
 */
export async function preparePhoto(
  capture: CameraResult,
  fallbackLocation: { lat: number; lng: number } | null = null,
): Promise<PreparedPhoto> {
  const capturedAt = readCapturedAt(capture.exif, new Date());
  const captureLocation = readCaptureLocation(capture.exif) ?? fallbackLocation;
  const stamp = Date.now();

  const context = ImageManipulator.manipulate(capture.uri);
  context.resize({ width: PHOTO_MAX_EDGE_PX });
  const resized = await context.renderAsync();

  let chosenUri: string | null = null;
  let chosenBytes = Number.POSITIVE_INFINITY;

  for (const quality of PHOTO_QUALITY_LADDER) {
    const saved = await resized.saveAsync({ compress: quality, format: SaveFormat.JPEG });
    const bytes = new File(saved.uri).size;

    // Keep the smallest attempt seen, so a photograph that never reaches the
    // target still has its best candidate to check against the hard ceiling.
    if (bytes < chosenBytes) {
      chosenUri = saved.uri;
      chosenBytes = bytes;
    }

    if (bytes <= PHOTO_TARGET_BYTES) {
      break;
    }
  }

  if (chosenUri === null || chosenBytes > PHOTO_MAX_BYTES) {
    throw new PhotoTooHeavyError(chosenBytes);
  }

  const thumbnailContext = ImageManipulator.manipulate(capture.uri);
  thumbnailContext.resize({ width: THUMBNAIL_SIZE_PX, height: THUMBNAIL_SIZE_PX });
  const thumbnail = await (
    await thumbnailContext.renderAsync()
  ).saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

  const photoFile = await keepJpeg(chosenUri, `${stamp}-photo.jpg`);
  const thumbnailFile = await keepJpeg(thumbnail.uri, `${stamp}-thumbnail.jpg`);

  return {
    photoUri: photoFile.uri,
    thumbnailUri: thumbnailFile.uri,
    photoBytes: chosenBytes,
    capturedAt,
    captureLocation,
  };
}

/** Whether a prepared photograph is still on disk, before an upload is retried. */
export function preparedPhotoExists(photo: Pick<PreparedPhoto, 'photoUri' | 'thumbnailUri'>) {
  try {
    return new File(photo.photoUri).exists && new File(photo.thumbnailUri).exists;
  } catch {
    return false;
  }
}

/** Removes a prepared photograph once it is safely in the bucket. */
export function discardPreparedPhoto(photo: Pick<PreparedPhoto, 'photoUri' | 'thumbnailUri'>) {
  for (const uri of [photo.photoUri, photo.thumbnailUri]) {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // A file that cannot be deleted is a few hundred kilobytes on the phone,
      // not a failure the guardian has any use for hearing about.
    }
  }
}
