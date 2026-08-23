import { scanNative } from './scripts/contrast/scan-native.mjs';
import { join } from 'node:path';
const root = join(process.cwd(), 'apps', 'mobile', 'src');
const t = Date.now();
const rows = scanNative(root, { '@/': join(root, '/'), '@arbolapp/core': join(process.cwd(), 'packages/core/src/index.ts') });
console.log('rows', rows.length, 'in', Date.now() - t, 'ms');
for (const r of rows.slice(0, 25)) {
  console.log(r.ratio.toFixed(2).padStart(6), r.kind.padEnd(4), r.type.padEnd(10), r.ink.spelling.padEnd(16), 'on', r.ground.spelling.padEnd(18), r.sites[0].where, r.sites[0].label, r.sites[0].guards);
}
