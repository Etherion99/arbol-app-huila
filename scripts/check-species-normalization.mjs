// Proves that normalize_species() in the database and normalizeSpecies() in
// packages/core produce the same key for the same text.
//
// They have to agree exactly. The per-species count is taken over the key, so
// the day the two implementations disagree on one accent or one plural, a
// single species silently becomes two rows in the report and nothing anywhere
// raises an error.
//
// Needs the local stack running: pnpm db:start

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { normalizeSpecies } from '../packages/core/src/domain.ts';

// Built from character codes rather than written inline, so an editor or a
// terminal cannot quietly rewrite the invisible ones.
const NBSP = String.fromCharCode(0x00a0);
const EN_SPACE = String.fromCharCode(0x2002);
const IDEOGRAPHIC_SPACE = String.fromCharCode(0x3000);
const ZERO_WIDTH_NBSP = String.fromCharCode(0xfeff);

const VARIANTS = [
  // The way guardians actually write the species.
  'mandarino',
  'Mandarina',
  'MANDARINOS',
  'mandarinos',
  'mandarino ',
  'limón',
  'Limón Tahití',
  'LIMONES',
  'naranjo',
  'NARANJOS',
  'aguacate',
  'Aguacates',
  'aguacate hass',
  'Aguacate Hass',
  'guayabo',
  'Guayaba',
  'mango',
  'Mangos',
  'chirimoya',
  'Granadillas',
  'Papayos',
  // Accents in every position, including the tilde, which decomposes the same
  // way an accent does.
  'Níspero',
  'MARAÑÓN',
  'maracuyá',
  'Café Caturra',
  // Whitespace the two languages do not agree about by default.
  '   mandarino   ',
  `mandarino${NBSP}injerto`,
  `naranjo${EN_SPACE}valencia`,
  `lulo${IDEOGRAPHIC_SPACE}la selva`,
  `mango${ZERO_WIDTH_NBSP}`,
  'limon\tpajarito',
  'guayabo\n\npera',
  'aguacate    lorena',
  // Degenerate input the form should reject but the key still has to survive.
  '',
  '   ',
  'S',
  's',
  'ss',
];

function databaseContainer() {
  const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m);
  if (!projectId) {
    throw new Error('project_id not found in supabase/config.toml');
  }
  return `supabase_db_${projectId[1]}`;
}

function keysFromDatabase(variants) {
  // Only selects, so that every line psql writes back is a result. A `set`
  // statement here would print its command tag and shift the whole comparison
  // by one row. The encoding is pinned through the environment instead.
  const statements = variants
    .map((variant) => `select public.normalize_species($variant$${variant}$variant$);`)
    .join('\n');

  const output = execFileSync(
    'docker',
    // -tA gives one bare result per line, in the order the statements are sent.
    [
      'exec',
      '-i',
      '-e',
      'PGCLIENTENCODING=UTF8',
      databaseContainer(),
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

  return output.split('\n').slice(0, variants.length);
}

function readable(text) {
  return JSON.stringify(text);
}

const databaseKeys = keysFromDatabase(VARIANTS);
const mismatches = [];

console.log(`Comparing ${VARIANTS.length} variants.\n`);
console.log(`${'input'.padEnd(26)} ${'typescript'.padEnd(24)} ${'sql'.padEnd(24)} match`);
console.log('-'.repeat(84));

VARIANTS.forEach((variant, index) => {
  const fromTypescript = normalizeSpecies(variant);
  const fromDatabase = databaseKeys[index];
  const agree = fromTypescript === fromDatabase;

  if (!agree) {
    mismatches.push({ variant, fromTypescript, fromDatabase });
  }

  console.log(
    `${readable(variant).padEnd(26)} ${readable(fromTypescript).padEnd(24)} ` +
      `${readable(fromDatabase).padEnd(24)} ${agree ? 'yes' : 'NO'}`,
  );
});

console.log('-'.repeat(84));

if (mismatches.length > 0) {
  console.error(`\n${mismatches.length} variant(s) disagree. The species count would split.`);
  for (const mismatch of mismatches) {
    console.error(
      `  ${readable(mismatch.variant)}: typescript ${readable(mismatch.fromTypescript)} ` +
        `vs sql ${readable(mismatch.fromDatabase)}`,
    );
  }
  process.exit(1);
}

console.log(`\nAll ${VARIANTS.length} variants produce the same key in both implementations.`);
