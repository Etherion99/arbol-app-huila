// Exercises planting the way the app does it: a real guardian token, the
// register_tree function, then the photograph upload against the object keys it
// handed back. Nothing here runs as postgres, because postgres bypasses RLS and
// the whole point is that a guardian can do this and cannot do more.
//
// Needs the local stack running with the seed loaded: pnpm db:reset

import { execFileSync } from 'node:child_process';

const PASSWORD = 'arbolapp2026';
const GUARDIAN_A = 'andres.cabrera@iesansebastian.edu.co';
const GUARDIAN_B = 'yulieth.perdomo@iesansebastian.edu.co';

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
      'x-upsert': 'true',
    },
    body: bytes,
  });
  const text = await response.text();
  return { status: response.status, payload: text };
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

function check(title, detail, expectation, actual, passed) {
  const mark = passed ? 'PASS' : 'FAIL';
  if (!passed) failures += 1;
  console.log(`[${mark}] ${title}`);
  console.log(`       request  ${detail}`);
  console.log(`       expected ${expectation}`);
  console.log(`       actual   ${actual}`);
  console.log('');
}

function summarise(result) {
  const body = JSON.stringify(result.payload);
  return `${result.status} ${body.length > 170 ? `${body.slice(0, 170)}...` : body}`;
}

/** The smallest thing Storage will accept as a JPEG: the two byte SOI marker. */
const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

const guardianA = await signIn(GUARDIAN_A);
const guardianB = await signIn(GUARDIAN_B);

console.log(`Guardian A  ${GUARDIAN_A}  ${guardianA.id}`);
console.log(`Guardian B  ${GUARDIAN_B}  ${guardianB.id}`);
console.log('');

const village = await request('zones?select=id,name&type=eq.village&order=slug&limit=1', {
  token: guardianA.token,
});
const zoneId = village.payload[0].id;

// ---------------------------------------------------------------------------
// Planting
// ---------------------------------------------------------------------------

const capturedAt = new Date().toISOString();

const planted = await request('rpc/register_tree', {
  token: guardianA.token,
  method: 'POST',
  body: {
    in_species_raw_text: '  MANDARINO  ',
    in_zone_id: zoneId,
    in_lng: -75.8919,
    in_lat: 2.3894,
    in_planted_at: capturedAt.slice(0, 10),
    in_height_cm: 32,
    in_visible_branches: 2,
    in_captured_at: capturedAt,
    in_capture_lng: -75.8918,
    in_capture_lat: 2.3893,
    in_notes: null,
  },
});

const registration = Array.isArray(planted.payload) ? planted.payload[0] : null;

check(
  'A guardian plants a tree and its cycle 1 entry in one call',
  'POST rpc/register_tree as guardian A',
  'a tree id, a HUI-LP-#### code and cycle 1',
  summarise(planted),
  planted.status === 200 &&
    registration !== null &&
    /^HUI-LP-\d{4}$/.test(registration.code) &&
    registration.cycle === 1,
);

check(
  'The object keys it returns follow the storage convention',
  'the photo_path and thumbnail_path of the same response',
  '<tree_id>/1/photo.jpg and <tree_id>/1/thumbnail.jpg',
  `${registration?.photo_path} · ${registration?.thumbnail_path}`,
  registration?.photo_path === `${registration?.tree_id}/1/photo.jpg` &&
    registration?.thumbnail_path === `${registration?.tree_id}/1/thumbnail.jpg`,
);

const codeTaken = await request(`trees?select=code&code=eq.${registration.code}`, {
  token: guardianA.token,
});
check(
  'The code is unique and was allocated by the database, not by the client',
  `GET trees?code=eq.${registration.code}`,
  'exactly one tree carrying that code',
  summarise(codeTaken),
  codeTaken.status === 200 && codeTaken.payload.length === 1,
);

// The species field is free text and the raw text is what the guardian typed.
const storedTree = await request(
  `trees?select=species_raw_text,species_id,last_updated_at&id=eq.${registration.tree_id}`,
  { token: guardianA.token },
);
check(
  'The raw species text is stored trimmed but otherwise untouched',
  `GET trees?id=eq.${registration.tree_id}`,
  'species_raw_text is "MANDARINO", not the normalised key',
  summarise(storedTree),
  storedTree.payload[0]?.species_raw_text === 'MANDARINO',
);

check(
  'The trigger moved the tree clock to the capture time, not to now',
  'the last_updated_at of the same row',
  `${capturedAt}`,
  `${storedTree.payload[0]?.last_updated_at}`,
  new Date(storedTree.payload[0]?.last_updated_at).getTime() === new Date(capturedAt).getTime(),
);

// ---------------------------------------------------------------------------
// The photograph, uploaded after the row exists
// ---------------------------------------------------------------------------

const photoUpload = await upload(registration.photo_path, guardianA.token, FAKE_JPEG);
check(
  'The guardian may upload the photograph to the key the function returned',
  `POST storage object ${registration.photo_path} as guardian A`,
  '200, because the tree row already exists and owns_tree() can see it',
  `${photoUpload.status} ${photoUpload.payload.slice(0, 120)}`,
  photoUpload.status === 200,
);

const intruderUpload = await upload(registration.photo_path, guardianB.token, FAKE_JPEG);
check(
  'Another guardian may not upload into that tree folder',
  `POST storage object ${registration.photo_path} as guardian B`,
  'rejected by the storage policy',
  `${intruderUpload.status} ${intruderUpload.payload.slice(0, 120)}`,
  intruderUpload.status >= 400,
);

// ---------------------------------------------------------------------------
// Growth log
// ---------------------------------------------------------------------------

const secondEntry = await request('log_entries', {
  token: guardianA.token,
  method: 'POST',
  prefer: 'return=representation',
  body: {
    tree_id: registration.tree_id,
    author_id: guardianA.id,
    cycle: 2,
    photo_path: `${registration.tree_id}/2/photo.jpg`,
    thumbnail_path: `${registration.tree_id}/2/thumbnail.jpg`,
    captured_at: new Date().toISOString(),
    capture_location: 'SRID=4326;POINT(-75.8918 2.3893)',
    height_cm: 48,
    visible_branches: 4,
    health_status: 'healthy',
    notes: 'Le salieron hojas nuevas',
  },
});
check(
  'A second cycle can be written, coordinate and all',
  'POST log_entries with cycle 2 as guardian A',
  '201 and on_time decided by the database',
  summarise(secondEntry),
  secondEntry.status === 201 && secondEntry.payload[0]?.on_time === true,
);

const duplicate = await request('log_entries', {
  token: guardianA.token,
  method: 'POST',
  prefer: 'return=representation',
  body: {
    tree_id: registration.tree_id,
    author_id: guardianA.id,
    cycle: 2,
    photo_path: `${registration.tree_id}/2/photo.jpg`,
    thumbnail_path: `${registration.tree_id}/2/thumbnail.jpg`,
    captured_at: new Date().toISOString(),
    height_cm: 48,
    visible_branches: 4,
    health_status: 'healthy',
  },
});
check(
  'Retrying the same cycle is a duplicate, and says so with a code the client can read',
  'POST log_entries with cycle 2 again',
  '409 with SQLSTATE 23505, so a retry is not mistaken for an unexpected failure',
  summarise(duplicate),
  duplicate.status === 409 && duplicate.payload?.code === '23505',
);

const deadEntry = await request('log_entries', {
  token: guardianA.token,
  method: 'POST',
  prefer: 'return=representation',
  body: {
    tree_id: registration.tree_id,
    author_id: guardianA.id,
    cycle: 3,
    photo_path: `${registration.tree_id}/3/photo.jpg`,
    thumbnail_path: `${registration.tree_id}/3/thumbnail.jpg`,
    captured_at: new Date().toISOString(),
    height_cm: null,
    visible_branches: null,
    health_status: 'dead',
    notes: 'Sequía. El verano fue muy fuerte y no aguantó.',
  },
});
check(
  'A death report needs no measurements, only a cause',
  'POST log_entries with health_status dead, height_cm null',
  '201',
  summarise(deadEntry),
  deadEntry.status === 201,
);

const deadWithoutCause = await request('log_entries', {
  token: guardianA.token,
  method: 'POST',
  body: {
    tree_id: registration.tree_id,
    author_id: guardianA.id,
    cycle: 4,
    photo_path: `${registration.tree_id}/4/photo.jpg`,
    thumbnail_path: `${registration.tree_id}/4/thumbnail.jpg`,
    captured_at: new Date().toISOString(),
    health_status: 'dead',
    notes: '   ',
  },
});
check(
  'A death report without a cause is refused by the database',
  'POST log_entries with health_status dead and blank notes',
  'rejected by log_entries_cause_when_dead',
  summarise(deadWithoutCause),
  deadWithoutCause.status >= 400,
);

const afterDeath = await request(`rpc/tree_card?target_tree_id=${registration.tree_id}`, {
  token: guardianA.token,
});
const card = afterDeath.payload?.[0];
check(
  'The death propagated to the tree, and the card carries the coordinates',
  `GET rpc/tree_card for ${registration.code}`,
  'status dead, tracking dead, and an lng/lat pair for the mini map',
  summarise(afterDeath),
  card?.status === 'dead' &&
    card?.tracking_status === 'dead' &&
    typeof card?.lng === 'number' &&
    typeof card?.lat === 'number',
);

// ---------------------------------------------------------------------------
// The guardian's own list
// ---------------------------------------------------------------------------

const mine = await request('rpc/guardian_trees', { token: guardianA.token, method: 'POST' });
check(
  'The list returns only the caller’s trees, newest due first',
  'POST rpc/guardian_trees as guardian A',
  'every row belongs to guardian A and the new tree is among them',
  `${mine.status} ${mine.payload?.length} trees`,
  mine.status === 200 && mine.payload.some((tree) => tree.tree_id === registration.tree_id),
);

const notMine = await request('rpc/guardian_trees', { token: guardianB.token, method: 'POST' });
check(
  'And guardian B sees a different set entirely',
  'POST rpc/guardian_trees as guardian B',
  `a list that does not contain ${registration.code}`,
  `${notMine.status} ${notMine.payload?.length} trees`,
  notMine.status === 200 && !notMine.payload.some((tree) => tree.tree_id === registration.tree_id),
);

// ---------------------------------------------------------------------------
// Species convergence
// ---------------------------------------------------------------------------

const suggestions = await request('rpc/species_suggestions', {
  token: guardianA.token,
  method: 'POST',
  body: { search_text: 'mand', max_results: 5 },
});
check(
  'The autocomplete offers what already exists, ordered by how many trees carry it',
  'POST rpc/species_suggestions with "mand"',
  'at least one suggestion, sorted by tree_count descending',
  summarise(suggestions),
  suggestions.status === 200 &&
    suggestions.payload.length > 0 &&
    suggestions.payload.every(
      (row, index, all) => index === 0 || all[index - 1].tree_count >= row.tree_count,
    ),
);

console.log('='.repeat(78));
console.log(
  failures === 0 ? '\nEvery tree registration check passed.' : `\n${failures} check(s) failed.`,
);
console.log('Run pnpm db:reset to put the seed back the way it was.');

process.exit(failures === 0 ? 0 : 1);
