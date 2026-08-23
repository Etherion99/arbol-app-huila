/**
 * Dates and coordinates as the guardian reads them.
 *
 * The database stores instants in `timestamptz` and calendar dates in `date`.
 * The platform runs in one country and one time zone, so everything shown is
 * Colombian time -- pinned explicitly rather than taken from the device, which
 * a guardian may have set to anything and which would otherwise decide whether
 * a photograph counts as taken today.
 */

const COLOMBIA = 'America/Bogota';

/** Parts of a calendar date while it is being typed, so a half typed day is not a number. */
export type DateParts = {
  day: string;
  month: string;
  year: string;
};

function partsOf(value: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const collected: Record<string, string> = {};
  for (const part of formatter.formatToParts(value)) {
    collected[part.type] = part.value;
  }
  return collected;
}

/** Today's calendar date in Colombia, as `YYYY-MM-DD`. */
export function todayInColombia(): string {
  const parts = partsOf(new Date());
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isoDateToParts(value: string): DateParts {
  const [year = '', month = '', day = ''] = value.split('-');
  return { day, month, year };
}

/**
 * Reassembles the three boxes into what the column stores. It pads but never
 * corrects: an impossible date stays impossible so the schema can reject it and
 * the field can say why, rather than silently becoming the first of March.
 */
export function partsToIsoDate({ day, month, year }: DateParts): string {
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** Whether a `YYYY-MM-DD` string names a day that exists on the calendar. */
export function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return false;
  }

  const [, year, month, day] = match.map(Number);
  // Round tripping through UTC catches the 31st of February, which `Date` would
  // otherwise roll forward into March without complaining.
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/** `21 ago 2026`, the form the canvas uses for a date beside a measurement. */
export function formatShortDate(value: string): string {
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(parsed)
    .replace(/\./g, '');
}

/** `14 may`, for a due date close enough that the year is noise. */
export function formatDayAndMonth(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA,
    day: 'numeric',
    month: 'short',
  })
    .format(parsed)
    .replace(/\./g, '');
}

/**
 * `hoy 9:12`, `ayer 17:40`, `3 may 8:05` — when something was saved on this
 * phone, as the pending list prints it.
 *
 * The time of day is here and nowhere else in the app for a reason: every other
 * date the guardian reads is a calendar fact about a tree, where an hour would
 * be noise. This one is about their own morning. Two entries saved on the same
 * walk have to be told apart, and «hoy» on both of them does not do it.
 *
 * The day words are only used while they are unambiguous. Past yesterday the
 * calendar date is what a guardian can actually place, and «hace 9 días» would
 * make them do the arithmetic back.
 */
export function formatSavedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const time = new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);

  // Compared as calendar dates in Colombia rather than by subtracting hours:
  // something saved at 23:50 and read at 00:10 was saved yesterday, however
  // few minutes ago that was.
  const day = partsOf(parsed);
  const today = partsOf(new Date());
  const yesterday = partsOf(new Date(Date.now() - 86_400_000));

  const sameDay = (other: Record<string, string>) =>
    day.year === other.year && day.month === other.month && day.day === other.day;

  if (sameDay(today)) {
    return `hoy ${time}`;
  }
  if (sameDay(yesterday)) {
    return `ayer ${time}`;
  }

  return `${formatDayAndMonth(value)} ${time}`;
}

/** `2025`, for the line naming how long somebody has been a guardian. */
export function formatYear(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CO', { timeZone: COLOMBIA, year: 'numeric' }).format(parsed);
}

/**
 * Whole days between an instant and now, positive when the instant is past.
 *
 * Counted in whole days rather than in hours, because "vencido hace 12 días" is
 * what the list says and rounding a 12.4 down to 12 is the honest direction.
 */
export function daysSince(value: string): number {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }
  return Math.floor((Date.now() - parsed.getTime()) / 86_400_000);
}

/**
 * `2.3894° N, 75.8919° W`, the form the design shows coordinates in.
 *
 * Four decimals is about eleven metres, which is the honest precision for a
 * reading taken under a canopy and far more than a label needs.
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latitude = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const longitude = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latitude}, ${longitude}`;
}

/** `1,2 km` or `380 m`, whichever reads better at that distance. */
export function formatDistance(metres: number): string {
  if (metres < 1_000) {
    return `${Math.round(metres)} m`;
  }
  return `${(metres / 1_000).toFixed(1).replace('.', ',')} km`;
}

/**
 * Great circle distance in metres.
 *
 * Used for one thing only: ordering the villages by how close their centroid is
 * to the pin, so the wizard can offer a suggestion. The centroids are
 * approximate by the catalogue's own admission, so this never decides anything
 * on its own -- it ranks a list the guardian then confirms.
 */
export function distanceInMetres(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const EARTH_RADIUS_M = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}
