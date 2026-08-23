// Drives the real offline write queue through the situations a guardian in a
// vereda actually meets: a full planting in airplane mode, the app being killed
// and reopened, the signal coming back, an upload that fails twice, a cycle the
// server already has, and several entries of the same tree waiting their turn.
//
// This is not a mock of the queue. `sync-queue-engine.ts` and
// `sync-queue-model.ts` import no platform at all -- no expo, no Supabase, no
// React, no clock of their own -- precisely so the code that runs here is the
// same code that runs on the phone. What is faked is everything around it: the
// file the queue is written to, the radio, the server and the passage of time.
//
// Time is virtual, and the jitter is pinned to zero, so the run is reproducible:
// the same sequence of events produces the same schedule every time.
//
// Needs nothing running. No database, no network, no device:
//   pnpm test:offline

import { registerHooks } from 'node:module';

// The queue's own modules import each other the way a bundler reads them, with
// no file extension. Node's ESM resolver wants one, so it is added here rather
// than written into the source: Metro is what has to load these files in
// earnest, and its convention is the one they should be written in.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { createSyncQueue } = await import('../apps/mobile/src/features/sync/sync-queue-engine.ts');
const { backoffDelayMs, isOverAdvisoryLimit, RETRY_MAX_DELAY_MS, QUEUE_ADVISORY_JOBS } =
  await import('../apps/mobile/src/features/sync/sync-queue-model.ts');

let failures = 0;
let checks = 0;

function check(description, condition, detail) {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${description}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${description}`);
  if (detail !== undefined) {
    console.log(`       ${detail}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/** Lets every pending promise chain settle before the next assertion. */
async function flush() {
  for (let round = 0; round < 12; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// ---------------------------------------------------------------------------
// The world around the queue
// ---------------------------------------------------------------------------

/**
 * Virtual time. Nothing here sleeps: `advance` walks the scheduled callbacks in
 * order and moves the clock to each one, which is what makes a fifteen minute
 * backoff a test that finishes instantly.
 */
function createClock(startIso = '2026-08-22T09:00:00.000Z') {
  let now = Date.parse(startIso);
  let nextId = 0;
  const timers = new Map();

  return {
    now: () => now,
    schedule(delayMs, run) {
      const id = (nextId += 1);
      timers.set(id, { at: now + delayMs, run });
      return () => timers.delete(id);
    },
    // Pinned, so the backoff ladder is exactly the documented one and the run
    // is reproducible. The app passes Math.random.
    random: () => 0,

    async advance(ms) {
      const target = now + ms;

      for (;;) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];

        if (due === undefined) {
          break;
        }

        timers.delete(due[0]);
        now = due[1].at;
        due[1].run();
        await flush();
      }

      now = target;
      await flush();
    },

    /**
     * A clock for one run of the application.
     *
     * Killing the app has to actually kill it: the timers the old queue had
     * scheduled must not keep firing beside the new one. On the phone this is
     * free -- the process dies and there is exactly one queue at module scope --
     * and here it has to be arranged, or the "app was restarted" tests quietly
     * run two queues over one file and prove nothing.
     */
    fork() {
      const owned = new Set();

      return {
        now: () => now,
        random: () => 0,
        schedule(delayMs, run) {
          const id = (nextId += 1);
          timers.set(id, { at: now + delayMs, run });
          owned.add(id);
          return () => timers.delete(id);
        },
        kill() {
          for (const id of owned) {
            timers.delete(id);
          }
          owned.clear();
        },
      };
    },
  };
}

/** The queue file, as a string that survives the app being killed. */
function createStorage() {
  let contents = null;
  return {
    read: () => contents,
    write: (text) => {
      contents = text;
    },
    /** What the file holds, for assertions about what a restart would find. */
    peek: () => (contents === null ? null : JSON.parse(contents)),
  };
}

/** The photographs on the phone's disk. */
function createPhotoStore() {
  const files = new Set();
  let nextId = 0;

  return {
    files,
    /** A prepared photograph, as the pipeline would have left it. */
    take(capturedAt, bytes = 198 * 1024) {
      const id = (nextId += 1);
      const photo = {
        photoUri: `file:///documents/growth-log/${id}-photo.jpg`,
        thumbnailUri: `file:///documents/growth-log/${id}-thumbnail.jpg`,
        photoBytes: bytes,
        capturedAt,
        captureLocation: { lat: 2.3894, lng: -75.8919 },
      };
      files.add(photo.photoUri);
      files.add(photo.thumbnailUri);
      return photo;
    },
    exists: (photo) => files.has(photo.photoUri) && files.has(photo.thumbnailUri),
  };
}

/** A PostgREST-shaped failure, which is what the queue reads SQLSTATEs off. */
function pgError(code, message) {
  return { code, message };
}

function networkError() {
  return new TypeError('Network request failed');
}

/**
 * The server, and the radio between it and the phone.
 *
 * `isReachable` is airplane mode. `commitThenDrop` is the one genuinely nasty
 * case: the write commits and the answer never gets back, which is what leaves
 * a job unable to tell whether it planted a tree.
 */
function createServer() {
  return {
    isReachable: true,
    commitThenDrop: false,
    trees: [],
    /** `${treeId}:${cycle}` -> the entry, so a repeat can be refused. */
    entries: new Map(),
    objects: new Set(),
    /** Every upload in the order it was accepted. The ordering assertions read this. */
    uploadLog: [],
    /** `${treeId}:${cycle}` -> how many more uploads to refuse. */
    uploadFailures: new Map(),
    nextCode: 1,
  };
}

function createTransport(server, photos, { userId = 'guardian-1' } = {}) {
  return {
    canSubmit: () => server.isReachable && userId !== null,

    async submit(job) {
      if (!server.isReachable) {
        throw networkError();
      }

      if (job.kind === 'planting') {
        const treeId = `tree-${server.trees.length + 1}`;
        const code = `LP-${String(server.nextCode).padStart(4, '0')}`;
        server.nextCode += 1;

        // The transaction: the tree and its cycle 1 entry, together.
        server.trees.push({ treeId, code, plantedAt: job.plantedAt });
        server.entries.set(`${treeId}:1`, { capturedAt: job.photo.capturedAt, authorId: userId });

        if (server.commitThenDrop) {
          // Committed, and the answer never arrives. Exactly the window the
          // `submittedAt` flag and `recover` exist for.
          throw networkError();
        }

        return { treeId, code, cycle: 1 };
      }

      const key = `${job.treeId}:${job.cycle}`;

      if (server.entries.has(key)) {
        // The unique index on (tree_id, cycle).
        throw pgError('23505', 'duplicate key value violates unique constraint');
      }

      server.entries.set(key, { capturedAt: job.photo.capturedAt, authorId: userId });

      if (server.commitThenDrop) {
        throw networkError();
      }

      return { treeId: job.treeId, code: null, cycle: job.cycle };
    },

    async recover(job) {
      if (!server.isReachable) {
        throw networkError();
      }

      if (job.kind === 'planting') {
        for (const [key, entry] of server.entries) {
          const [treeId, cycle] = key.split(':');
          if (
            cycle === '1' &&
            entry.capturedAt === job.photo.capturedAt &&
            entry.authorId === userId
          ) {
            return { treeId, code: null, cycle: 1 };
          }
        }
        return null;
      }

      const key = `${job.treeId}:${job.cycle}`;
      return server.entries.has(key) ? { treeId: job.treeId, code: null, cycle: job.cycle } : null;
    },

    async upload(job, target) {
      if (!server.isReachable) {
        throw networkError();
      }

      const key = `${target.treeId}:${target.cycle}`;
      const remaining = server.uploadFailures.get(key) ?? 0;

      if (remaining > 0) {
        server.uploadFailures.set(key, remaining - 1);
        throw networkError();
      }

      server.objects.add(`${key}/photo.jpg`);
      server.objects.add(`${key}/thumbnail.jpg`);
      server.uploadLog.push(key);
    },

    hasPhoto: (job) => photos.exists(job.photo),

    discardPhoto(job) {
      photos.files.delete(job.photo.photoUri);
      photos.files.delete(job.photo.thumbnailUri);
    },
  };
}

let nextJobId = 0;

/**
 * One run of the application: a queue, and the handle that ends it.
 *
 * `kill` is what "the guardian closed the app" means here. The file survives it
 * and nothing else does.
 */
function bootPhone({ storage, server, photos, clock }) {
  const process = clock.fork();

  return {
    queue: createSyncQueue({
      storage,
      transport: createTransport(server, photos),
      clock: process,
      newId: () => `job-${(nextJobId += 1)}`,
    }),
    kill: () => process.kill(),
  };
}

function plantingJob(photo, overrides = {}) {
  return {
    kind: 'planting',
    speciesRawText: 'mandarino',
    zoneId: 'zone-san-andres',
    villageName: 'San Andrés',
    location: { lat: 2.3894, lng: -75.8919 },
    plantedAt: '2026-08-22',
    heightCm: 118,
    visibleBranches: 4,
    photo,
    ...overrides,
  };
}

function logEntryJob(treeId, cycle, photo, overrides = {}) {
  return {
    kind: 'log_entry',
    treeId,
    treeLabel: 'Guanábano #12',
    cycle,
    heightCm: 140,
    visibleBranches: 6,
    healthStatus: 'healthy',
    notes: null,
    photo,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1 · A planting in airplane mode, a restart, and the signal coming back
// ---------------------------------------------------------------------------

async function testAirplaneModePlanting() {
  section('1 · Siembra en modo avión, cierre de la app, y subida al volver la señal');

  const clock = createClock();
  const storage = createStorage();
  const photos = createPhotoStore();
  const server = createServer();
  server.isReachable = false;

  const { queue, kill } = bootPhone({ storage, server, photos, clock });
  const photo = photos.take('2026-08-22T14:12:03.000Z');
  const job = queue.enqueue(plantingJob(photo));
  await flush();

  check('la siembra queda en la cola sin conexión', queue.getState().jobs.length === 1);
  check('no se ha escrito nada en el servidor', server.trees.length === 0);
  check('la fotografía sigue en el teléfono', photos.exists(photo));

  // The wizard's own wait: with no radio it must come back at once rather than
  // holding the guardian on a spinner.
  const settled = await queue.settle(job.id, 40_000);
  check(
    'la espera de la pantalla termina de inmediato y reporta que sigue en el teléfono',
    settled.outcome === 'queued' && settled.target === null,
    `outcome=${settled.outcome}`,
  );

  const onDisk = storage.peek();
  check(
    'la cola está escrita en disco con todos los campos del formulario',
    onDisk !== null &&
      onDisk.jobs.length === 1 &&
      onDisk.jobs[0].speciesRawText === 'mandarino' &&
      onDisk.jobs[0].heightCm === 118 &&
      onDisk.jobs[0].photo.capturedAt === '2026-08-22T14:12:03.000Z',
  );

  // The app is killed and opened again: a brand new queue over the same file,
  // and the old one really gone rather than still ticking beside it.
  kill();
  const { queue: reopened } = bootPhone({ storage, server, photos, clock });
  reopened.load();

  check('al reabrir la app la siembra sigue ahí', reopened.getState().jobs.length === 1);
  check(
    'y conserva la fecha de captura de la fotografía, no la de la subida',
    reopened.getState().jobs[0].photo.capturedAt === '2026-08-22T14:12:03.000Z',
  );

  // The signal comes back.
  server.isReachable = true;
  await reopened.drain();
  await flush();

  check('la cola queda vacía', reopened.getState().jobs.length === 0);
  check('el árbol existe en el servidor', server.trees.length === 1);
  check('con su entrada de ciclo 1', server.entries.has('tree-1:1'));
  check(
    'y las dos fotografías subidas',
    server.objects.has('tree-1:1/photo.jpg') && server.objects.has('tree-1:1/thumbnail.jpg'),
  );
  check('la copia local se borra solo después de confirmar', !photos.exists(photo));
  check('y el archivo en disco queda sin trabajos', storage.peek().jobs.length === 0);
}

// ---------------------------------------------------------------------------
// 2 · Un ciclo ya subido es un duplicado, no un error
// ---------------------------------------------------------------------------

async function testDuplicateCycle() {
  section('2 · Reintento sobre un ciclo ya subido: duplicado, no error');

  const clock = createClock();
  const storage = createStorage();
  const photos = createPhotoStore();
  const server = createServer();

  // The row is already there from an attempt whose answer never came back. The
  // photograph is not: that is exactly what is left to do.
  server.entries.set('tree-7:3', {
    capturedAt: '2026-08-20T13:00:00.000Z',
    authorId: 'guardian-1',
  });

  const { queue } = bootPhone({ storage, server, photos, clock });
  const photo = photos.take('2026-08-20T13:00:00.000Z');
  queue.enqueue(logEntryJob('tree-7', 3, photo));
  await flush();
  await queue.drain();
  await flush();

  check('el trabajo sale de la cola', queue.getState().jobs.length === 0);
  check(
    'sin quedar marcado como fallo',
    storage.peek().jobs.length === 0,
    JSON.stringify(storage.peek()),
  );
  check(
    'y la fotografía sí se sube, que era lo único que faltaba',
    server.objects.has('tree-7:3/photo.jpg') && server.objects.has('tree-7:3/thumbnail.jpg'),
  );
  check('no se duplicó la entrada', server.entries.size === 1);
  check('y la copia local se borró', !photos.exists(photo));
}

// ---------------------------------------------------------------------------
// 3 · El orden por árbol
// ---------------------------------------------------------------------------

async function testOrderingPerTree() {
  section('3 · Orden por árbol con varias entradas encoladas');

  const clock = createClock();
  const storage = createStorage();
  const photos = createPhotoStore();
  const server = createServer();
  server.isReachable = false;

  const { queue } = bootPhone({ storage, server, photos, clock });

  // Three visits to the same tree, saved in order, plus one to another tree.
  queue.enqueue(logEntryJob('tree-a', 2, photos.take('2026-08-20T10:00:00.000Z')));
  queue.enqueue(logEntryJob('tree-a', 3, photos.take('2026-08-21T10:00:00.000Z')));
  queue.enqueue(logEntryJob('tree-a', 4, photos.take('2026-08-22T10:00:00.000Z')));
  queue.enqueue(logEntryJob('tree-b', 5, photos.take('2026-08-22T11:00:00.000Z')));
  await flush();

  check('las cuatro entradas están en la cola', queue.getState().jobs.length === 4);

  // The oldest entry of tree A cannot upload twice over. Tree B is untouched.
  server.uploadFailures.set('tree-a:2', 2);
  server.isReachable = true;

  await queue.drain();
  await flush();

  check(
    'el árbol que falla no arrastra al otro: tree-b sube en la misma pasada',
    server.uploadLog.includes('tree-b:5'),
    `uploadLog=${JSON.stringify(server.uploadLog)}`,
  );
  check(
    'los ciclos 3 y 4 de tree-a no se adelantan al 2',
    !server.uploadLog.includes('tree-a:3') && !server.uploadLog.includes('tree-a:4'),
    `uploadLog=${JSON.stringify(server.uploadLog)}`,
  );
  check('y el ciclo 3 tampoco escribió su fila antes que el 2', !server.entries.has('tree-a:3'));

  // Two backoff steps: 15s, then 30s. Jitter is pinned to zero.
  await clock.advance(backoffDelayMs(1, 0) + 1);
  await flush();
  await clock.advance(backoffDelayMs(2, 0) + 1);
  await flush();
  await queue.drain();
  await flush();

  const treeA = server.uploadLog.filter((key) => key.startsWith('tree-a:'));

  check(
    'la cola termina vacía',
    queue.getState().jobs.length === 0,
    JSON.stringify(queue.getState().jobs.map((job) => job.cycle)),
  );
  check(
    'y tree-a subió estrictamente en orden 2, 3, 4',
    JSON.stringify(treeA) === JSON.stringify(['tree-a:2', 'tree-a:3', 'tree-a:4']),
    `tree-a=${JSON.stringify(treeA)}`,
  );
}

// ---------------------------------------------------------------------------
// 4 · La ventana entre el commit y la respuesta
// ---------------------------------------------------------------------------

async function testCommitThenDrop() {
  section('4 · La app muere entre el commit y la respuesta: no se siembra dos veces');

  const clock = createClock();
  const storage = createStorage();
  const photos = createPhotoStore();
  const server = createServer();

  const { queue, kill } = bootPhone({ storage, server, photos, clock });
  const photo = photos.take('2026-08-22T15:30:00.000Z');

  // The write commits on the server and the answer is lost on the way back.
  server.commitThenDrop = true;
  queue.enqueue(plantingJob(photo));
  await flush();

  check('el servidor ya tiene el árbol', server.trees.length === 1);
  check(
    'y el trabajo quedó marcado como enviado sin conocer el resultado',
    storage.peek().jobs[0].submittedAt !== null && storage.peek().jobs[0].target === null,
  );

  check(
    'y quedó esperando su reintento, no dando por hecho que falló',
    Date.parse(storage.peek().jobs[0].nextAttemptAt) > clock.now(),
  );

  // The phone is killed here, which is the dangerous moment.
  kill();
  server.commitThenDrop = false;
  const { queue: reopened } = bootPhone({ storage, server, photos, clock });
  reopened.load();

  // The backoff survives the restart, as it should: reopening the app is not a
  // reason to hammer a server that just dropped a request.
  await clock.advance(backoffDelayMs(1, 0) + 1);
  await reopened.drain();
  await flush();

  check(
    'sigue habiendo un solo árbol, no dos',
    server.trees.length === 1,
    `trees=${server.trees.length}`,
  );
  check('la entrada de ciclo 1 no se duplicó', server.entries.size === 1);
  check(
    'la fotografía se subió contra el árbol que sí existe',
    server.objects.has('tree-1:1/photo.jpg'),
  );
  check('y la cola queda vacía', reopened.getState().jobs.length === 0);
}

// ---------------------------------------------------------------------------
// 5 · Un rechazo que no se arregla reintentando
// ---------------------------------------------------------------------------

async function testPermanentRefusal() {
  section('5 · Un rechazo definitivo deja de reintentar y espera al guardián');

  const clock = createClock();
  const storage = createStorage();
  const photos = createPhotoStore();
  const server = createServer();

  const photo = photos.take('2026-08-22T16:00:00.000Z');

  // A row level policy refusing the write: this tree is not theirs.
  const transport = createTransport(server, photos);
  const refusing = createSyncQueue({
    storage,
    transport: {
      ...transport,
      submit: async () => {
        throw pgError('42501', 'new row violates row-level security policy');
      },
    },
    clock,
    newId: () => `job-blocked`,
  });

  const job = refusing.enqueue(logEntryJob('tree-z', 2, photo));
  await flush();

  const blocked = refusing.getState().jobs[0];
  check('el trabajo queda bloqueado', blocked.failure?.isPermanent === true);
  check('con el motivo guardado', typeof blocked.failure?.message === 'string');
  check(
    'y con su SQLSTATE, que es lo que le permite a la tarjeta nombrar el rechazo',
    blocked.failure?.code === '42501',
    `code=${blocked.failure?.code}`,
  );
  check('y sigue en la cola: nada se borra solo', refusing.getState().jobs.length === 1);
  check('la fotografía sigue en el teléfono', photos.exists(photo));

  const attemptsAfterFirst = blocked.attempts;
  await clock.advance(RETRY_MAX_DELAY_MS * 4);
  await refusing.drain();
  await flush();

  check(
    'no gasta más intentos por su cuenta',
    refusing.getState().jobs[0].attempts === attemptsAfterFirst,
    `attempts=${refusing.getState().jobs[0].attempts}`,
  );

  // The one path that drops unsent work, and it is the guardian pressing it.
  refusing.discard(job.id);
  await flush();

  check('descartar lo saca de la cola', refusing.getState().jobs.length === 0);
  check('y borra su fotografía', !photos.exists(photo));
  check('sin haber escrito nada en el servidor', server.entries.size === 0);
}

// ---------------------------------------------------------------------------
// 6 · Semanas sin red
// ---------------------------------------------------------------------------

async function testWeeksWithoutSignal() {
  section('6 · La cola crece durante semanas sin red');

  const clock = createClock();
  const storage = createStorage();
  const photos = createPhotoStore();
  const server = createServer();
  server.isReachable = false;

  const { queue } = bootPhone({ storage, server, photos, clock });

  for (let index = 0; index < QUEUE_ADVISORY_JOBS + 5; index += 1) {
    queue.enqueue(
      logEntryJob(
        `tree-${index}`,
        2,
        photos.take(`2026-07-${String((index % 28) + 1).padStart(2, '0')}T10:00:00.000Z`),
      ),
    );
  }
  await flush();

  check(
    'nada se descarta por antigüedad ni por tamaño',
    queue.getState().jobs.length === QUEUE_ADVISORY_JOBS + 5,
    `jobs=${queue.getState().jobs.length}`,
  );
  check('la cola nunca rechaza trabajo nuevo', queue.getState().jobs.length > QUEUE_ADVISORY_JOBS);
  check('y avisa al guardián de que lleva mucho encima', queue.getState().isOverAdvisoryLimit);
  check(
    'el aviso es el mismo que calcula el modelo',
    isOverAdvisoryLimit(queue.getState().jobs) === true,
  );
  check(
    'todas las fotografías siguen en el teléfono',
    photos.files.size === (QUEUE_ADVISORY_JOBS + 5) * 2,
  );

  // Four weeks with the radio down cost no attempts at all.
  await clock.advance(28 * 24 * 60 * 60 * 1000);
  await flush();

  check(
    'cuatro semanas sin señal no gastan un solo intento',
    queue.getState().jobs.every((job) => job.attempts === 0),
  );

  server.isReachable = true;
  await queue.drain();
  await flush();

  check('y al volver la señal se envía todo', queue.getState().jobs.length === 0);
  check('sin perder una sola fotografía', server.uploadLog.length === QUEUE_ADVISORY_JOBS + 5);
}

// ---------------------------------------------------------------------------
// 7 · La escalera de reintentos
// ---------------------------------------------------------------------------

function testBackoffLadder() {
  section('7 · La espera entre intentos crece y tiene techo');

  check('el primer reintento espera 15 s', backoffDelayMs(1, 0) === 15_000);
  check('el segundo, 30 s', backoffDelayMs(2, 0) === 30_000);
  check('el tercero, 60 s', backoffDelayMs(3, 0) === 60_000);
  check('y la espera no pasa del techo de 15 min', backoffDelayMs(20, 0) === RETRY_MAX_DELAY_MS);
  check(
    'el jitter reparte los reintentos de todo un colegio',
    backoffDelayMs(1, 0.99) > backoffDelayMs(1, 0) &&
      backoffDelayMs(1, 1) <= Math.round(15_000 * 1.25),
  );
}

// ---------------------------------------------------------------------------

console.log('Cola de sincronización offline — ciclo reproducible');

await testAirplaneModePlanting();
await testDuplicateCycle();
await testOrderingPerTree();
await testCommitThenDrop();
await testPermanentRefusal();
await testWeeksWithoutSignal();
testBackoffLadder();

console.log(
  `\n${failures === 0 ? 'Todo en verde' : `${failures} fallo(s)`} · ${checks} comprobaciones`,
);

process.exit(failures === 0 ? 0 : 1);
