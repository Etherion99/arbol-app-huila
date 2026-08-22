/**
 * How dates, coordinates and rates are written on screen.
 *
 * Everything is stored in `timestamptz` and presented in Colombian time, so the
 * time zone is pinned here once instead of being left to whatever the browser
 * or the server happens to be set to. A coordinator in La Plata and a render on
 * a server in Virginia have to produce the same day.
 */

const TIME_ZONE = 'America/Bogota';
const LOCALE = 'es-CO';

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
});

/**
 * "02 sep 2025".
 *
 * A plain `date` column arrives as `2025-09-02` with no zone. Read as UTC and
 * printed in Bogotá it would slide back to the first of September, so a bare
 * date is split by hand and never goes through a time zone at all.
 */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const bareDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (bareDate) {
    const [, year, month, day] = bareDate;
    return dayFormatter.format(
      new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12)),
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return dayFormatter.format(parsed);
}

/** "10 ene", for the second half of a sentence that already carries the year. */
export function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return shortDayFormatter.format(parsed);
}

/**
 * "2.3812° N, 75.8846° W".
 *
 * Four decimals is about eleven metres, which is the precision a phone GPS
 * actually delivers under a canopy. Printing more would suggest an accuracy the
 * measurement does not have.
 */
export function formatCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const latitude = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const longitude = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

  return `${latitude}, ${longitude}`;
}

/** The file name stamp of an export: `2026-08-22`, in Colombian time. */
export function fileStamp(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return parts;
}
