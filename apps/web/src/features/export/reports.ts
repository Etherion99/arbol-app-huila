import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { TrackingStatus, TreeStatus, Uuid } from '@arbolapp/core';

import { texts } from '@/constants/texts';
import { createClient } from '@/lib/supabase/server';
import { fileStamp } from '@/lib/format';

/**
 * The three reports of D7, built as CSV on the server.
 *
 * ## The rule these files obey
 *
 * **No export carries a guardian email.** Not one of the queries below touches
 * `user_directory`, which is the only place an email is reachable: the names
 * come from `public_users`, which has no email column at all, and everything
 * else from `tree_overview` and the statistics views. The rule is enforced by
 * where the data is read from, not by remembering to drop a column.
 *
 * ## Why semicolons
 *
 * These files are opened in Excel in Spanish, where the list separator is `;`
 * and a comma separated file lands entirely in column A. The BOM is what makes
 * Excel read the accents as UTF-8 instead of as mojibake -- "vereda El
 * Carmelo", not "El Carmelo" with a broken tilde.
 */

export const REPORT_IDS = ['inventory', 'logbook', 'indicators'] as const;

export type ReportId = (typeof REPORT_IDS)[number];

export function isReportId(value: string): value is ReportId {
  return (REPORT_IDS as readonly string[]).includes(value);
}

export type ReportFile = { fileName: string; csv: string };

const SEPARATOR = ';';
const BOM = '\uFEFF';

/** How many rows one PostgREST page returns before the next one is asked for. */
const PAGE_SIZE = 1000;

/**
 * The ceiling `trees_in_viewport()` puts on its answer at zoom 15 or more.
 *
 * It is the only reachable source of a tree's coordinates: the location is a
 * PostGIS geometry and no plain select turns it into a pair of numbers. Above
 * this many trees the coordinate cells are left empty rather than filled with
 * something approximate, and the export screen says so.
 */
const VIEWPORT_CEILING = 1000;

type TreeOverviewRow = {
  tree_id: Uuid;
  code: string;
  status: TreeStatus;
  planted_at: string | null;
  last_updated_at: string | null;
  guardian_id: Uuid | null;
  species_name: string | null;
  species_key: string | null;
  municipality_name: string | null;
  village_name: string | null;
  tracking_status: TrackingStatus;
  follow_up_total: number | null;
  on_time_total: number | null;
};

type PublicUserRow = { id: Uuid; full_name: string };

type ViewportRow = { tree_id: Uuid; lng: number | null; lat: number | null };

type LogEntryRow = {
  tree_id: Uuid;
  cycle: number;
  captured_at: string;
  height_cm: number | null;
  visible_branches: number | null;
  health_status: string;
  on_time: boolean;
};

type OverviewStatsRow = {
  planted_total: number | null;
  alive_total: number | null;
  dead_total: number | null;
  survival_rate: number | null;
  on_time_rate: number | null;
  overdue_total: number | null;
};

type MunicipalityStatsRow = OverviewStatsRow & { municipality_name: string | null };

type VillageStatsRow = OverviewStatsRow & {
  village_name: string | null;
  municipality_name: string | null;
};

type SpeciesStatsRow = {
  species_name: string | null;
  species_key: string | null;
  planted_total: number | null;
  alive_total: number | null;
  dead_total: number | null;
  survival_rate: number | null;
  on_time_rate: number | null;
};

/** A field, escaped so a separator or a quote inside it cannot break the row. */
function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';

  const text = typeof value === 'boolean' ? (value ? 'sí' : 'no') : String(value);

  if (text.includes(SEPARATOR) || text.includes('"') || /[\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function toCsv(rows: (string | number | boolean | null)[][]): string {
  // CRLF, which is what every spreadsheet on Windows expects to find.
  return BOM + rows.map((row) => row.map(cell).join(SEPARATOR)).join('\r\n') + '\r\n';
}

/**
 * Reads a whole table, page by page.
 *
 * The API caps a single response at a fixed number of rows, so a project with
 * more trees than that would silently export a prefix of itself. Paging until a
 * short page arrives is what makes the file complete.
 */
async function fetchAll<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
  orderBy: string,
  /**
   * Set on a table the coordinator can see the archived rows of. Nothing that
   * was archived belongs in a report: the figures published to the Secretaría
   * have to match the ones the panel shows.
   */
  excludeArchived = false,
): Promise<T[] | null> {
  const rows: T[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * PAGE_SIZE;

    const query = client.from(table).select(columns).order(orderBy);

    if (excludeArchived) query.is('archived_at', null);

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error || !data) return null;

    rows.push(...(data as T[]));

    if (data.length < PAGE_SIZE) return rows;
  }
}

/** Names of the guardians, from the view that has no email column. */
async function guardianNames(client: SupabaseClient): Promise<Map<Uuid, string> | null> {
  const rows = await fetchAll<PublicUserRow>(client, 'public_users', 'id, full_name', 'full_name');

  if (!rows) return null;

  return new Map(rows.map((row) => [row.id, row.full_name]));
}

/** Coordinates by tree, as far as the map function will report them. */
async function treeCoordinates(
  client: SupabaseClient,
): Promise<Map<Uuid, { lat: number | null; lng: number | null }>> {
  const { data, error } = await client.rpc('trees_in_viewport', {
    min_lng: -180,
    min_lat: -90,
    max_lng: 180,
    max_lat: 90,
    zoom: 18,
  });

  if (error || !data) return new Map();

  const rows = data as ViewportRow[];

  return new Map(
    rows.slice(0, VIEWPORT_CEILING).map((row) => [row.tree_id, { lat: row.lat, lng: row.lng }]),
  );
}

async function buildInventory(client: SupabaseClient): Promise<ReportFile | null> {
  const trees = await fetchAll<TreeOverviewRow>(
    client,
    'tree_overview',
    'tree_id, code, status, planted_at, last_updated_at, guardian_id, species_name, species_key, municipality_name, village_name, tracking_status, follow_up_total, on_time_total',
    'code',
  );

  if (!trees) return null;

  const names = await guardianNames(client);
  if (!names) return null;

  const coordinates = await treeCoordinates(client);

  const rows: (string | number | boolean | null)[][] = [
    [
      'codigo',
      'especie',
      'clave_normalizada',
      'estado',
      'seguimiento',
      'municipio',
      'vereda',
      'latitud',
      'longitud',
      'fecha_siembra',
      'ultima_actualizacion',
      'guardian',
      'entradas_seguimiento',
      'entradas_a_tiempo',
    ],
  ];

  for (const tree of trees) {
    const point = coordinates.get(tree.tree_id);

    rows.push([
      tree.code,
      tree.species_name,
      tree.species_key,
      tree.status,
      tree.tracking_status,
      tree.municipality_name,
      tree.village_name,
      point?.lat ?? null,
      point?.lng ?? null,
      tree.planted_at,
      tree.last_updated_at,
      tree.guardian_id ? (names.get(tree.guardian_id) ?? null) : null,
      tree.follow_up_total ?? 0,
      tree.on_time_total ?? 0,
    ]);
  }

  return { fileName: `inventario-arboles-${fileStamp()}.csv`, csv: toCsv(rows) };
}

async function buildLogbook(client: SupabaseClient): Promise<ReportFile | null> {
  const trees = await fetchAll<TreeOverviewRow>(
    client,
    'tree_overview',
    'tree_id, code, species_name, species_key, status, planted_at, last_updated_at, guardian_id, municipality_name, village_name, tracking_status, follow_up_total, on_time_total',
    'code',
  );

  if (!trees) return null;

  const entries = await fetchAll<LogEntryRow>(
    client,
    'log_entries',
    'tree_id, cycle, captured_at, height_cm, visible_branches, health_status, on_time',
    'captured_at',
    true,
  );

  if (!entries) return null;

  const byTree = new Map(trees.map((tree) => [tree.tree_id, tree]));

  const rows: (string | number | boolean | null)[][] = [
    [
      'vereda',
      'municipio',
      'codigo_arbol',
      'especie',
      'ciclo',
      'fecha_captura',
      'altura_cm',
      'ramas_visibles',
      'salud',
      'a_tiempo',
    ],
  ];

  // Grouped by village, which is the level the guardians recognise and the one
  // the report is read at. Archived entries never arrive: they are filtered by
  // the query, and by the row level policy underneath it.
  const grouped = entries
    .filter((entry) => byTree.has(entry.tree_id))
    .sort((left, right) => {
      const leftTree = byTree.get(left.tree_id);
      const rightTree = byTree.get(right.tree_id);
      const byVillage = (leftTree?.village_name ?? '').localeCompare(
        rightTree?.village_name ?? '',
        'es-CO',
      );

      if (byVillage !== 0) return byVillage;

      const byCode = (leftTree?.code ?? '').localeCompare(rightTree?.code ?? '', 'es-CO');

      return byCode !== 0 ? byCode : left.cycle - right.cycle;
    });

  for (const entry of grouped) {
    const tree = byTree.get(entry.tree_id);

    rows.push([
      tree?.village_name ?? null,
      tree?.municipality_name ?? null,
      tree?.code ?? null,
      tree?.species_name ?? null,
      entry.cycle,
      entry.captured_at,
      entry.height_cm,
      entry.visible_branches,
      entry.health_status,
      entry.on_time,
    ]);
  }

  return { fileName: `bitacoras-por-vereda-${fileStamp()}.csv`, csv: toCsv(rows) };
}

async function buildIndicators(client: SupabaseClient): Promise<ReportFile | null> {
  const [overall, municipalities, villages, species] = await Promise.all([
    client
      .from('statistics_overview')
      .select('planted_total, alive_total, dead_total, survival_rate, on_time_rate, overdue_total')
      .maybeSingle(),
    client
      .from('statistics_by_municipality')
      .select(
        'municipality_name, planted_total, alive_total, dead_total, survival_rate, on_time_rate, overdue_total',
      )
      .order('municipality_name'),
    client
      .from('statistics_by_village')
      .select(
        'village_name, municipality_name, planted_total, alive_total, dead_total, survival_rate, on_time_rate, overdue_total',
      )
      .order('village_name'),
    client
      .from('statistics_by_species')
      .select(
        'species_name, species_key, planted_total, alive_total, dead_total, survival_rate, on_time_rate',
      )
      .order('planted_total', { ascending: false }),
  ]);

  if (overall.error || municipalities.error || villages.error || species.error) return null;

  const rows: (string | number | boolean | null)[][] = [
    [
      'nivel',
      'nombre',
      'municipio',
      'sembrados',
      'vivos',
      'muertos',
      'supervivencia_pct',
      'puntualidad_pct',
      'vencidos',
    ],
  ];

  const totals = overall.data as OverviewStatsRow | null;

  if (totals) {
    rows.push([
      'Total',
      'Proyecto',
      null,
      totals.planted_total,
      totals.alive_total,
      totals.dead_total,
      totals.survival_rate,
      totals.on_time_rate,
      totals.overdue_total,
    ]);
  }

  for (const row of (municipalities.data ?? []) as MunicipalityStatsRow[]) {
    rows.push([
      'Municipio',
      row.municipality_name,
      null,
      row.planted_total,
      row.alive_total,
      row.dead_total,
      row.survival_rate,
      row.on_time_rate,
      row.overdue_total,
    ]);
  }

  for (const row of (villages.data ?? []) as VillageStatsRow[]) {
    rows.push([
      'Vereda',
      row.village_name,
      row.municipality_name,
      row.planted_total,
      row.alive_total,
      row.dead_total,
      row.survival_rate,
      row.on_time_rate,
      row.overdue_total,
    ]);
  }

  for (const row of (species.data ?? []) as SpeciesStatsRow[]) {
    rows.push([
      'Especie',
      row.species_name,
      null,
      row.planted_total,
      row.alive_total,
      row.dead_total,
      row.survival_rate,
      row.on_time_rate,
      // Punctuality is reported per species; "vencidos" is not, so the cell is
      // left empty instead of being filled with a zero that means nothing.
      null,
    ]);
  }

  return { fileName: `indicadores-prae-${fileStamp()}.csv`, csv: toCsv(rows) };
}

/** The report the route asked for, or `null` when a query failed. */
export async function buildReport(report: ReportId): Promise<ReportFile | null> {
  const client = await createClient();

  if (report === 'inventory') return buildInventory(client);
  if (report === 'logbook') return buildLogbook(client);
  return buildIndicators(client);
}

/** What each report is called, for the download link's accessible name. */
export const reportNames: Record<ReportId, string> = {
  inventory: texts.export.inventoryTitle,
  logbook: texts.export.logbookTitle,
  indicators: texts.export.indicatorsTitle,
};
