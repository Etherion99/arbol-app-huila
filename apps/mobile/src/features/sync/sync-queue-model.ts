import { z } from 'zod/v4';

/**
 * What the offline write queue is made of, and the rules that decide what runs
 * next.
 *
 * Everything in this file is a value or a pure function over one. It imports no
 * platform: no file system, no network, no React, no clock of its own. That is
 * deliberate and it is what `pnpm test:offline` depends on -- the ordering, the
 * backoff and the reading of a failure are the parts that are hard to get right
 * and impossible to exercise on a phone in a vereda, so they are kept where a
 * plain Node process can drive them against a fake clock.
 *
 * ## What is in the queue and what is not
 *
 * A job carries the *fields of the write*, never the write itself. The
 * photographs stay where the photo pipeline put them, in the app's document
 * directory, and the job holds their URIs. A queue file that inlined two
 * hundred kilobytes of JPEG per entry would be rewritten in full on every
 * attempt, and a phone that lost power mid-write would lose the photographs
 * along with the queue.
 *
 * ## What happens when the queue grows for weeks without signal
 *
 * Nothing is dropped. Not by age, not by size, not by attempt count. A guardian
 * who walked to eleven trees over three weekends has eleven photographs on
 * their phone and no way to take them again, so the only correct behaviour is
 * to keep them until the server confirms each one.
 *
 * What the queue does instead is bounded and visible:
 *
 * - **The retry interval is capped**, so an outage costs a fixed trickle of
 *   attempts rather than a growing one. Attempts only happen when the radio
 *   says there is a connection at all, so a week in a vereda costs none.
 * - **Past `QUEUE_ADVISORY_JOBS` or `QUEUE_ADVISORY_BYTES` the guardian is
 *   told**, on the screen that lists what is waiting, that this phone is
 *   carrying a lot of unsent work and should be taken somewhere with signal.
 *   It is a sentence, not a refusal: the alternative is telling somebody
 *   standing in front of a tree that they may not register it.
 * - **A job that can never succeed stops retrying** and says why, with the two
 *   actions that are actually the guardian's -- try it again now, or throw it
 *   away. Deleting it is never the queue's decision.
 *
 * The arithmetic behind the advisory numbers: a compressed photograph is around
 * two hundred kilobytes and its thumbnail a tenth of that, so forty jobs is
 * roughly nine megabytes, and the byte ceiling bites first only for a guardian
 * whose photographs are consistently at the top of the compression budget.
 */

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

/** Wait after the first failure. Doubles from here. */
export const RETRY_BASE_DELAY_MS = 15_000;

/**
 * The ceiling on the wait between attempts.
 *
 * Fifteen minutes, not an hour: the case this has to serve well is a guardian
 * walking back down from a vereda, where signal returns for ninety seconds at a
 * bend in the road. A backoff that had already grown to an hour would sleep
 * through every one of those windows.
 */
export const RETRY_MAX_DELAY_MS = 15 * 60_000;

/**
 * How much of the wait is randomised.
 *
 * A whole school takes photographs on the same Saturday and comes back into
 * signal on the same bus. Without jitter their phones would retry in step and
 * turn a recovering connection into a burst.
 */
export const RETRY_JITTER = 0.25;

// ---------------------------------------------------------------------------
// Advisory ceilings
// ---------------------------------------------------------------------------

/** Above this many waiting jobs the pending screen says so. Never a refusal. */
export const QUEUE_ADVISORY_JOBS = 40;

/** The same warning by weight, for photographs at the top of the budget. */
export const QUEUE_ADVISORY_BYTES = 30 * 1024 * 1024;

// ---------------------------------------------------------------------------
// The shape on disk
// ---------------------------------------------------------------------------

/**
 * The photograph as the queue remembers it. The same fields `PreparedPhoto`
 * carries, restated here rather than imported, because this file may not reach
 * into the app's own modules and because what is written to disk has to be
 * parsed back rather than trusted.
 */
const preparedPhotoSchema = z.object({
  photoUri: z.string(),
  thumbnailUri: z.string(),
  photoBytes: z.number(),
  capturedAt: z.string(),
  captureLocation: z.object({ lat: z.number(), lng: z.number() }).nullable(),
});

/**
 * The rows a job's first stage produced, once they exist.
 *
 * This is the single most important field in the file. While it is null the job
 * still owes the database a write; the moment it is set, the write has happened
 * and every future attempt is only an upload to a key derived from it. It is
 * written to disk before the photograph is sent, which is what stops a retry
 * from planting the same tree twice.
 */
const jobTargetSchema = z.object({
  treeId: z.string(),
  /** The human code, when the write handed one back. Only ever shown. */
  code: z.string().nullable(),
  cycle: z.number().int(),
});

export type JobTarget = z.output<typeof jobTargetSchema>;

/**
 * The reason a job cannot finish, when the phone itself is the reason.
 *
 * It wears the same shape a SQLSTATE does so the card that has to explain it can
 * hand every failure to one function without caring which side noticed.
 */
export const MISSING_PHOTO = 'missing-photo';

/** Why a job stopped, in the form the pending card reads. */
const failureSchema = z.object({
  message: z.string(),
  /**
   * The SQLSTATE, when the failure came back with one, and `MISSING_PHOTO` when
   * this phone raised it. Kept beside the message rather than folded into it
   * because it is what lets the card say "esa vereda no existe" instead of "el
   * servidor no lo aceptó" -- the app already owns a sentence per code, and a
   * queued job should not lose access to it just by being stored.
   */
  code: z.string().nullable(),
  /**
   * True when trying again changes nothing: the tree belongs to somebody else,
   * the zone does not resolve, the photograph is no longer on the phone. The
   * job stops consuming attempts and waits for the guardian to decide.
   */
  isPermanent: z.boolean(),
  at: z.string(),
});

export type SyncFailure = z.output<typeof failureSchema>;

const jobBase = {
  id: z.string(),
  /**
   * Assigned once, at enqueue, and never reused. It is what "the cycle 2 entry
   * does not go up before the cycle 1 entry" actually means: order is a fact
   * about when the guardian saved the work, not about how the jobs happen to be
   * laid out in an array after a reload.
   */
  sequence: z.number().int(),
  createdAt: z.string(),
  attempts: z.number().int().min(0),
  lastAttemptAt: z.string().nullable(),
  nextAttemptAt: z.string(),
  failure: failureSchema.nullable(),
  /**
   * Set immediately before the database write is attempted and cleared only
   * when the answer arrives. Finding it set with no `target` on the next launch
   * means the process died in between, which is the one window where a job
   * cannot know whether its rows exist -- and is why the queue asks the server
   * instead of guessing.
   */
  submittedAt: z.string().nullable(),
  target: jobTargetSchema.nullable(),
  photo: preparedPhotoSchema,
};

const plantingJobSchema = z.object({
  ...jobBase,
  kind: z.literal('planting'),
  speciesRawText: z.string(),
  zoneId: z.string(),
  /** Only for the pending card, which cannot reach the zone catalogue offline. */
  villageName: z.string().nullable(),
  location: z.object({ lat: z.number(), lng: z.number() }),
  plantedAt: z.string(),
  heightCm: z.number().int(),
  visibleBranches: z.number().int(),
});

const logEntryJobSchema = z.object({
  ...jobBase,
  kind: z.literal('log_entry'),
  treeId: z.string(),
  /** How the tree is named on the pending card, captured when it was queued. */
  treeLabel: z.string(),
  cycle: z.number().int(),
  heightCm: z.number().int().nullable(),
  visibleBranches: z.number().int().nullable(),
  healthStatus: z.enum(['healthy', 'at_risk', 'sick', 'dead']),
  notes: z.string().nullable(),
});

export const syncJobSchema = z.discriminatedUnion('kind', [plantingJobSchema, logEntryJobSchema]);

export type SyncJob = z.output<typeof syncJobSchema>;
export type PlantingJob = z.output<typeof plantingJobSchema>;
export type LogEntryJob = z.output<typeof logEntryJobSchema>;

/** The bookkeeping the queue fills in, which a caller never supplies. */
type Bookkeeping =
  | 'id'
  | 'sequence'
  | 'createdAt'
  | 'attempts'
  | 'lastAttemptAt'
  | 'nextAttemptAt'
  | 'failure'
  | 'submittedAt'
  | 'target';

/** What a caller hands in when it saves a write for later. */
export type NewSyncJob = Omit<PlantingJob, Bookkeeping> | Omit<LogEntryJob, Bookkeeping>;

/**
 * The queue file.
 *
 * Versioned so a build that changes the shape can recognise a file it cannot
 * read. It is never silently discarded the way the planting draft is: a draft
 * is a form somebody can fill in again, and this is work that has already been
 * done and photographed.
 */
export const syncQueueFileSchema = z.object({
  version: z.literal(1),
  nextSequence: z.number().int(),
  jobs: z.array(syncJobSchema),
});

export type SyncQueueFile = z.output<typeof syncQueueFileSchema>;

export const QUEUE_FILE_VERSION = 1;

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/**
 * What two jobs have to queue behind each other for.
 *
 * A tree's entries are strictly ordered: the cycle number is part of the object
 * key and part of a unique index, and uploading cycle 2 first would give the
 * tree a growth series that reads backwards for as long as cycle 1 is still
 * waiting. Two different trees have nothing to do with each other and never
 * block one another -- one failing upload in a vereda must not hold up the ten
 * jobs behind it.
 *
 * A planting keys on itself until its rows exist, because until then there is
 * no tree to be second to.
 */
export function orderingKey(job: SyncJob): string {
  if (job.kind === 'log_entry') {
    return `tree:${job.treeId}`;
  }
  return job.target === null ? `planting:${job.id}` : `tree:${job.target.treeId}`;
}

/** Oldest first, by the sequence the guardian saved them in. */
export function bySequence(a: SyncJob, b: SyncJob): number {
  return a.sequence - b.sequence;
}

/** A job that has stopped on its own and is waiting for the guardian. */
export function isBlocked(job: SyncJob): boolean {
  return job.failure !== null && job.failure.isPermanent;
}

/**
 * The oldest job of each tree, which is the only one of that tree that may run.
 *
 * A blocked job keeps its place in the line rather than being skipped over.
 * Letting cycle 3 past a cycle 2 that will never land is exactly the reordering
 * the whole file exists to prevent: the tree's queue pauses until the guardian
 * decides what to do with the entry that failed.
 */
function headsByTree(jobs: readonly SyncJob[]): SyncJob[] {
  const heads = new Map<string, SyncJob>();

  for (const job of [...jobs].sort(bySequence)) {
    const key = orderingKey(job);
    if (!heads.has(key)) {
      heads.set(key, job);
    }
  }

  return [...heads.values()];
}

/**
 * The jobs the drain may attempt right now, in the order it must attempt them.
 *
 * Everything behind the head of a tree waits however many attempts the head
 * takes. A job that is backing off keeps its place; the queue for that tree
 * pauses rather than reshuffling.
 */
export function runnableJobs(jobs: readonly SyncJob[], nowMs: number): SyncJob[] {
  return headsByTree(jobs)
    .filter((job) => !isBlocked(job) && Date.parse(job.nextAttemptAt) <= nowMs)
    .sort(bySequence);
}

/**
 * How long until something becomes runnable, or null when nothing will without
 * a change of circumstances.
 *
 * Only the head of each tree is considered, for the same reason as above: a
 * cycle 3 sitting behind a backing off cycle 2 has a `nextAttemptAt` in the
 * past and would otherwise ask the drain to wake up immediately and do nothing.
 */
export function millisecondsUntilNextAttempt(
  jobs: readonly SyncJob[],
  nowMs: number,
): number | null {
  let soonest: number | null = null;

  for (const job of headsByTree(jobs)) {
    if (isBlocked(job)) {
      continue;
    }
    const delay = Math.max(0, Date.parse(job.nextAttemptAt) - nowMs);
    if (soonest === null || delay < soonest) {
      soonest = delay;
    }
  }

  return soonest;
}

// ---------------------------------------------------------------------------
// Backoff
// ---------------------------------------------------------------------------

/**
 * The wait before the next attempt, given how many have already failed.
 *
 * Doubling from fifteen seconds to a fifteen minute ceiling, with a quarter of
 * the interval randomised. `random` is a parameter rather than a call to
 * `Math.random` so the schedule is reproducible under test; the app passes the
 * real thing.
 */
export function backoffDelayMs(attempts: number, random: number): number {
  const exponent = Math.max(0, attempts - 1);
  const base = Math.min(RETRY_BASE_DELAY_MS * 2 ** exponent, RETRY_MAX_DELAY_MS);
  return Math.round(base * (1 + RETRY_JITTER * random));
}

// ---------------------------------------------------------------------------
// Reading a failure
// ---------------------------------------------------------------------------

/**
 * What a failure means for the job that hit it.
 *
 * - `duplicate` is not a failure at all. It is the unique index on
 *   `(tree_id, cycle)` reporting that an earlier attempt already landed and the
 *   answer never made it back to the phone. The row exists, so the only thing
 *   left is the upload.
 * - `permanent` is a refusal that repeating cannot change.
 * - `transient` is everything else, which in this app is mostly the radio.
 */
export type FailureClass = 'duplicate' | 'permanent' | 'transient';

/** SQLSTATE of a unique violation, which is how a duplicate cycle arrives. */
export const DUPLICATE_KEY = '23505';

/**
 * The SQLSTATEs a retry cannot argue with.
 *
 * `42501` is a row level policy refusing the write -- a tree that belongs to
 * somebody else. `22023` is a zone or a species the function will not resolve.
 * `23514` is a check constraint, which is a form the database will never accept
 * in that shape. `23503` is a foreign key to a row that is not there, and
 * `54000` is a municipality whose code range is full.
 *
 * Deliberately absent: anything about the network, and anything without a
 * SQLSTATE at all. A `fetch` that never arrived has no code, and treating an
 * unrecognised failure as permanent would strand work on the phone the first
 * time an unfamiliar error came back.
 */
const PERMANENT_CODES = new Set(['42501', '22023', '23514', '23503', '54000']);

/** The SQLSTATE a failure arrived with, when it arrived with one. */
export function failureCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function classifyFailure(error: unknown): FailureClass {
  const code = failureCode(error);

  if (code === DUPLICATE_KEY) {
    return 'duplicate';
  }
  if (code !== null && PERMANENT_CODES.has(code)) {
    return 'permanent';
  }
  return 'transient';
}

/** The message a failure carries, for the card that has to explain itself. */
export function failureMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }
  return String(error);
}

/**
 * The rows a duplicate proves already exist.
 *
 * A log entry knows its own tree and cycle before it is sent -- that is why the
 * object key can be built in advance -- so a unique violation identifies the
 * row completely and the job can move straight to the upload. A planting knows
 * neither until `register_tree` answers, so for it a duplicate identifies
 * nothing and is treated as an ordinary failure to try again.
 */
export function targetProvenByDuplicate(job: SyncJob): JobTarget | null {
  if (job.kind !== 'log_entry') {
    return null;
  }
  return { treeId: job.treeId, code: null, cycle: job.cycle };
}

// ---------------------------------------------------------------------------
// Reading the queue as a whole
// ---------------------------------------------------------------------------

/** Roughly what the queue is carrying. Thumbnails are not counted. */
export function queuedBytes(jobs: readonly SyncJob[]): number {
  return jobs.reduce((total, job) => total + job.photo.photoBytes, 0);
}

/** Whether the pending screen should say this phone is carrying a lot. */
export function isOverAdvisoryLimit(jobs: readonly SyncJob[]): boolean {
  return jobs.length > QUEUE_ADVISORY_JOBS || queuedBytes(jobs) > QUEUE_ADVISORY_BYTES;
}

/** The queued entries belonging to one tree, for the badge on its card. */
export function jobsForTree(jobs: readonly SyncJob[], treeId: string): SyncJob[] {
  return jobs.filter((job) => job.kind === 'log_entry' && job.treeId === treeId).sort(bySequence);
}
