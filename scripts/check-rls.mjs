// Exercises the row level policies the way a client hits them: real sign ins,
// real tokens, real REST calls. Nothing here runs as postgres, because postgres
// bypasses RLS and would prove nothing.
//
// Needs the local stack running with the seed loaded: pnpm db:reset

import { execFileSync } from 'node:child_process';

const PASSWORD = 'arbolapp2026';
const GUARDIAN_A = 'andres.cabrera@iesansebastian.edu.co';
const GUARDIAN_B = 'yulieth.perdomo@iesansebastian.edu.co';
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
  return `${result.status} ${body.length > 150 ? `${body.slice(0, 150)}...` : body}`;
}

const guardianA = await signIn(GUARDIAN_A);
const guardianB = await signIn(GUARDIAN_B);
const coordinator = await signIn(COORDINATOR);

console.log(`Guardian A  ${GUARDIAN_A}  ${guardianA.id}`);
console.log(`Guardian B  ${GUARDIAN_B}  ${guardianB.id}`);
console.log(`Coordinator ${COORDINATOR}  ${coordinator.id}`);
console.log('');

// A tree that belongs to each of them, and one that is already archived.
const treesOfB = await request(
  `trees?select=id,code&guardian_id=eq.${guardianB.id}&archived_at=is.null&limit=1`,
  { token: guardianB.token },
);
const treesOfA = await request(
  `trees?select=id,code&guardian_id=eq.${guardianA.id}&archived_at=is.null&limit=1`,
  { token: guardianA.token },
);
const archived = await request('trees?select=id,code&archived_at=not.is.null&limit=1', {
  token: coordinator.token,
});

const treeOfB = treesOfB.payload[0];
const treeOfA = treesOfA.payload[0];
const archivedTree = archived.payload[0];

console.log(`Tree of A       ${treeOfA.code}  ${treeOfA.id}`);
console.log(`Tree of B       ${treeOfB.code}  ${treeOfB.id}`);
console.log(`Archived tree   ${archivedTree.code}  ${archivedTree.id}`);
console.log('');
console.log('='.repeat(78));
console.log('');

// ---------------------------------------------------------------------------
// Guardian A against guardian B
// ---------------------------------------------------------------------------

const editForeignTree = await request(`trees?id=eq.${treeOfB.id}`, {
  token: guardianA.token,
  method: 'PATCH',
  prefer: 'return=representation',
  body: { species_raw_text: 'intento de edicion ajena' },
});
check(
  'Guardian A cannot modify a tree of guardian B',
  `PATCH trees?id=eq.${treeOfB.id} as A {"species_raw_text":"..."}`,
  '200 with an empty array: the row is invisible to the update',
  summarise(editForeignTree),
  editForeignTree.status === 200 &&
    Array.isArray(editForeignTree.payload) &&
    editForeignTree.payload.length === 0,
);

const archiveForeignTree = await request(`trees?id=eq.${treeOfB.id}`, {
  token: guardianA.token,
  method: 'PATCH',
  prefer: 'return=representation',
  body: { archived_at: new Date().toISOString() },
});
check(
  'Guardian A cannot archive a tree of guardian B',
  `PATCH trees?id=eq.${treeOfB.id} as A {"archived_at":"..."}`,
  '200 with an empty array',
  summarise(archiveForeignTree),
  archiveForeignTree.status === 200 &&
    Array.isArray(archiveForeignTree.payload) &&
    archiveForeignTree.payload.length === 0,
);

const stillOwnedByB = await request(
  `trees?select=species_raw_text,archived_at&id=eq.${treeOfB.id}`,
  {
    token: guardianB.token,
  },
);
check(
  'The tree of guardian B is untouched after both attempts',
  `GET trees?id=eq.${treeOfB.id} as B`,
  'archived_at still null and the species text unchanged',
  summarise(stillOwnedByB),
  stillOwnedByB.payload[0].archived_at === null &&
    stillOwnedByB.payload[0].species_raw_text !== 'intento de edicion ajena',
);

const archiveOwnTree = await request(`trees?id=eq.${treeOfA.id}`, {
  token: guardianA.token,
  method: 'PATCH',
  prefer: 'return=representation',
  body: { archived_at: new Date().toISOString() },
});
check(
  'Guardian A cannot archive even their own tree',
  `PATCH trees?id=eq.${treeOfA.id} as A {"archived_at":"..."}`,
  "403: archiving is the coordinator's, the with check clause rejects it",
  summarise(archiveOwnTree),
  archiveOwnTree.status === 403,
);

const editOwnTree = await request(`trees?id=eq.${treeOfA.id}`, {
  token: guardianA.token,
  method: 'PATCH',
  prefer: 'return=representation',
  body: { species_raw_text: 'mandarino' },
});
check(
  'Guardian A can update their own tree',
  `PATCH trees?id=eq.${treeOfA.id} as A {"species_raw_text":"mandarino"}`,
  '200 with the updated row',
  summarise(editOwnTree),
  editOwnTree.status === 200 && editOwnTree.payload.length === 1,
);

const logOnForeignTree = await request('log_entries', {
  token: guardianA.token,
  method: 'POST',
  prefer: 'return=representation',
  body: {
    tree_id: treeOfB.id,
    author_id: guardianA.id,
    cycle: 99,
    photo_path: `${treeOfB.id}/99/photo.jpg`,
    thumbnail_path: `${treeOfB.id}/99/thumbnail.jpg`,
    captured_at: new Date().toISOString(),
    height_cm: 120,
    visible_branches: 5,
    health_status: 'healthy',
  },
});
check(
  'Guardian A cannot add a growth log entry to a tree of guardian B',
  'POST log_entries as A with tree_id of B',
  '403: the insert policy requires owning the tree',
  summarise(logOnForeignTree),
  logOnForeignTree.status === 403,
);

const escalate = await request(`users?id=eq.${guardianA.id}`, {
  token: guardianA.token,
  method: 'PATCH',
  prefer: 'return=minimal',
  body: { role: 'coordinator' },
});
check(
  'Guardian A cannot promote themselves to coordinator',
  `PATCH users?id=eq.${guardianA.id} as A {"role":"coordinator"}`,
  '403: the new role must match the stored one',
  summarise(escalate),
  escalate.status === 403,
);

console.log('='.repeat(78));
console.log('');

// ---------------------------------------------------------------------------
// The anonymous visitor
// ---------------------------------------------------------------------------

const anonArchived = await request('trees?select=id,code&archived_at=not.is.null');
check(
  'An anonymous visitor sees no archived tree',
  'GET trees?archived_at=not.is.null with the anon key',
  '200 with an empty array',
  summarise(anonArchived),
  anonArchived.status === 200 && anonArchived.payload.length === 0,
);

const anonArchivedById = await request(`trees?select=id&id=eq.${archivedTree.id}`);
check(
  'An anonymous visitor cannot reach an archived tree by its identifier either',
  `GET trees?id=eq.${archivedTree.id} with the anon key`,
  '200 with an empty array',
  summarise(anonArchivedById),
  anonArchivedById.status === 200 && anonArchivedById.payload.length === 0,
);

const anonCount = await request('trees?select=id');
check(
  'An anonymous visitor sees the active trees',
  'GET trees?select=id with the anon key',
  'a non empty array',
  `${anonCount.status} ${anonCount.payload.length} rows`,
  anonCount.status === 200 && anonCount.payload.length > 0,
);

const anonEmail = await request('users?select=email');
check(
  'An anonymous visitor cannot select the email column',
  'GET users?select=email with the anon key',
  'a permission error: anon holds no privilege on that column',
  summarise(anonEmail),
  anonEmail.status >= 400,
);

const anonStar = await request('users?select=*&limit=1');
check(
  'An anonymous visitor cannot reach the email through select=*',
  'GET users?select=*&limit=1 with the anon key',
  'a permission error',
  summarise(anonStar),
  anonStar.status >= 400,
);

const anonPublicUsers = await request('public_users?select=*&limit=1');
check(
  'The public projection of a guardian carries no email',
  'GET public_users?select=*&limit=1 with the anon key',
  '200 and no email key in the row',
  summarise(anonPublicUsers),
  anonPublicUsers.status === 200 &&
    anonPublicUsers.payload.length === 1 &&
    !('email' in anonPublicUsers.payload[0]),
);

const anonDirectory = await request('user_directory?select=email');
check(
  'An anonymous visitor cannot read the coordinator directory',
  'GET user_directory?select=email with the anon key',
  'a permission error',
  summarise(anonDirectory),
  anonDirectory.status >= 400,
);

const anonDevices = await request('devices?select=expo_push_token');
check(
  'An anonymous visitor cannot read the push tokens',
  'GET devices?select=expo_push_token with the anon key',
  'a permission error',
  summarise(anonDevices),
  anonDevices.status >= 400,
);

const anonReminders = await request('reminders?select=*');
check(
  'An anonymous visitor cannot read the reminders',
  'GET reminders?select=* with the anon key',
  'a permission error',
  summarise(anonReminders),
  anonReminders.status >= 400,
);

const anonInsert = await request('trees', {
  method: 'POST',
  prefer: 'return=minimal',
  body: {
    code: 'HUI-LP-9999',
    species_id: null,
    species_raw_text: 'mandarino',
    zone_id: null,
    planted_at: '2026-01-01',
  },
});
check(
  'An anonymous visitor cannot plant a tree',
  'POST trees with the anon key',
  'a permission error',
  summarise(anonInsert),
  anonInsert.status >= 400,
);

console.log('='.repeat(78));
console.log('');

// ---------------------------------------------------------------------------
// Guardian A against everyone else's private data
// ---------------------------------------------------------------------------

const foreignEmailAsGuardian = await request('users?select=email');
const guardianEmail = await request('users?select=email', { token: guardianA.token });
check(
  'A signed in guardian cannot select the email column either',
  'GET users?select=email as A',
  'a permission error',
  summarise(guardianEmail),
  guardianEmail.status >= 400 && foreignEmailAsGuardian.status >= 400,
);

const guardianDirectory = await request('user_directory?select=id,email', {
  token: guardianA.token,
});
check(
  'A guardian sees only their own row in the directory',
  'GET user_directory?select=id,email as A',
  '200 with exactly one row, their own',
  summarise(guardianDirectory),
  guardianDirectory.status === 200 &&
    guardianDirectory.payload.length === 1 &&
    guardianDirectory.payload[0].id === guardianA.id,
);

const remindersOfB = await request(`reminders?select=id&user_id=eq.${guardianB.id}`, {
  token: guardianA.token,
});
check(
  'A guardian cannot read the reminders addressed to another guardian',
  `GET reminders?user_id=eq.${guardianB.id} as A`,
  '200 with an empty array',
  summarise(remindersOfB),
  remindersOfB.status === 200 && remindersOfB.payload.length === 0,
);

// The seed registers one device per guardian, so the honest expectation is one
// row and only one: the caller's own.
const visibleDevices = await request('devices?select=user_id,expo_push_token', {
  token: guardianA.token,
});
check(
  "A guardian reads their own push token and nobody else's",
  'GET devices?select=user_id,expo_push_token as A',
  'exactly one row, belonging to A, out of the six the seed registers',
  summarise(visibleDevices),
  visibleDevices.status === 200 &&
    visibleDevices.payload.length === 1 &&
    visibleDevices.payload.every((device) => device.user_id === guardianA.id),
);

console.log('='.repeat(78));
console.log('');

// ---------------------------------------------------------------------------
// The coordinator
// ---------------------------------------------------------------------------

const coordinatorDirectory = await request('user_directory?select=id,email', {
  token: coordinator.token,
});
check(
  'The coordinator does reach the emails',
  'GET user_directory?select=id,email as coordinator',
  '200 with every profile',
  `${coordinatorDirectory.status} ${coordinatorDirectory.payload.length} rows`,
  coordinatorDirectory.status === 200 && coordinatorDirectory.payload.length === 7,
);

const coordinatorArchived = await request('trees?select=id&archived_at=not.is.null', {
  token: coordinator.token,
});
check(
  'The coordinator does see the archived trees',
  'GET trees?archived_at=not.is.null as coordinator',
  'a non empty array',
  `${coordinatorArchived.status} ${coordinatorArchived.payload.length} rows`,
  coordinatorArchived.status === 200 && coordinatorArchived.payload.length > 0,
);

const coordinatorArchives = await request(`trees?id=eq.${treeOfB.id}`, {
  token: coordinator.token,
  method: 'PATCH',
  prefer: 'return=representation',
  body: {
    archived_at: new Date().toISOString(),
    archived_by: coordinator.id,
    archive_reason: 'Prueba de archivado por el coordinador.',
  },
});
check(
  'The coordinator can archive the tree guardian A could not touch',
  `PATCH trees?id=eq.${treeOfB.id} as coordinator {"archived_at":"..."}`,
  '200 with the archived row',
  summarise(coordinatorArchives),
  coordinatorArchives.status === 200 && coordinatorArchives.payload.length === 1,
);

const anonAfterArchive = await request(`trees?select=id&id=eq.${treeOfB.id}`);
check(
  'That tree disappears from the anonymous view straight away',
  `GET trees?id=eq.${treeOfB.id} with the anon key`,
  '200 with an empty array',
  summarise(anonAfterArchive),
  anonAfterArchive.status === 200 && anonAfterArchive.payload.length === 0,
);

const viewportAfterArchive = await request('rpc/trees_in_viewport', {
  method: 'POST',
  body: {
    min_lng: -76.05,
    min_lat: 2.28,
    max_lng: -75.78,
    max_lat: 2.5,
    zoom: 13,
  },
});
check(
  'And it is gone from the map viewport too',
  'POST rpc/trees_in_viewport over La Plata with the anon key',
  `a result set that no longer contains ${treeOfB.code}`,
  `${viewportAfterArchive.status} ${viewportAfterArchive.payload.length} trees`,
  viewportAfterArchive.status === 200 &&
    !viewportAfterArchive.payload.some((tree) => tree.tree_id === treeOfB.id),
);

console.log('='.repeat(78));
console.log(
  failures === 0 ? '\nEvery row level security check passed.' : `\n${failures} check(s) failed.`,
);
console.log('Run pnpm db:reset to put the seed back the way it was.');

process.exit(failures === 0 ? 0 : 1);
