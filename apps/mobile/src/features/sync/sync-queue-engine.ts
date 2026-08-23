import {
  backoffDelayMs,
  bySequence,
  classifyFailure,
  failureCode,
  failureMessage,
  isBlocked,
  isOverAdvisoryLimit,
  millisecondsUntilNextAttempt,
  orderingKey,
  queuedBytes,
  runnableJobs,
  syncQueueFileSchema,
  targetProvenByDuplicate,
  MISSING_PHOTO,
  QUEUE_FILE_VERSION,
  RETRY_BASE_DELAY_MS,
  type JobTarget,
  type NewSyncJob,
  type SyncJob,
} from './sync-queue-model';

/**
 * The queue itself: what is waiting, and the loop that empties it.
 *
 * Like the model beside it, this file touches no platform. Everything it needs
 * from the outside arrives as a port -- somewhere to keep bytes, something that
 * can talk to the server, a clock -- so the same code runs on a phone with
 * expo-file-system and Supabase behind it and in a Node process with a fake
 * radio behind it. `pnpm test:offline` drives this module, not a copy of it.
 *
 * ## The one order that is safe
 *
 * Rows first, photograph second, and the answer to the first written to disk
 * before the second is attempted. The storage policies read a tree id out of
 * the object name, so nothing can be uploaded until the row that owns it
 * exists; and if the two were the other way round a failure in between would
 * leave an object nobody could reach. What this order costs is a job that is
 * half done -- rows on the server, photograph still on the phone -- and that is
 * exactly the state a queue is good at: `target` records it, and the retry is a
 * plain re-upload to a key that is a pure function of the tree and the cycle.
 *
 * ## Nothing leaves the queue on a guess
 *
 * A job is removed in one place, after the upload resolves. Not after the rows
 * land, not after a timeout, not because it has failed too often. The
 * photograph is deleted from the phone in the same breath and never before.
 *
 * ## One at a time
 *
 * The drain runs jobs sequentially. A vereda connection does not get faster by
 * being asked for four uploads at once, and running one at a time makes the
 * per-tree ordering a property of the loop rather than something that has to be
 * defended against races.
 */

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

/** Somewhere durable to keep one small document. */
export type QueueStorage = {
  read(): string | null;
  write(text: string): void;
};

/**
 * Everything the queue needs the outside world for.
 *
 * The split between `submit` and `upload` is the row/photograph boundary; the
 * split between `submit` and `recover` is the crash window. `canSubmit` is the
 * gate: no signal, or no session, and the drain does not spend an attempt.
 */
export type QueueTransport = {
  /** Whether anything may be sent at all. Checked before every single job. */
  canSubmit(): boolean;
  /** Writes the rows of a job that has none yet, and says what they are. */
  submit(job: SyncJob): Promise<JobTarget>;
  /**
   * Asks the server whether an interrupted attempt actually landed.
   *
   * Called only for a job whose `submittedAt` survived a restart with no
   * `target` beside it. Resolving to null means the write never committed and
   * the job may safely be sent again.
   */
  recover(job: SyncJob): Promise<JobTarget | null>;
  /** Sends the photograph and its thumbnail for the cycle the rows named. */
  upload(job: SyncJob, target: JobTarget): Promise<void>;
  /** Whether the prepared photograph is still on this phone. */
  hasPhoto(job: SyncJob): boolean;
  /** Removes the photograph, once the bytes are in the bucket and not before. */
  discardPhoto(job: SyncJob): void;
};

/** Time, as something the tests can move by hand. */
export type QueueClock = {
  now(): number;
  /** Runs `run` after `delayMs`. The returned function cancels it. */
  schedule(delayMs: number, run: () => void): () => void;
  /** A number in [0, 1), for the jitter on the backoff. */
  random(): number;
};

export type SyncQueuePorts = {
  storage: QueueStorage;
  transport: QueueTransport;
  clock: QueueClock;
  /** Ids only have to be unique on one phone. */
  newId: () => string;
  /**
   * Called once per job that reached the bucket, so the app can refresh the
   * screens that just became wrong. The queue itself knows nothing about
   * caches, and a failure here never affects the job.
   */
  onCompleted?: (job: SyncJob, target: JobTarget) => void;
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Where one job stands, as the pending card words it.
 *
 * `waiting` is the ordering rule made visible: this entry is fine, it is simply
 * behind an older one for the same tree. Saying that plainly is what stops a
 * guardian from reading a queue that is working as a queue that is stuck.
 */
export type SyncJobStatus = 'sending' | 'retrying' | 'blocked' | 'waiting' | 'queued';

export type SyncQueueState = {
  /** False until the file has been read, so nothing counts too early. */
  isLoaded: boolean;
  jobs: readonly SyncJob[];
  /** The job the drain is inside right now, if any. */
  sendingJobId: string | null;
  /** True while this phone is carrying more than it comfortably should. */
  isOverAdvisoryLimit: boolean;
  /** Roughly the weight of the photographs still waiting. */
  queuedBytes: number;
};

const EMPTY_STATE: SyncQueueState = {
  isLoaded: false,
  jobs: [],
  sendingJobId: null,
  isOverAdvisoryLimit: false,
  queuedBytes: 0,
};

export function statusOf(state: SyncQueueState, job: SyncJob): SyncJobStatus {
  if (state.sendingJobId === job.id) {
    return 'sending';
  }
  if (isBlocked(job)) {
    return 'blocked';
  }

  // Behind an older job for the same tree. Checked before `retrying` so an
  // entry that has never been attempted is not described as failing because
  // the one in front of it is.
  const key = orderingKey(job);
  const head = [...state.jobs].sort(bySequence).find((other) => orderingKey(other) === key);
  if (head !== undefined && head.id !== job.id) {
    return 'waiting';
  }

  return job.failure === null ? 'queued' : 'retrying';
}

/**
 * How a wait on one job ended.
 *
 * `sent` is the only outcome that means the server has it, and it is the only
 * one that carries a `target` -- which is what the screen needs to show the
 * guardian their tree's code and its next photograph date. Every other outcome
 * is the job still being in the queue, described as it stands.
 */
export type SettledJob = {
  outcome: 'sent' | SyncJobStatus;
  target: JobTarget | null;
};

export type SyncQueue = {
  getState(): SyncQueueState;
  subscribe(listener: () => void): () => void;
  /** Reads the file. Safe to call repeatedly; only the first call does work. */
  load(): void;
  /** Saves a write for later and kicks the drain. Never refuses. */
  enqueue(request: NewSyncJob): SyncJob;
  /** Attempts everything that is due, oldest first, one at a time. */
  drain(): Promise<void>;
  /**
   * Drains, and resolves when this job has left the queue, has blocked, or the
   * wait has run out. What the planting wizard awaits so it can tell the
   * guardian which of the two things happened.
   */
  settle(id: string, timeoutMs: number): Promise<SettledJob>;
  /** The guardian pressing "try again" on a job that stopped. */
  retryNow(id: string): void;
  /** The guardian throwing a job away. The only path that drops unsent work. */
  discard(id: string): void;
};

export function createSyncQueue({
  storage,
  transport,
  clock,
  newId,
  onCompleted,
}: SyncQueuePorts): SyncQueue {
  let state: SyncQueueState = EMPTY_STATE;
  let nextSequence = 1;
  const listeners = new Set<() => void>();

  let isDraining = false;
  let shouldDrainAgain = false;
  let cancelWakeUp: (() => void) | null = null;

  /**
   * The rows of the jobs that just finished, kept only long enough for whoever
   * was waiting on one to read them.
   *
   * A job is removed from the queue the instant its photograph lands, so by the
   * time `settle` notices it is gone there is nothing left to ask which tree it
   * became. This is that answer. It is in memory only -- a delivered job is the
   * server's business from then on -- and it is capped, because nothing ever
   * comes along to clear it.
   */
  const delivered = new Map<string, JobTarget>();
  const DELIVERED_MEMORY = 20;

  // ---------------------------------------------------------------------
  // Bookkeeping
  // ---------------------------------------------------------------------

  function emit(next: Partial<SyncQueueState>) {
    const jobs = next.jobs ?? state.jobs;

    state = {
      ...state,
      ...next,
      jobs,
      isOverAdvisoryLimit: isOverAdvisoryLimit(jobs),
      queuedBytes: queuedBytes(jobs),
    };

    for (const listener of listeners) {
      listener();
    }
  }

  /**
   * Writes the queue to disk.
   *
   * A failure here is swallowed on purpose and is not the same kind of loss as
   * a failed upload: the jobs are still correct in memory and the drain that is
   * probably already running will still send them. What is lost is surviving a
   * restart, and there is nothing a guardian could do about it in the moment.
   */
  function persist() {
    try {
      storage.write(
        JSON.stringify({
          version: QUEUE_FILE_VERSION,
          nextSequence,
          jobs: state.jobs,
        }),
      );
    } catch {
      // Nothing to say and nothing to undo.
    }
  }

  function replace(jobs: readonly SyncJob[], sendingJobId?: string | null) {
    emit(sendingJobId === undefined ? { jobs } : { jobs, sendingJobId });
    persist();
  }

  /** Applies a change to one job, in place, keeping the order untouched. */
  function patch(id: string, change: Partial<SyncJob>): SyncJob | null {
    let updated: SyncJob | null = null;

    const jobs = state.jobs.map((job) => {
      if (job.id !== id) {
        return job;
      }
      // The cast is the price of a discriminated union: `kind` is never in a
      // patch, so the result is the same member it started as.
      updated = { ...job, ...change } as SyncJob;
      return updated;
    });

    if (updated === null) {
      return null;
    }

    replace(jobs);
    return updated;
  }

  function remove(id: string) {
    replace(
      state.jobs.filter((job) => job.id !== id),
      state.sendingJobId === id ? null : state.sendingJobId,
    );
  }

  // ---------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------

  function load() {
    if (state.isLoaded) {
      return;
    }

    try {
      const raw = storage.read();

      if (raw === null) {
        emit({ isLoaded: true, jobs: [] });
        return;
      }

      const parsed = syncQueueFileSchema.safeParse(JSON.parse(raw));

      if (!parsed.success) {
        // Unlike the planting draft, this file is never thrown away when it
        // cannot be read: it stands for photographs that have already been
        // taken. It is left exactly where it is, so a build that understands it
        // -- a rollback, or a migration written later -- still finds it, and the
        // app carries on with an empty queue rather than refusing to start.
        emit({ isLoaded: true, jobs: [] });
        return;
      }

      nextSequence = parsed.data.nextSequence;

      // Any job the process died inside is no longer sending. `submittedAt`
      // stays: it is the flag that tells the next attempt to ask the server
      // what happened rather than write the rows a second time.
      emit({ isLoaded: true, jobs: [...parsed.data.jobs].sort(bySequence), sendingJobId: null });
    } catch {
      emit({ isLoaded: true, jobs: [] });
    }
  }

  // ---------------------------------------------------------------------
  // Enqueue
  // ---------------------------------------------------------------------

  function enqueue(request: NewSyncJob): SyncJob {
    load();

    const nowIso = new Date(clock.now()).toISOString();

    const job = {
      ...request,
      id: newId(),
      sequence: nextSequence,
      createdAt: nowIso,
      attempts: 0,
      lastAttemptAt: null,
      nextAttemptAt: nowIso,
      failure: null,
      submittedAt: null,
      target: null,
    } as SyncJob;

    nextSequence += 1;
    replace([...state.jobs, job]);

    void drain();

    return job;
  }

  // ---------------------------------------------------------------------
  // Failure handling
  // ---------------------------------------------------------------------

  function failTransiently(job: SyncJob, error: unknown) {
    // `attempts` was already incremented for this try, so the delay grows with
    // the number of times this job has actually been on the wire.
    const delay = backoffDelayMs(job.attempts, clock.random());

    patch(job.id, {
      nextAttemptAt: new Date(clock.now() + delay).toISOString(),
      failure: {
        message: failureMessage(error),
        code: failureCode(error),
        isPermanent: false,
        at: new Date(clock.now()).toISOString(),
      },
    });
  }

  function failPermanently(job: SyncJob, error: unknown, code?: string) {
    patch(job.id, {
      failure: {
        message: failureMessage(error),
        code: code ?? failureCode(error),
        isPermanent: true,
        at: new Date(clock.now()).toISOString(),
      },
    });
  }

  // ---------------------------------------------------------------------
  // Running one job
  // ---------------------------------------------------------------------

  /**
   * One attempt at one job.
   *
   * Every path out of here either removes the job, blocks it, or pushes its
   * `nextAttemptAt` into the future. That is what stops the drain loop from
   * spinning on a job it can neither finish nor put down.
   */
  async function runOne(current: SyncJob): Promise<void> {
    const nowIso = new Date(clock.now()).toISOString();

    let job =
      patch(current.id, {
        attempts: current.attempts + 1,
        lastAttemptAt: nowIso,
      }) ?? current;

    emit({ sendingJobId: job.id });

    try {
      // The photograph is the whole point of the job, so its absence is checked
      // before anything is written to the server. Losing it is close to
      // impossible -- the pipeline keeps it in the document directory, which the
      // system does not reclaim -- but a job that could never finish must say so
      // rather than retry forever.
      if (!transport.hasPhoto(job)) {
        failPermanently(
          job,
          new Error('the prepared photograph is no longer on this device'),
          MISSING_PHOTO,
        );
        return;
      }

      let target = job.target;

      if (target === null) {
        if (job.submittedAt !== null) {
          // An earlier attempt reached the point of writing and this process
          // never saw the answer. Ask before writing again.
          try {
            target = await transport.recover(job);
          } catch (error) {
            // The question itself did not get through. Asking again later is
            // the only safe move: writing the rows now could duplicate them.
            failTransiently(job, error);
            return;
          }
        }

        if (target === null) {
          // Recorded before the call, not after. If the phone dies in the
          // middle, this flag is what turns the next attempt into a question
          // instead of a second tree.
          job = patch(job.id, { submittedAt: new Date(clock.now()).toISOString() }) ?? job;

          try {
            target = await transport.submit(job);
          } catch (error) {
            const failure = classifyFailure(error);

            if (failure === 'duplicate') {
              // The unique index on (tree_id, cycle) saying an earlier attempt
              // already landed. A duplicate is a receipt, not an error.
              target = targetProvenByDuplicate(job);
            }

            if (target === null) {
              if (failure === 'permanent') {
                failPermanently(job, error);
              } else {
                failTransiently(job, error);
              }
              return;
            }
          }
        }

        // On disk before a single byte of the photograph is sent.
        job = patch(job.id, { target, submittedAt: null }) ?? job;
      }

      try {
        await transport.upload(job, target);
      } catch (error) {
        if (classifyFailure(error) === 'permanent') {
          failPermanently(job, error);
        } else {
          failTransiently(job, error);
        }
        return;
      }

      // Only now is the local copy expendable, and only now does the job stop
      // existing. The two happen together so neither can outlive the other.
      try {
        transport.discardPhoto(job);
      } catch {
        // A file that will not delete is a few hundred kilobytes on the phone.
        // It must not make a job that reached the bucket look unfinished.
      }

      // Recorded before the job disappears, so a screen waiting on it can still
      // find out which tree it became. Oldest forgotten first.
      delivered.set(job.id, target);
      if (delivered.size > DELIVERED_MEMORY) {
        const oldest = delivered.keys().next();
        if (!oldest.done) {
          delivered.delete(oldest.value);
        }
      }

      remove(job.id);

      try {
        onCompleted?.(job, target);
      } catch {
        // Refreshing a cache is not part of the delivery, and a failure here
        // must not be mistaken for the upload having failed.
      }
    } catch (error) {
      // Nothing above is expected to throw past its own handler. If something
      // does, it is treated as one more failed attempt rather than allowed to
      // escape: an exception out of here would leave the drain loop looking at
      // the same job forever.
      failTransiently(job, error);
    } finally {
      if (state.sendingJobId === job.id) {
        emit({ sendingJobId: null });
      }
    }
  }

  // ---------------------------------------------------------------------
  // The drain
  // ---------------------------------------------------------------------

  /**
   * Arranges to come back when the next job falls due.
   *
   * **Nothing is scheduled while there is no way to send.** Without this guard
   * the queue spins: a job in a vereda is due now, so the wake-up is in zero
   * milliseconds, and the drain it wakes finds no radio, breaks immediately and
   * schedules another zero millisecond wake-up. That is a tight loop on a phone
   * that is a walk away from a plug. Connectivity coming back is not a moment a
   * timer can know about anyway -- `SyncRunner` hears it from the connectivity
   * listener and calls `drain` directly.
   */
  function scheduleWakeUp() {
    cancelWakeUp?.();
    cancelWakeUp = null;

    if (!transport.canSubmit()) {
      return;
    }

    const delay = millisecondsUntilNextAttempt(state.jobs, clock.now());

    if (delay === null) {
      return;
    }

    // A due job with a connection should have been sent by the pass that just
    // finished, so a zero here means something is stuck rather than ready, and
    // waking instantly would spin. Every other delay is honoured exactly.
    cancelWakeUp = clock.schedule(delay === 0 ? RETRY_BASE_DELAY_MS : delay, () => {
      cancelWakeUp = null;
      void drain();
    });
  }

  async function drain(): Promise<void> {
    load();

    if (isDraining) {
      // Something asked while a pass was already running. Rather than run two
      // loops over the same list, remember to go round once more.
      shouldDrainAgain = true;
      return;
    }

    isDraining = true;

    try {
      for (;;) {
        if (!transport.canSubmit()) {
          break;
        }

        const next = runnableJobs(state.jobs, clock.now())[0];

        if (next === undefined) {
          break;
        }

        await runOne(next);
      }
    } finally {
      isDraining = false;
      scheduleWakeUp();
    }

    if (shouldDrainAgain) {
      shouldDrainAgain = false;
      await drain();
    }
  }

  // ---------------------------------------------------------------------
  // Waiting on one job
  // ---------------------------------------------------------------------

  function settle(id: string, timeoutMs: number): Promise<SettledJob> {
    return new Promise((resolve) => {
      let cancelTimeout: (() => void) | null = null;
      let unsubscribe: (() => void) | null = null;

      const finish = (outcome: SettledJob['outcome'], target: JobTarget | null) => {
        cancelTimeout?.();
        unsubscribe?.();
        resolve({ outcome, target });
      };

      const check = () => {
        const job = state.jobs.find((candidate) => candidate.id === id);

        // Gone from the queue is the only outcome that means the bucket has it.
        if (job === undefined) {
          finish('sent', delivered.get(id) ?? null);
          return;
        }

        // Nothing can be sent at all -- no signal, or no session. Waiting out
        // the timeout would leave a guardian in a vereda watching a spinner for
        // three quarters of a minute to be told what the radio already knew.
        if (!transport.canSubmit()) {
          finish(statusOf(state, job), job.target);
          return;
        }

        // Still moving, or about to. Only a stop worth reporting ends the wait.
        if (statusOf(state, job) === 'blocked') {
          finish('blocked', job.target);
        }
      };

      unsubscribe = subscribe(check);
      cancelTimeout = clock.schedule(timeoutMs, () => {
        cancelTimeout = null;
        const job = state.jobs.find((candidate) => candidate.id === id);
        finish(
          job === undefined ? 'sent' : statusOf(state, job),
          job === undefined ? (delivered.get(id) ?? null) : job.target,
        );
      });

      void drain();
      check();
    });
  }

  // ---------------------------------------------------------------------
  // The guardian's own two controls
  // ---------------------------------------------------------------------

  function retryNow(id: string) {
    const job = state.jobs.find((candidate) => candidate.id === id);

    if (job === undefined) {
      return;
    }

    // The attempt count is left alone. It is a record of what this job has
    // cost, not a budget, and resetting it would quietly restart the backoff
    // ladder for a job that has been failing all afternoon.
    patch(id, { failure: null, nextAttemptAt: new Date(clock.now()).toISOString() });
    void drain();
  }

  function discard(id: string) {
    const job = state.jobs.find((candidate) => candidate.id === id);

    if (job === undefined) {
      return;
    }

    // The photograph goes with it. The guardian has been shown what this job
    // was and why it stopped, and has chosen; leaving a few hundred kilobytes
    // behind that nothing will ever look at again is not kinder.
    try {
      transport.discardPhoto(job);
    } catch {
      // A file that will not delete is not a reason to keep the job.
    }

    remove(id);

    // Discarding the head of a tree releases everything behind it, which may
    // now be due immediately.
    scheduleWakeUp();
    void drain();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    getState: () => state,
    subscribe,
    load,
    enqueue,
    drain,
    settle,
    retryNow,
    discard,
  };
}
