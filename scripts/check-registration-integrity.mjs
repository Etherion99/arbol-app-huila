// Registration integrity, end to end, against the local stack.
//
// The offline queue has its own check in `check-offline-queue.mjs`: ordering,
// backoff, the manifest surviving a restart. This is the other half of the
// hardening, and it is the half a PRAE report depends on -- whether a tree in
// the figures is a tree somebody walked to.
//
// Five things are exercised, all of them against real rows:
//
//   1. The two distance thresholds agree between the database and
//      `packages/core`, the same arrangement `normalize_species()` lives under.
//   2. A planting replayed with the same client request id returns the tree the
//      first attempt made, and does not plant a second one. This is what makes
//      the queue safe to retry a planting at all.
//   3. A growth log cycle replayed collides with its unique index, which is a
//      receipt and not an error.
//   4. An incoherent coordinate and a tree within three metres are **flagged
//      and registered**, never refused.
//   5. A guardian cannot read the flags; a coordinator can, can resolve one,
//      and nothing is deleted by resolving it.
//
// Needs the local stack running with the seed loaded: pnpm db:reset
//
// Run with `pnpm test:integrity`.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DUPLICATE_RADIUS_METRES,
  GPS_COHERENCE_METRES,
  distanceMetres,
} from '../packages/core/src/integrity.ts';
import { growthLogPhotoPath, growthLogThumbnailPath } from '../packages/core/src/domain.ts';

const PASSWORD = 'arbolapp2026';
const GUARDIAN = 'andres.cabrera@iesansebastian.edu.co';
const COORDINATOR = 'coordinacion@iesansebastian.edu.co';

function localStack() {
  // The CLI entry point is run through node rather than through the bin shim,
  // which is a .CMD on Windows and would not spawn.
  const cli = new URL('../node_modules/supabase/dist/supabase.js', import.meta.url);
  const raw = execFileSync(process.execPath, [cli.pathname.slice(1), 'status', '-o', 'json'], {
    encoding: 'utf8',
  });
  return JSON.parse(raw.slice(raw.indexOf('{')));
}

const { API_URL, ANON_KEY } = localStack();

let failures = 0;

function check(title, detail, expectation, actual, passed) {
  if (!passed) failures += 1;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}`);
  console.log(`       what     ${detail}`);
  console.log(`       expected ${expectation}`);
  console.log(`       actual   ${actual}`);
  console.log('');
}

function section(title) {
  console.log(`\n${'-'.repeat(78)}\n${title}\n${'-'.repeat(78)}\n`);
}

async function request(path, { token, method = 'GET', body, prefer } = {}) {
  const headers = { apikey: ANON_KEY, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${API_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text === '' ? null : JSON.parse(text);
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

async function upload(objectKey, token, bytes) {
  const response = await fetch(`${API_URL}/storage/v1/object/growth-log-photos/${objectKey}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/jpeg',
      // Exactly what `growth-log-storage.ts` sends, and for the same reason: a
      // retry re-sends the same bytes to the same key, and without this the
      // second attempt would be refused as "already exists" -- which is how a
      // guardian gets told their own successful upload failed.
      'x-upsert': 'true',
    },
    body: bytes,
  });
  return { status: response.status, payload: await response.text() };
}

async function signIn(email) {
  const response = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error(`sign in failed for ${email}: ${JSON.stringify(payload)}`);
  }
  return { token: payload.access_token, id: payload.user.id };
}

/** The smallest thing Storage will accept as a JPEG: the two byte SOI marker. */
const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

const guardian = await signIn(GUARDIAN);
const coordinator = await signIn(COORDINATOR);

console.log('ÁrbolApp Huila — registration integrity, end to end\n');
console.log(`Guardian     ${GUARDIAN}  ${guardian.id}`);
console.log(`Coordinator  ${COORDINATOR}  ${coordinator.id}`);

const village = await request('zones?select=id,name&type=eq.village&order=slug&limit=1', {
  token: guardian.token,
});
const zoneId = village.payload[0].id;
console.log(`Vereda       ${village.payload[0].name}  ${zoneId}\n`);

// ===========================================================================
section('1 · The thresholds the client and the database each keep a copy of');
// ===========================================================================

const thresholds = await request('rpc/registration_flag_thresholds', {
  token: guardian.token,
  method: 'POST',
  body: {},
});
const [{ gps_coherence_metres: dbGps, duplicate_radius_metres: dbDuplicate }] = thresholds.payload;

check(
  'GPS coherence threshold agrees on both sides',
  'registration_flag_thresholds() against GPS_COHERENCE_METRES',
  `${GPS_COHERENCE_METRES} m`,
  `${dbGps} m`,
  dbGps === GPS_COHERENCE_METRES,
);

check(
  'Duplicate radius agrees on both sides',
  'registration_flag_thresholds() against DUPLICATE_RADIUS_METRES',
  `${DUPLICATE_RADIUS_METRES} m`,
  `${dbDuplicate} m`,
  dbDuplicate === DUPLICATE_RADIUS_METRES,
);

// ===========================================================================
// ===========================================================================
section('2 · A planting, and the flags a clean one does not raise');
// ===========================================================================

/**
 * A patch of La Plata with no tree already standing in it.
 *
 * Found rather than typed in, and that is not fussiness: the seed plants two
 * hundred trees around the municipality, and a hard coded coordinate landed a
 * metre and a half from one of them -- which the duplicate check correctly
 * flagged, and which would have looked like a bug in the check rather than a
 * bad choice of test point. Every planting below starts from a spot this
 * function cleared.
 */
async function findEmptySpot(from, clearanceMetres = 60) {
  const step = 0.0012; // roughly 130 m of longitude at this latitude.

  for (let index = 0; index < 200; index += 1) {
    const candidate = { lat: from.lat + step * (index % 14), lng: from.lng + step * (index / 14) };
    const box = 0.002;

    const nearby = await request('rpc/trees_in_viewport', {
      token: guardian.token,
      method: 'POST',
      body: {
        min_lng: candidate.lng - box,
        min_lat: candidate.lat - box,
        max_lng: candidate.lng + box,
        max_lat: candidate.lat + box,
        zoom: 18,
      },
    });

    const closest = (nearby.payload ?? [])
      .map((tree) => distanceMetres(candidate, { lat: tree.lat, lng: tree.lng }))
      .reduce((least, metres) => Math.min(least, metres), Number.POSITIVE_INFINITY);

    if (closest > clearanceMetres) return candidate;
  }

  throw new Error('no empty spot found near the seed data; run pnpm db:reset');
}

const declared = await findEmptySpot({ lat: 2.3894, lng: -75.8919 });
console.log(
  `Empty spot   ${declared.lat.toFixed(5)}, ${declared.lng.toFixed(5)} — no seeded tree within 60 m\n`,
);

// The photograph is taken 40 metres from the declared point, which is ordinary
// drift under a canopy and must not be flagged.
const captured = { lat: declared.lat + 0.00036, lng: declared.lng };

const clientRequestId = crypto.randomUUID();
const capturedAt = new Date().toISOString();

/**
 * The payload the queue holds for a planting, as `sync-queue-model.ts`
 * describes it.
 *
 * Built here rather than read out of a real manifest because the queue that
 * writes that file is exercised by `check-offline-queue.mjs`. What this script
 * needs from it is only the shape of what finally reaches the server, and the
 * one field that makes the retry safe: the job id.
 */
const job = {
  id: clientRequestId,
  speciesRawText: 'Mandarino',
  zoneId,
  location: declared,
  plantedAt: capturedAt.slice(0, 10),
  heightCm: 42,
  visibleBranches: 3,
};

const photo = { capturedAt, captureLocation: captured };
check(
  'The drift the photograph really has is under the threshold',
  'distanceMetres() between the declared point and the capture point',
  `under ${GPS_COHERENCE_METRES} m, so nothing is flagged`,
  `${distanceMetres(declared, captured).toFixed(1)} m`,
  distanceMetres(declared, captured) < GPS_COHERENCE_METRES,
);

async function sendPlanting(payload, photo) {
  return request('rpc/register_tree', {
    token: guardian.token,
    method: 'POST',
    prefer: 'params=single-object',
    body: {
      in_species_raw_text: payload.speciesRawText,
      in_zone_id: payload.zoneId,
      in_lng: payload.location.lng,
      in_lat: payload.location.lat,
      in_planted_at: payload.plantedAt,
      in_height_cm: payload.heightCm,
      in_visible_branches: payload.visibleBranches,
      in_captured_at: photo.capturedAt,
      in_capture_lng: photo.captureLocation?.lng ?? null,
      in_capture_lat: photo.captureLocation?.lat ?? null,
      in_notes: null,
      // The queue job id, which is what sync-queue-transport.ts sends.
      in_client_request_id: payload.id,
    },
  });
}

const planted = await sendPlanting(job, photo);
const registration = planted.payload?.[0];

check(
  'A planting reaches the server',
  'register_tree() with the arguments the queue holds',
  'a tree, its code, and cycle 1',
  `${planted.status} ${registration?.code} cycle ${registration?.cycle}`,
  planted.status === 200 && registration?.cycle === 1 && typeof registration?.code === 'string',
);

check(
  'A clean registration raises no flags',
  '40 m of drift, no tree nearby',
  'no flags',
  JSON.stringify(registration?.flags ?? null),
  Array.isArray(registration?.flags) && registration.flags.length === 0,
);

const photoUpload = await upload(registration.photo_path, guardian.token, FAKE_JPEG);
const thumbUpload = await upload(registration.thumbnail_path, guardian.token, FAKE_JPEG);

check(
  'The photograph goes to the keys the row handed back',
  `${registration.photo_path} and its thumbnail`,
  'both accepted',
  `${photoUpload.status} / ${thumbUpload.status}`,
  photoUpload.status === 200 && thumbUpload.status === 200,
);

check(
  'The object keys are the ones packages/core builds',
  'growthLogPhotoPath() against what register_tree() returned',
  growthLogPhotoPath(registration.tree_id, 1),
  registration.photo_path,
  registration.photo_path === growthLogPhotoPath(registration.tree_id, 1) &&
    registration.thumbnail_path === growthLogThumbnailPath(registration.tree_id, 1),
);

// ===========================================================================
section('3 · Idempotency: a retry after a lost answer plants nothing new');
// ===========================================================================

const before = await request(`trees?select=id&guardian_id=eq.${guardian.id}`, {
  token: guardian.token,
});

const retried = await sendPlanting(job, photo);
const retriedRow = retried.payload?.[0];

const after = await request(`trees?select=id&guardian_id=eq.${guardian.id}`, {
  token: guardian.token,
});

check(
  'Replaying the same client request id returns the same tree',
  'register_tree() called twice with the same in_client_request_id',
  `the tree ${registration.code}, marked as already registered`,
  `${retriedRow?.code}, was_already_registered=${retriedRow?.was_already_registered}`,
  retriedRow?.tree_id === registration.tree_id && retriedRow?.was_already_registered === true,
);

check(
  'The retry did not plant a second tree',
  'counting the guardian trees before and after the replay',
  `${before.payload.length} trees, unchanged`,
  `${after.payload.length} trees`,
  before.payload.length === after.payload.length,
);

// ===========================================================================
section('4 · A growth log cycle, and the retry that collides with its index');
// ===========================================================================

const cycleTwo = {
  tree_id: registration.tree_id,
  author_id: guardian.id,
  cycle: 2,
  photo_path: growthLogPhotoPath(registration.tree_id, 2),
  thumbnail_path: growthLogThumbnailPath(registration.tree_id, 2),
  captured_at: new Date().toISOString(),
  capture_location: `SRID=4326;POINT(${captured.lng} ${captured.lat})`,
  height_cm: 55,
  visible_branches: 4,
  health_status: 'healthy',
  notes: null,
};

const firstInsert = await request('log_entries', {
  token: guardian.token,
  method: 'POST',
  body: cycleTwo,
  prefer: 'return=minimal',
});

check(
  'A queued growth log cycle lands',
  'inserting cycle 2 exactly as the drain does',
  '201',
  `${firstInsert.status}`,
  firstInsert.status === 201,
);

const secondInsert = await request('log_entries', {
  token: guardian.token,
  method: 'POST',
  body: cycleTwo,
  prefer: 'return=minimal',
});

check(
  'Retrying a cycle already uploaded is a duplicate, not an error',
  're-inserting cycle 2, which is what a lost answer produces',
  'SQLSTATE 23505 — the drain treats it as already recorded and uploads the photo',
  `${secondInsert.status} ${secondInsert.payload?.code ?? ''}`,
  secondInsert.payload?.code === '23505',
);

const entriesAfterRetry = await request(
  `log_entries?select=cycle&tree_id=eq.${registration.tree_id}&order=cycle`,
  { token: guardian.token },
);

check(
  'The duplicate did not create a second cycle 2',
  'listing the tree growth log after the retry',
  'cycles 1 and 2, once each',
  entriesAfterRetry.payload.map((row) => row.cycle).join(', '),
  entriesAfterRetry.payload.length === 2,
);

// ===========================================================================
section('5 · An incoherent coordinate is flagged, never rejected');
// ===========================================================================

// Its own empty patch, so the duplicate check stays out of this one and the
// only signal in play is the drift between the two coordinates.
const elsewhere = await findEmptySpot({ lat: declared.lat + 0.02, lng: declared.lng + 0.02 });

// The photograph was taken well over the threshold from the declared point.
const farAway = { lat: elsewhere.lat + 0.005, lng: elsewhere.lng };

const suspicious = await sendPlanting(
  {
    id: crypto.randomUUID(),
    speciesRawText: 'Guanábano',
    zoneId,
    location: elsewhere,
    plantedAt: capturedAt.slice(0, 10),
    heightCm: 60,
    visibleBranches: 2,
  },
  { capturedAt, captureLocation: farAway },
);
const suspiciousRow = suspicious.payload?.[0];

check(
  'A registration with an incoherent coordinate is still registered',
  `a photograph taken ${distanceMetres(elsewhere, farAway).toFixed(0)} m from the declared point`,
  'the tree exists and has a code — nothing is rejected',
  `${suspicious.status} ${suspiciousRow?.code}`,
  suspicious.status === 200 && typeof suspiciousRow?.code === 'string',
);

check(
  'and it is flagged for a human to look at',
  'the flags register_tree() handed back',
  'gps_mismatch',
  JSON.stringify(suspiciousRow?.flags),
  (suspiciousRow?.flags ?? []).includes('gps_mismatch'),
);

// ===========================================================================
section('6 · Two trees within three metres');
// ===========================================================================

// A metre and a half north of the first tree.
const tooClose = { lat: declared.lat + 0.0000135, lng: declared.lng };

const duplicate = await sendPlanting(
  {
    id: crypto.randomUUID(),
    speciesRawText: 'Mandarino',
    zoneId,
    location: tooClose,
    plantedAt: capturedAt.slice(0, 10),
    heightCm: 44,
    visibleBranches: 3,
  },
  { capturedAt, captureLocation: tooClose },
);
const duplicateRow = duplicate.payload?.[0];

check(
  'A tree planted within three metres of another is flagged',
  `a second tree ${distanceMetres(declared, tooClose).toFixed(1)} m from the first`,
  'duplicate_location',
  JSON.stringify(duplicateRow?.flags),
  (duplicateRow?.flags ?? []).includes('duplicate_location'),
);

check(
  'and it is registered all the same',
  'a dense planting is legitimate, so nothing is refused',
  'the tree exists and has a code',
  `${duplicate.status} ${duplicateRow?.code}`,
  duplicate.status === 200 && typeof duplicateRow?.code === 'string',
);

// ===========================================================================
section('7 · The coordinator sees what was flagged, and the guardian does not');
// ===========================================================================

const guardianPeek = await request('registration_flags?select=id', { token: guardian.token });

check(
  'A guardian cannot read the flag table',
  'selecting registration_flags as the guardian who was flagged',
  'no rows — being flagged is not a running accusation on their own tree',
  `${guardianPeek.status}, ${Array.isArray(guardianPeek.payload) ? guardianPeek.payload.length : '?'} rows`,
  Array.isArray(guardianPeek.payload) && guardianPeek.payload.length === 0,
);

const guardianQueue = await request('rpc/registration_review_queue', {
  token: guardian.token,
  method: 'POST',
  body: { include_resolved: false },
});

check(
  'A guardian cannot read the review queue either',
  'calling registration_review_queue() without the coordinator role',
  'refused with 42501',
  `${guardianQueue.status} ${guardianQueue.payload?.code ?? ''}`,
  guardianQueue.payload?.code === '42501',
);

const queue = await request('rpc/registration_review_queue', {
  token: coordinator.token,
  method: 'POST',
  body: { include_resolved: false },
});

const flaggedCodes = (queue.payload ?? []).map((row) => `${row.code}:${row.reason}`);

check(
  'The coordinator sees both flagged registrations',
  'registration_review_queue() as the coordinator',
  `${suspiciousRow.code}:gps_mismatch and ${duplicateRow.code}:duplicate_location`,
  flaggedCodes.join(', ') || '(empty)',
  flaggedCodes.includes(`${suspiciousRow.code}:gps_mismatch`) &&
    flaggedCodes.includes(`${duplicateRow.code}:duplicate_location`),
);

const duplicateEntry = (queue.payload ?? []).find(
  (row) => row.code === duplicateRow.code && row.reason === 'duplicate_location',
);

check(
  'The duplicate flag names the other tree and the distance',
  'the queue row for the duplicate',
  `${registration.code}, under ${DUPLICATE_RADIUS_METRES} m`,
  `${duplicateEntry?.related_tree_code}, ${duplicateEntry?.distance_metres} m`,
  duplicateEntry?.related_tree_code === registration.code &&
    Number(duplicateEntry?.distance_metres) < DUPLICATE_RADIUS_METRES,
);

check(
  'No queue row carries an email',
  'every column registration_review_queue() returns',
  'no key containing "email"',
  Object.keys(queue.payload?.[0] ?? {}).join(', '),
  !Object.keys(queue.payload?.[0] ?? {}).some((key) => key.includes('email')),
);

// ===========================================================================
section('8 · Resolving a flag decides it without deleting anything');
// ===========================================================================

const resolved = await request('rpc/resolve_registration_flag', {
  token: coordinator.token,
  method: 'POST',
  body: {
    target_flag_id: duplicateEntry.flag_id,
    in_resolution: 'dismissed',
    in_note: 'Siembra densa en el lindero, verificada con la guardiana.',
  },
});

check(
  'A dismissed flag records who decided and when',
  'resolve_registration_flag() as the coordinator',
  'dismissed, with the coordinator and a timestamp',
  `${resolved.payload?.resolution}, by=${resolved.payload?.resolved_by === coordinator.id}, at=${resolved.payload?.resolved_at !== null}`,
  resolved.payload?.resolution === 'dismissed' &&
    resolved.payload?.resolved_by === coordinator.id &&
    resolved.payload?.resolved_at !== null,
);

const openQueue = await request('rpc/registration_review_queue', {
  token: coordinator.token,
  method: 'POST',
  body: { include_resolved: false },
});

check(
  'The resolved flag leaves the open queue',
  'registration_review_queue() again',
  'only the gps_mismatch is left',
  (openQueue.payload ?? []).map((row) => row.reason).join(', ') || '(empty)',
  !(openQueue.payload ?? []).some((row) => row.flag_id === duplicateEntry.flag_id),
);

const withResolved = await request('rpc/registration_review_queue', {
  token: coordinator.token,
  method: 'POST',
  body: { include_resolved: true },
});

check(
  'and nothing was deleted',
  'registration_review_queue(include_resolved => true)',
  'the dismissed flag is still there',
  `${(withResolved.payload ?? []).length} rows`,
  (withResolved.payload ?? []).some((row) => row.flag_id === duplicateEntry.flag_id),
);

const treeStillThere = await request(`trees?select=id,archived_at&id=eq.${duplicateRow.tree_id}`, {
  token: guardian.token,
});

check(
  'and the flagged tree is still on the map',
  'the tree behind the flag that was just judged',
  'present and not archived',
  `${treeStillThere.payload?.length} row, archived_at=${treeStillThere.payload?.[0]?.archived_at}`,
  treeStillThere.payload?.length === 1 && treeStillThere.payload[0].archived_at === null,
);

// ===========================================================================
section('9 · The photograph is in the bucket');
// ===========================================================================

const signed = await fetch(
  `${API_URL}/storage/v1/object/growth-log-photos/${registration.photo_path}`,
  {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${guardian.token}` },
  },
);

check(
  'The photograph is readable from the bucket',
  registration.photo_path,
  '200',
  `${signed.status}`,
  signed.status === 200,
);

console.log('='.repeat(78));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}

console.log('\nEvery check passed. A flagged registration is registered, and reviewed.');
console.log('Run `pnpm db:reset` to put the seed back the way it was.\n');
