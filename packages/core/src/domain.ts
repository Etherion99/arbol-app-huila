/**
 * Domain types for ÁrbolApp Huila, shared by the mobile app and the web panel
 * so both speak the same vocabulary.
 *
 * These mirror the database schema in `supabase/migrations`. Schema and types
 * move together: a migration that changes a column changes this file in the
 * same commit, or the two drift and nothing catches it until runtime.
 */

/** UUID primary key, as it travels over the wire. */
export type Uuid = string;

/** `timestamptz` serialised by PostgREST. Always UTC; shown in Colombian time. */
export type IsoDateTime = string;

/** `date` serialised by PostgREST, without a time part. */
export type IsoDate = string;

/** Status of the tree out in the field. */
export type TreeStatus = 'alive' | 'at_risk' | 'dead' | 'replanted';

/** Health reported by the guardian on each log entry. */
export type HealthStatus = 'healthy' | 'at_risk' | 'sick' | 'dead';

/** Status of the bimonthly update cycle, used to paint the map marker. */
export type TrackingStatus = 'up_to_date' | 'due_soon' | 'overdue' | 'archived' | 'dead';

export type UserRole = 'guardian' | 'coordinator';

export type ZoneType = 'department' | 'municipality' | 'village';

/** Which step of the reminder escalation a notification belongs to. */
export type ReminderKind = 'cycle' | 'follow_up_7d' | 'follow_up_21d' | 'overdue';

/** Platform of a registered installation, as Expo reports it. */
export type DevicePlatform = 'android' | 'ios';

/** How often a guardian is asked to update the growth log. */
export const MONTHS_BETWEEN_UPDATES = 2;

/**
 * How long before the due date a tree starts showing as `due_soon`. Mirrors
 * the threshold in the `tree_tracking` view; changing one means changing both.
 */
export const DAYS_BEFORE_DUE_SOON = 15;

/** Days after the due date on which the guardian is reminded again. */
export const REMINDER_FOLLOW_UP_DAYS = [7, 21] as const;

/** Days after the due date on which the tree is flagged as overdue. */
export const DAYS_UNTIL_OVERDUE = 30;

/**
 * Time zone every reminder is reckoned in.
 *
 * The database has its own copy of this inside `next_reminder_after()`, which
 * is the single place the cadence and the zone are written down on that side.
 * This constant exists because the sweep has to be *scheduled* as well as
 * computed, and `pg_cron` takes a plain UTC expression with no zone of its own:
 * something has to know that 08:00 in Colombia is 13:00 in UTC.
 *
 * The two copies must agree exactly, and `pnpm test:reminders` compares them
 * against the live schedule -- the same arrangement `normalizeSpecies()` and
 * `normalize_species()` already live under, for the same reason: a silent
 * drift here would move every reminder an hour without anything raising.
 */
export const REMINDER_TIME_ZONE = 'America/Bogota';

/**
 * Hour of the Colombian morning the sweep runs at. Early enough that a
 * guardian reads it before going out to the plot, late enough that it is not
 * a phone buzzing in the dark.
 */
export const REMINDER_DISPATCH_HOUR = 8;

/**
 * How many days after the due date each step of the escalation goes out on.
 *
 * Derived from the two constants above rather than restated, so the ladder can
 * never disagree with them. `public.reminder_offset_days()` is the database's
 * copy and `pnpm test:reminders` compares the two.
 */
export const REMINDER_OFFSET_DAYS: Readonly<Record<ReminderKind, number>> = {
  cycle: 0,
  follow_up_7d: REMINDER_FOLLOW_UP_DAYS[0],
  follow_up_21d: REMINDER_FOLLOW_UP_DAYS[1],
  overdue: DAYS_UNTIL_OVERDUE,
};

/**
 * Escalation steps in the order they fire. Reading the order off the offsets
 * rather than writing it out again means adding a step is one edit.
 */
export const REMINDER_LADDER = (Object.keys(REMINDER_OFFSET_DAYS) as ReminderKind[]).sort(
  (left, right) => REMINDER_OFFSET_DAYS[left] - REMINDER_OFFSET_DAYS[right],
);

/** The step of the escalation that copies the coordinator in. */
export const REMINDER_KIND_WITH_COORDINATOR_COPY: ReminderKind = 'follow_up_21d';

/** Bucket holding every growth log photograph. */
export const GROWTH_LOG_BUCKET = 'growth-log-photos';

/**
 * What a growth log photograph is allowed to weigh once the client has
 * compressed it.
 *
 * This is not an optimisation, it is the budget. The free storage plan gives
 * one gigabyte for the whole year and a camera original is around four
 * megabytes, so uploading untouched photographs exhausts the allowance inside
 * the first semester. At roughly 200 KB a tree updated six times a year costs
 * little over a megabyte, and the project fits with room to spare.
 */
export const PHOTO_TARGET_BYTES = 200 * 1024;

/**
 * The bucket's own ceiling, mirrored here so the client can refuse before
 * spending a rural upload on something Storage will reject anyway.
 */
export const PHOTO_MAX_BYTES = 1024 * 1024;

/**
 * Longest edge of the uploaded photograph. Enough to read a leaf and count a
 * branch on a phone screen, far below what the camera produces.
 */
export const PHOTO_MAX_EDGE_PX = 1280;

/** Side of the square thumbnail the timeline and the lists load. */
export const THUMBNAIL_SIZE_PX = 300;

/**
 * JPEG qualities tried in order until the result fits the budget. Starting
 * high and stepping down keeps a well lit photograph sharp and only punishes
 * the noisy ones, which are the heavy ones to begin with.
 */
export const PHOTO_QUALITY_LADDER = [0.72, 0.6, 0.48, 0.36, 0.26] as const;

/**
 * Fields every archivable record carries. Nothing is ever deleted: a record
 * that is gone is archived, and every public query filters `archivedAt` out.
 */
export type ArchiveFields = {
  archivedAt: IsoDateTime | null;
  archivedBy: Uuid | null;
  archiveReason: string | null;
};

/** Row of `public.users`. The email is only ever readable by its owner and by a coordinator. */
export type User = ArchiveFields & {
  id: Uuid;
  fullName: string;
  email: string;
  role: UserRole;
  institution: string | null;
  isAdultConfirmed: boolean;
  termsAcceptedAt: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/**
 * Row of the `public.public_users` view: what anyone may know about a guardian.
 * Deliberately without the email, which no public endpoint exposes.
 */
export type PublicUser = {
  id: Uuid;
  fullName: string;
  role: UserRole;
  institution: string | null;
  createdAt: IsoDateTime;
};

/** A point on the map, in the order PostGIS reports it. */
export type Coordinates = {
  lng: number;
  lat: number;
};

/** Row of `public.zones`: the department, municipality and village catalogue. */
export type Zone = ArchiveFields & {
  id: Uuid;
  parentId: Uuid | null;
  type: ZoneType;
  name: string;
  slug: string;
  divipolaCode: string | null;
  /** Centre used to frame the map, since the real outlines do not exist yet. */
  centroid: Coordinates | null;
  suggestedZoom: number | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Row of `public.species`. Counts are taken over `normalizedKey`, never over the raw text. */
export type Species = ArchiveFields & {
  id: Uuid;
  normalizedKey: string;
  canonicalName: string;
  /** Set once this species has been folded into another one. */
  mergedIntoId: Uuid | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Row of `public.species_merges`: the audit trail that makes a merge reversible. */
export type SpeciesMerge = {
  id: Uuid;
  sourceSpeciesId: Uuid;
  targetSpeciesId: Uuid;
  performedBy: Uuid;
  performedAt: IsoDateTime;
  /** Exactly which trees were relabelled, which is what an exact revert needs. */
  affectedTreeIds: Uuid[];
  affectedTreeCount: number;
  /**
   * Display name the target carried before the merge. A merge may rename the
   * surviving group to anything at all, so without this a revert could not put
   * the previous name back.
   */
  previousCanonicalName: string | null;
  revertedAt: IsoDateTime | null;
  revertedBy: Uuid | null;
};

/**
 * A row of `species_suggestions`, the autocomplete behind the free text species
 * field. Ordered by how many trees already carry each name, which is what makes
 * the spellings converge on their own without anything being rewritten.
 */
export type SpeciesSuggestion = {
  speciesId: Uuid;
  canonicalName: string;
  normalizedKey: string;
  treeCount: number;
};

/** Row of `public.trees`. */
export type Tree = ArchiveFields & {
  id: Uuid;
  /** Human readable identifier such as `HUI-LP-0042`. */
  code: string;
  /** Null when the guardian left the project and nobody has taken over yet. */
  guardianId: Uuid | null;
  speciesId: Uuid;
  /** Exactly what the guardian typed. Never modified, not even by a merge. */
  speciesRawText: string;
  location: Coordinates;
  zoneId: Uuid;
  plantedAt: IsoDate;
  status: TreeStatus;
  /** Capture time of the most recent log entry, not its upload time. */
  lastUpdatedAt: IsoDateTime;
  /** Generated in the database from `lastUpdatedAt`; never written by a client. */
  nextReminderAt: IsoDateTime;
  replacesTreeId: Uuid | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Row of `public.log_entries`. The planting record is cycle 1 of this table. */
export type LogEntry = ArchiveFields & {
  id: Uuid;
  treeId: Uuid;
  authorId: Uuid;
  cycle: number;
  photoPath: string;
  thumbnailPath: string;
  /** Read from the photo EXIF, not from the moment the upload succeeded. */
  capturedAt: IsoDateTime;
  captureLocation: Coordinates | null;
  /** Null only when the entry reports the tree as dead. */
  heightCm: number | null;
  visibleBranches: number | null;
  healthStatus: HealthStatus;
  notes: string | null;
  /** Derived in the database from `capturedAt`; never reported by the client. */
  onTime: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Row of `public.devices`: one Expo push token per installation. */
export type Device = {
  id: Uuid;
  userId: Uuid;
  expoPushToken: string;
  platform: DevicePlatform;
  isActive: boolean;
  lastSeenAt: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Row of `public.reminders`: one per notification actually sent. */
export type Reminder = {
  id: Uuid;
  treeId: Uuid;
  userId: Uuid;
  kind: ReminderKind;
  /** Growth log cycle being asked for. Part of what makes the cron idempotent. */
  cycle: number;
  sentAt: IsoDateTime;
  openedAt: IsoDateTime | null;
  resolvedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
};

/**
 * Row of `public.notification_preferences`: whether a guardian wants to be
 * reached at all, and about what.
 *
 * It is a table of its own rather than two columns on `users` because the
 * select privilege on `users` is granted column by column to `anon` as well as
 * to `authenticated`, and a preference is nobody's business but its owner's.
 * Adding the columns there would mean either handing them to `anon` or
 * splitting that grant into two audiences, and every column added afterwards
 * would have to remember which side it belonged on. Here the answer is a row
 * check, and the table starts out unreachable by `anon` exactly like `devices`
 * and `reminders`.
 *
 * It is keyed by guardian rather than by installation because turning
 * reminders off means "stop asking me", not "stop asking me on the tablet".
 * Whether a given installation can still be reached is `Device.isActive`,
 * which is a delivery fact rather than a choice.
 */
export type NotificationPreferences = {
  userId: Uuid;
  wantsGrowthLogReminders: boolean;
  wantsCoordinatorNotices: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/**
 * What a guardian is assumed to want before they have ever opened the settings
 * screen. Absent row and this object mean the same thing, which is what lets
 * the preference exist without a backfill over everybody who signed up first.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  wantsGrowthLogReminders: true,
  wantsCoordinatorNotices: true,
} as const;

/**
 * A row of `reminder_feed()`: one reminder the guardian was actually sent,
 * with enough of its tree to name it.
 */
export type ReminderFeedItem = {
  reminderId: Uuid;
  treeId: Uuid;
  speciesName: string;
  code: string;
  kind: ReminderKind;
  cycle: number;
  sentAt: IsoDateTime;
  openedAt: IsoDateTime | null;
  resolvedAt: IsoDateTime | null;
};

/**
 * A row of `trees_in_viewport`: everything needed to paint one marker and
 * nothing else. The card is fetched separately when the marker is tapped.
 */
export type TreeMarker = {
  treeId: Uuid;
  lng: number;
  lat: number;
  trackingStatus: TrackingStatus;
  speciesId: Uuid;
  speciesName: string;
};

/**
 * A row of `tree_card`: everything the floating card on the map shows when a
 * marker is tapped, and nothing the map itself needs.
 *
 * The photograph travels as an object key rather than a URL. The bucket is
 * private, so a usable link has to be signed, and that happens once the card is
 * open -- signing one per visible marker would be hundreds of requests to paint
 * a screen most of which nobody taps.
 */
export type TreeCardSummary = {
  treeId: Uuid;
  code: string;
  speciesId: Uuid;
  speciesName: string;
  /** Exactly what the guardian typed, never rewritten. */
  speciesRawText: string;
  trackingStatus: TrackingStatus;
  status: TreeStatus;
  plantedAt: IsoDate;
  lastUpdatedAt: IsoDateTime;
  nextReminderAt: IsoDateTime;
  /** Where the tree stands, which is what the detail screen's mini map draws. */
  lng: number;
  lat: number;
  guardianId: Uuid | null;
  /**
   * Given name and the initial of the last surname, built in the database by
   * `short_display_name()`. The email is not part of this payload and is not
   * reachable from it.
   */
  guardianDisplayName: string | null;
  /** When the guardian joined, which is what "guardián desde 2025" reads from. */
  guardianSince: IsoDateTime | null;
  villageName: string | null;
  municipalityName: string | null;
  /** Null when the tree has no growth log entry yet. */
  latestCycle: number | null;
  latestPhotoPath: string | null;
  latestThumbnailPath: string | null;
};

/**
 * A row of `guardian_trees()`: one card in the "Mis árboles" tab.
 *
 * Like the map card, the photograph travels as an object key rather than a
 * URL. The bucket is private, and signing one link per row before the list is
 * even on screen would be a round trip per tree just to paint it.
 */
export type GuardianTreeSummary = {
  treeId: Uuid;
  code: string;
  speciesName: string;
  /** Exactly what the guardian typed, never rewritten. */
  speciesRawText: string;
  trackingStatus: TrackingStatus;
  status: TreeStatus;
  plantedAt: IsoDate;
  lastUpdatedAt: IsoDateTime;
  nextReminderAt: IsoDateTime;
  villageName: string | null;
  municipalityName: string | null;
  /** Null when the tree has no growth log entry yet. */
  latestCycle: number | null;
  latestThumbnailPath: string | null;
};

/**
 * What `register_tree()` hands back: the tree it created, and the exact object
 * keys its photograph has to be uploaded to.
 *
 * The keys come from the database rather than being rebuilt on the client, even
 * though `growthLogPhotoPath()` below produces the same string, so the two can
 * never disagree about where a photograph lives. The row is written first and
 * the photograph sent after, because the storage policies read ownership out of
 * the object name and there is no tree to own it until the row exists.
 */
export type TreeRegistration = {
  treeId: Uuid;
  code: string;
  cycle: number;
  photoPath: string;
  thumbnailPath: string;
};

/** Arguments of the `trees_in_viewport` function. */
export type ViewportQuery = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zoom: number;
  speciesFilter?: Uuid[] | null;
  zoneFilter?: Uuid[] | null;
};

/** Row of the `public.tree_overview` view, the base of every report. */
export type TreeOverview = {
  treeId: Uuid;
  code: string;
  status: TreeStatus;
  plantedAt: IsoDate;
  lastUpdatedAt: IsoDateTime;
  nextReminderAt: IsoDateTime;
  guardianId: Uuid | null;
  speciesId: Uuid;
  speciesName: string;
  speciesKey: string;
  departmentId: Uuid | null;
  departmentName: string | null;
  municipalityId: Uuid | null;
  municipalityName: string | null;
  villageId: Uuid | null;
  villageName: string | null;
  trackingStatus: TrackingStatus;
  /** Entries after the planting one, which is the only fair punctuality base. */
  followUpTotal: number;
  onTimeTotal: number;
};

/** Figures every statistics view reports, whatever it groups by. */
export type StatisticsTotals = {
  plantedTotal: number;
  aliveTotal: number;
  deadTotal: number;
  /** Percentage with one decimal. Null when nothing has been planted yet. */
  survivalRate: number | null;
  /** Percentage with one decimal. Null until a follow up entry exists. */
  onTimeRate: number | null;
  overdueTotal: number;
};

/** Row of `public.statistics_overview`. */
export type StatisticsOverview = StatisticsTotals & {
  replantedTotal: number;
};

/** Row of `public.statistics_by_municipality`. */
export type MunicipalityStatistics = StatisticsTotals & {
  municipalityId: Uuid | null;
  municipalityName: string | null;
  departmentName: string | null;
};

/** Row of `public.statistics_by_village`. */
export type VillageStatistics = StatisticsTotals & {
  villageId: Uuid | null;
  villageName: string | null;
  municipalityId: Uuid | null;
  municipalityName: string | null;
};

/** Row of `public.statistics_by_species`, grouped by the normalized key. */
export type SpeciesStatistics = Omit<StatisticsTotals, 'overdueTotal'> & {
  speciesId: Uuid;
  speciesKey: string;
  speciesName: string;
};

/**
 * Object key of the photograph for a cycle, following the convention the
 * storage policies read ownership from: the tree identifier comes first.
 */
export function growthLogPhotoPath(treeId: Uuid, cycle: number): string {
  return `${treeId}/${cycle}/photo.jpg`;
}

/** Object key of the thumbnail for a cycle, alongside its photograph. */
export function growthLogThumbnailPath(treeId: Uuid, cycle: number): string {
  return `${treeId}/${cycle}/thumbnail.jpg`;
}

/**
 * Builds the grouping key for a species name typed by hand, so the per-species
 * count adds up. The text the guardian actually wrote is stored separately and
 * never altered: this key exists only for grouping.
 *
 * `  MANDARINO ` and `Mandarino` collapse into the same key.
 *
 * It folds only what is unambiguously the same word written carelessly: case,
 * accents and stray whitespace. It deliberately does **not** touch plurals.
 * Stripping a trailing `s` looks harmless and is not: it turns `hass` into
 * `has` and `limones` into `limone`, inventing keys that match no real name,
 * and it cannot tell a plural from a word that simply ends in `s`. Deciding
 * that `mandarino` and `mandarina` are one species is a judgement about the
 * real world, so it belongs to the coordinator merging them by hand, not to a
 * string rule. See `merge_species()` in the database.
 *
 * The database has its own copy of this in `public.normalize_species()`. The
 * two must agree exactly, because a species is counted over the key and a
 * disagreement would split one species into two rows of the report without
 * raising anything. `pnpm test:species` compares them over a list of variants.
 */
export function normalizeSpecies(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
