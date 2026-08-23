/**
 * Registration integrity: what makes a PRAE report defensible.
 *
 * The figures this project hands to the Secretaría de Ambiente are only worth
 * something if the trees behind them exist. Without a check, fifty trees can be
 * registered from a sofa in an afternoon and nothing in the data would look
 * different from fifty real walks into the veredas.
 *
 * Three signals are read, and none of them rejects anything. A guardian standing
 * under a mango canopy gets a GPS fix that wanders by two hundred metres through
 * no fault of their own, and two saplings planted at the edge of a plot really
 * can be three metres apart. An automatic refusal would turn every one of those
 * into an honest guardian being called a liar by a machine, and a guardian
 * called a liar does not come back. So what a signal produces is a flag, and
 * every flag goes to a person.
 *
 * The thresholds live here because the database raises the flags and the panel
 * explains them, and the two must not each keep their own idea of what "far" is.
 * `public.registration_flag_thresholds()` is the database's copy and
 * `pnpm test:offline` compares them.
 */

import type { IsoDateTime, Uuid } from './domain';

/**
 * Why a registration was flagged.
 *
 * - `gps_mismatch` — the coordinate the guardian confirmed on the map and the
 *   one stamped into the photograph are far apart.
 * - `duplicate_location` — another live tree stands close enough that the two
 *   may be one tree registered twice.
 * - `missing_capture_location` — the photograph carries no coordinate at all,
 *   so neither of the checks above could run.
 */
export type RegistrationFlagReason =
  | 'gps_mismatch'
  | 'duplicate_location'
  | 'missing_capture_location';

/** What a coordinator decided about a flag. */
export type RegistrationFlagResolution = 'confirmed' | 'dismissed';

/**
 * How far the declared coordinate may sit from where the photograph was taken.
 *
 * A hundred and fifty metres is chosen against the way the error actually
 * behaves rather than against the accuracy a phone claims. Under canopy, on a
 * slope, with the sky half blocked, a consumer GPS drifts tens of metres and
 * occasionally more; a registration done from somewhere else entirely misses by
 * kilometres. The gap between those two is wide, and the threshold sits inside
 * it, deliberately closer to the forgiving end: a flag that fires on honest
 * work costs a coordinator's afternoon, every time, forever.
 */
export const GPS_COHERENCE_METRES = 150;

/**
 * How close two trees have to be before the pair is worth a second look.
 *
 * Three metres is roughly the crown of a young fruit tree, so two trunks that
 * close are either a genuinely dense planting or the same tree entered twice --
 * which is what happens when a form is submitted, the answer is lost on a bad
 * connection, and the guardian fills it in again. It is emphatically not a
 * rule against planting densely, which is why it flags and does not refuse.
 */
export const DUPLICATE_RADIUS_METRES = 3;

/** Row of `public.registration_flags`: one signal about one tree. */
export type RegistrationFlag = {
  id: Uuid;
  treeId: Uuid;
  reason: RegistrationFlagReason;
  /**
   * The measurement that raised it -- metres of separation for both distance
   * reasons, null when there was nothing to measure.
   */
  distanceMetres: number | null;
  /** The other tree, when the reason is a duplicate. */
  relatedTreeId: Uuid | null;
  createdAt: IsoDateTime;
  resolution: RegistrationFlagResolution | null;
  resolvedBy: Uuid | null;
  resolvedAt: IsoDateTime | null;
  resolutionNote: string | null;
};

/**
 * A row of `registration_review_queue()`: one flagged tree with enough context
 * for a coordinator to judge it without opening anything else.
 */
export type FlaggedRegistration = {
  flagId: Uuid;
  treeId: Uuid;
  code: string;
  speciesName: string;
  villageName: string | null;
  municipalityName: string | null;
  guardianId: Uuid | null;
  /** Given name and surname initial. Never the email. */
  guardianDisplayName: string | null;
  reason: RegistrationFlagReason;
  distanceMetres: number | null;
  relatedTreeId: Uuid | null;
  relatedTreeCode: string | null;
  plantedAt: string;
  flaggedAt: IsoDateTime;
  /** Newest photograph as an object key; the panel signs it when it renders. */
  photoPath: string | null;
};

/**
 * Metres between two coordinates on the haversine sphere.
 *
 * The client's copy of what PostGIS computes on the server. It exists so the
 * phone can tell a guardian "la foto se tomó a 240 m del punto que marcaste"
 * while the registration is still on screen, instead of leaving them to find
 * out from a coordinator weeks later. The server measures again and its answer
 * is the one that is stored: this is an explanation, never the decision.
 */
export function distanceMetres(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const EARTH_RADIUS_METRES = 6371008.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);

  const chord =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(chord)));
}
