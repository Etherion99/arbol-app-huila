// Exercises the species merge end to end, which is how free text species are
// meant to converge: nothing is rewritten when the guardian types, and the
// coordinator decides afterwards which names describe the same tree.
//
// The case run here is the one the project asked for: some trees registered as
// mandarino, some as mandarinos and some as mandarina, all folded into a single
// group the coordinator renames to something that is none of the three.
//
// Needs the local stack running with the seed loaded: pnpm db:reset

import { execFileSync } from 'node:child_process';

const PASSWORD = 'arbolapp2026';
const GUARDIAN = 'andres.cabrera@iesansebastian.edu.co';
const COORDINATOR = 'coordinacion@iesansebastian.edu.co';
const MERGED_NAME = 'Árboles de mandarina';

function localStack() {
  const cli = new URL('../node_modules/supabase/dist/supabase.js', import.meta.url);
  const raw = execFileSync(process.execPath, [cli.pathname.slice(1), 'status', '-o', 'json'], {
    encoding: 'utf8',
  });
  return JSON.parse(raw.slice(raw.indexOf('{')));
}

const { API_URL, ANON_KEY } = localStack();

let failures = 0;

async function request(path, { token, method = 'GET', body } = {}) {
  const headers = { apikey: ANON_KEY, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

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

function check(title, expectation, actual, passed) {
  if (!passed) failures += 1;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}`);
  console.log(`       expected ${expectation}`);
  console.log(`       actual   ${actual}`);
  console.log('');
}

async function speciesByKey(key, token) {
  const result = await request(
    `species?select=id,normalized_key,canonical_name,merged_into_id,archived_at` +
      `&normalized_key=eq.${encodeURIComponent(key)}`,
    { token },
  );
  return result.payload[0];
}

async function treeCount(speciesId, token) {
  const result = await request(`trees?select=id&species_id=eq.${speciesId}`, { token });
  return result.payload.length;
}

async function rawTexts(speciesId, token) {
  const result = await request(`trees?select=species_raw_text&species_id=eq.${speciesId}`, {
    token,
  });
  return [...new Set(result.payload.map((tree) => tree.species_raw_text))].sort();
}

const guardian = await signIn(GUARDIAN);
const coordinator = await signIn(COORDINATOR);
const asCoordinator = { token: coordinator.token };

const target = await speciesByKey('mandarino', coordinator.token);
const plural = await speciesByKey('mandarinos', coordinator.token);
const feminine = await speciesByKey('mandarina', coordinator.token);

const before = {
  mandarino: await treeCount(target.id, coordinator.token),
  mandarinos: await treeCount(plural.id, coordinator.token),
  mandarina: await treeCount(feminine.id, coordinator.token),
};
const total = before.mandarino + before.mandarinos + before.mandarina;

console.log('Before the merge, three separate species:');
console.log(`  mandarino   "${target.canonical_name}"   ${before.mandarino} trees`);
console.log(`  mandarinos  "${plural.canonical_name}"  ${before.mandarinos} trees`);
console.log(`  mandarina   "${feminine.canonical_name}"   ${before.mandarina} trees`);
console.log(`  total ${total} trees the coordinator considers the same tree`);
console.log('');
console.log('='.repeat(78));
console.log('');

// ---------------------------------------------------------------------------

const guardianAttempt = await request('rpc/merge_species', {
  token: guardian.token,
  method: 'POST',
  body: {
    source_species_ids: [plural.id, feminine.id],
    target_species_id: target.id,
    new_canonical_name: 'lo que sea',
  },
});
check(
  'A guardian cannot merge species',
  'an error: the function checks the role before doing anything',
  `${guardianAttempt.status} ${JSON.stringify(guardianAttempt.payload?.message ?? guardianAttempt.payload)}`,
  guardianAttempt.status >= 400,
);

const stillSeparate = await treeCount(target.id, coordinator.token);
check(
  'Nothing moved after the refused attempt',
  `mandarino still has ${before.mandarino} trees`,
  `${stillSeparate} trees`,
  stillSeparate === before.mandarino,
);

// ---------------------------------------------------------------------------

const merge = await request('rpc/merge_species', {
  token: coordinator.token,
  method: 'POST',
  body: {
    source_species_ids: [plural.id, feminine.id],
    target_species_id: target.id,
    new_canonical_name: MERGED_NAME,
  },
});
const mergeIds = Array.isArray(merge.payload)
  ? merge.payload.map((row) => (typeof row === 'string' ? row : Object.values(row)[0]))
  : [];
check(
  'The coordinator merges both variants into one',
  'two recorded merges, one per source',
  `${merge.status} ${mergeIds.length} merge id(s)`,
  merge.status < 300 && mergeIds.length === 2,
);

const merged = await speciesByKey('mandarino', coordinator.token);
const mergedCount = await treeCount(target.id, coordinator.token);
check(
  'Every tree now counts under one species',
  `${total} trees on the surviving species`,
  `${mergedCount} trees`,
  mergedCount === total,
);

check(
  'The surviving name is the one the coordinator chose, not one of the merged ones',
  `"${MERGED_NAME}", which was none of the three original names`,
  `"${merged.canonical_name}"`,
  merged.canonical_name === MERGED_NAME,
);

const survivingTexts = await rawTexts(target.id, coordinator.token);
check(
  'What each guardian originally typed is untouched',
  'the original spellings all still present on the trees',
  JSON.stringify(survivingTexts),
  survivingTexts.length >= 3 &&
    survivingTexts.some((text) => text.trim() === 'MANDARINOS') &&
    survivingTexts.some((text) => text.trim() === 'Mandarina'),
);

const archivedSource = await speciesByKey('mandarinos', coordinator.token);
check(
  'The merged species is archived and points at its target, never deleted',
  'archived_at set and merged_into_id pointing at mandarino',
  `archived_at ${archivedSource.archived_at === null ? 'null' : 'set'}, ` +
    `merged_into_id ${archivedSource.merged_into_id === target.id ? 'correct' : 'wrong'}`,
  archivedSource.archived_at !== null && archivedSource.merged_into_id === target.id,
);

const anonymousSees = await request('species?select=normalized_key&normalized_key=eq.mandarinos');
check(
  'And it disappears from the public catalogue',
  '200 with an empty array for an anonymous visitor',
  `${anonymousSees.status} ${JSON.stringify(anonymousSees.payload)}`,
  anonymousSees.status === 200 && anonymousSees.payload.length === 0,
);

console.log('='.repeat(78));
console.log('');

// ---------------------------------------------------------------------------

for (const mergeId of mergeIds) {
  await request('rpc/revert_species_merge', {
    token: coordinator.token,
    method: 'POST',
    body: { merge_id: mergeId },
  });
}

const restoredTarget = await speciesByKey('mandarino', coordinator.token);
const restoredPlural = await speciesByKey('mandarinos', coordinator.token);
const after = {
  mandarino: await treeCount(target.id, coordinator.token),
  mandarinos: await treeCount(plural.id, coordinator.token),
  mandarina: await treeCount(feminine.id, coordinator.token),
};

check(
  'Reverting puts exactly the same trees back where they were',
  JSON.stringify(before),
  JSON.stringify(after),
  after.mandarino === before.mandarino &&
    after.mandarinos === before.mandarinos &&
    after.mandarina === before.mandarina,
);

check(
  'And the display name goes back to what it was',
  `"${target.canonical_name}"`,
  `"${restoredTarget.canonical_name}"`,
  restoredTarget.canonical_name === target.canonical_name,
);

check(
  'The un-merged species is active again',
  'archived_at null and merged_into_id null',
  `archived_at ${restoredPlural.archived_at === null ? 'null' : 'set'}, ` +
    `merged_into_id ${restoredPlural.merged_into_id === null ? 'null' : 'set'}`,
  restoredPlural.archived_at === null && restoredPlural.merged_into_id === null,
);

// Scoped to the merges this run created, so running the script twice against
// the same database does not trip over the rows the first run left behind.
const auditTrail = await request(
  `species_merges?select=id,affected_tree_count,reverted_at&id=in.(${mergeIds.join(',')})`,
  asCoordinator,
);
check(
  'The merge stays on record as reverted, rather than being deleted',
  'both rows still present, both with reverted_at set',
  `${auditTrail.payload.length} rows, ` +
    `${auditTrail.payload.filter((row) => row.reverted_at !== null).length} reverted`,
  auditTrail.payload.length === 2 && auditTrail.payload.every((row) => row.reverted_at !== null),
);

console.log('='.repeat(78));
console.log(
  failures === 0 ? '\nEvery species merge check passed.' : `\n${failures} check(s) failed.`,
);

process.exit(failures === 0 ? 0 : 1);
