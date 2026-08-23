// The map with a thousand trees, and an honest account of what that number
// does and does not tell you.
//
// ## What this measures
//
// The JavaScript the map does on every settled viewport: the round trip to
// `trees_in_viewport()` against the real database with a thousand trees in the
// frame, and the clustering that turns the answer into what gets drawn. Both
// are real code against real data -- the query is the one the app sends and the
// clusterer is the one the screen calls.
//
// ## What it cannot measure, and why the number is reported anyway
//
// **Frames per second during a pan is not measurable here.** That figure is the
// native map view rasterising markers while the camera moves, and it comes from
// `react-native-maps` on a real Android or iOS device. This machine has no
// Android SDK, no emulator and no Google Maps API key, so there is nothing to
// count frames in -- and a number produced by anything else would be a number
// about this laptop, not about the phone a guardian carries.
//
// So this reports the half that can be measured, states the other half is not
// measured, and leaves the acceptance criterion open rather than quietly
// lowering it. What the measured half is good for: it settles whether the
// JavaScript is even a candidate for the jank. If clustering a thousand markers
// costs a fraction of a millisecond, then a stutter on the device is native
// rendering and the fix is in the marker configuration, not in this code.
//
// Needs the local stack running with the seed loaded: pnpm db:reset
//
// Run with `pnpm test:map`.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CLUSTER_ZOOM,
  HUILA_FRAMING,
  clusterMarkers,
  regionToBoundingBox,
} from '../packages/core/src/map.ts';

const TREE_TARGET = 1000;

/** One frame at 60 fps. The whole budget for everything a frame does. */
const FRAME_BUDGET_MS = 16.67;

/**
 * How much of a frame the JavaScript may take before it is worth suspecting.
 *
 * A tenth. The rest belongs to the native map, to React reconciliation and to
 * the platform, and JavaScript that eats more than a tenth of a frame during a
 * pan -- which settles several times a second -- is a real candidate for the
 * stutter. Under that, it is not.
 */
const SUSPICION_RATIO = 0.1;

function localStack() {
  const cli = new URL('../node_modules/supabase/dist/supabase.js', import.meta.url);
  const raw = execFileSync(process.execPath, [cli.pathname.slice(1), 'status', '-o', 'json'], {
    encoding: 'utf8',
  });
  return JSON.parse(raw.slice(raw.indexOf('{')));
}

const { API_URL, ANON_KEY } = localStack();

/**
 * The database container, named after the project id in config.toml.
 *
 * The same route `pnpm test:reminders` takes, and for the same reason: the CLI
 * has no "run this statement" subcommand, and reaching psql inside the
 * container needs no client installed on the machine.
 */
function databaseContainer() {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const config = readFileSync(join(repoRoot, 'supabase', 'config.toml'), 'utf8');
  const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m);
  if (!projectId) {
    throw new Error('project_id not found in supabase/config.toml');
  }
  return `supabase_db_${projectId[1]}`;
}

const CONTAINER = databaseContainer();

/** Runs SQL as postgres, which is the only role allowed to plant scenery. */
function psql(statements) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      'PGCLIENTENCODING=UTF8',
      CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-tA',
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      '-',
    ],
    { input: statements, encoding: 'utf8' },
  );
}

async function viewport(box, zoom) {
  const response = await fetch(`${API_URL}/rest/v1/rpc/trees_in_viewport`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      min_lng: box.minLng,
      min_lat: box.minLat,
      max_lng: box.maxLng,
      max_lat: box.maxLat,
      zoom,
    }),
  });
  return response.json();
}

function summarise(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    worst: sorted.at(-1),
  };
}

function row(label, { median, p95, worst }) {
  console.log(
    `  ${label.padEnd(38)} ${median.toFixed(3).padStart(9)} ${p95.toFixed(3).padStart(9)} ${worst
      .toFixed(3)
      .padStart(9)}`,
  );
}

console.log('ÁrbolApp Huila — the map with a thousand trees\n');

// ---------------------------------------------------------------------------
// Enough trees to matter
// ---------------------------------------------------------------------------

const before = Number(
  psql('select count(*) from public.trees where archived_at is null;').match(/\d+/g)?.pop() ?? 0,
);

console.log(`The seed holds ${before} live trees.`);

if (before < TREE_TARGET) {
  console.log(`Simulating up to ${TREE_TARGET} by scattering copies across La Plata…\n`);

  // Copies of the seeded trees, moved to random points inside the municipality.
  // Written straight to the table as postgres rather than through
  // `register_tree()`: this is scenery for a measurement, and going through the
  // registration path would also allocate a thousand codes and raise a thousand
  // duplicate flags for trees nobody planted.
  psql(`
    insert into public.trees (
      code, guardian_id, species_id, species_raw_text, location, zone_id,
      planted_at, last_updated_at
    )
    select
      'SIM-LP-' || lpad(generation.n::text, 4, '0'),
      source.guardian_id,
      source.species_id,
      source.species_raw_text,
      extensions.st_setsrid(
        extensions.st_makepoint(
          -75.95 + random() * 0.14,
          2.32 + random() * 0.14
        ), 4326
      ),
      source.zone_id,
      source.planted_at,
      source.last_updated_at
    from generate_series(1, ${TREE_TARGET - before}) as generation(n)
    cross join lateral (
      select tree.guardian_id, tree.species_id, tree.species_raw_text, tree.zone_id,
             tree.planted_at, tree.last_updated_at
        from public.trees tree
       where tree.archived_at is null
         and tree.code not like 'SIM-%'
       offset floor(random() * ${Math.max(before - 1, 1)})
       limit 1
    ) source
    on conflict do nothing;
  `);
}

// The code shape constraint accepts only three letters, two letters and four
// digits, which `SIM-LP-0001` satisfies, so the simulated trees are ordinary
// rows in every way except that their prefix says what they are.
const total = Number(
  psql('select count(*) from public.trees where archived_at is null;').match(/\d+/g)?.pop() ?? 0,
);

console.log(`Measuring against ${total} live trees.\n`);

// ---------------------------------------------------------------------------
// The query the map sends on every settled viewport
// ---------------------------------------------------------------------------

const box = regionToBoundingBox(HUILA_FRAMING);
const zoomLevels = [
  ['department, everything clustered', 8],
  ['municipality', 12],
  ['vereda, clusters', CLUSTER_ZOOM.individualMarkers - 1],
  ['vereda, individual markers', CLUSTER_ZOOM.individualMarkers],
];

console.log('## 1 · trees_in_viewport(), round trip against the local stack\n');
console.log(
  `  ${'viewport'.padEnd(38)} ${'median'.padStart(9)} ${'p95'.padStart(9)} ${'worst'.padStart(9)}`,
);
console.log('  ' + '-'.repeat(68));

/** The answers, kept so the clustering below runs over real rows. */
const answers = new Map();

for (const [label, zoom] of zoomLevels) {
  const samples = [];

  // One warm up, then twenty. The first call pays for the connection and the
  // plan cache and says nothing about the steady state a pan actually lives in.
  await viewport(box, zoom);

  for (let index = 0; index < 20; index += 1) {
    const started = performance.now();
    const rows = await viewport(box, zoom);
    samples.push(performance.now() - started);
    answers.set(zoom, rows);
  }

  row(`${label} (z${zoom})`, summarise(samples));
}

console.log('  ' + '-'.repeat(68));
console.log('\n  Milliseconds, over the loopback. On a rural connection this is the');
console.log('  round trip and not the query, which is why the map debounces the');
console.log('  viewport before asking at all.\n');

// ---------------------------------------------------------------------------
// The clustering, which is what runs on the phone during a pan
// ---------------------------------------------------------------------------

console.log('## 2 · clusterMarkers(), the work a settled viewport does on the phone\n');
console.log(
  `  ${'zoom'.padEnd(38)} ${'median'.padStart(9)} ${'p95'.padStart(9)} ${'worst'.padStart(9)}`,
);
console.log('  ' + '-'.repeat(68));

let worstClustering = 0;

for (const [label, zoom] of zoomLevels) {
  const rows = (answers.get(zoom) ?? []).map((tree) => ({
    treeId: tree.tree_id,
    lng: tree.lng,
    lat: tree.lat,
    trackingStatus: tree.tracking_status,
    speciesId: tree.species_id,
    speciesName: tree.species_name,
  }));

  const samples = [];
  for (let index = 0; index < 200; index += 1) {
    const started = performance.now();
    clusterMarkers(rows, zoom);
    samples.push(performance.now() - started);
  }

  const stats = summarise(samples);
  worstClustering = Math.max(worstClustering, stats.worst);
  row(`${label} (z${zoom}, ${rows.length} rows)`, stats);
}

console.log('  ' + '-'.repeat(68));

const share = (worstClustering / FRAME_BUDGET_MS) * 100;

console.log(
  `\n  Worst case ${worstClustering.toFixed(3)} ms, which is ${share.toFixed(2)}% of a ` +
    `${FRAME_BUDGET_MS} ms frame.`,
);

const isJavaScriptSuspect = worstClustering > FRAME_BUDGET_MS * SUSPICION_RATIO;

console.log(
  isJavaScriptSuspect
    ? '\n  ⚠️  Over a tenth of a frame. The JavaScript is a real candidate for a\n' +
        '      stutter on the device and is worth optimising before anything else.\n'
    : '\n  Under a tenth of a frame. Whatever a pan on a real phone costs, this\n' +
        '  is not where it is being spent — which is what the measurement is for.\n',
);

// ---------------------------------------------------------------------------
// What is not measured
// ---------------------------------------------------------------------------

console.log('='.repeat(78));
console.log(`
## Frames per second during a pan: NOT MEASURED

This is the phase's acceptance criterion and it is not met, because it cannot
be measured on this machine. What it needs, exactly:

  1. An Android SDK with an emulator image, or a physical device with USB
     debugging. Neither is installed here.
  2. A Google Maps API key for Android. Without it react-native-maps renders a
     grey rectangle and there is nothing to pan.
  3. A development build, because react-native-maps is a native module and does
     not exist in Expo Go.
  4. The frame profiler — Perfetto, or the React Native performance monitor
     overlay — recording while the camera moves across the ${total} trees.

With all four, the run is: install the development build, open the map at the
department framing, pan across La Plata for thirty seconds, and read the frame
timings. The criterion is a sustained 60 fps with no frame over 32 ms.

Reporting a figure from anything else would be reporting a figure about this
laptop. The measurement above is the part that is real, and it says the
JavaScript is ${isJavaScriptSuspect ? 'worth suspecting' : 'not the suspect'}.

Run \`pnpm db:reset\` to remove the SIM- trees this script planted.
`);
