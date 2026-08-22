import 'server-only';

import { cache } from 'react';

import type { MunicipalityStatistics, StatisticsTotals } from '@arbolapp/core';

import { createClient } from '@/lib/supabase/server';

/**
 * Everything the dashboard reads, and nothing it does not.
 *
 * The four aggregate views already exist in the database and each one answers
 * exactly one block of D2, so this file is a mapping layer and not a place
 * where figures get computed a second time: a number the panel derives by hand
 * is a number that can disagree with the same number in an export.
 *
 * ## What the canvas asks for and the database cannot answer
 *
 * Three figures on the canvas have no source, and none of them is invented
 * here:
 *
 * - "+28 este mes" under SEMBRADOS needs a time series. Every statistics view
 *   is a snapshot of the current state; nothing records how many trees existed
 *   a month ago.
 * - "17 archivados" under VIVOS needs a count of archived trees, and
 *   `tree_overview` -- the single table all four views aggregate -- filters
 *   `archived_at is null` before anything is counted. The archived rows are
 *   simply not in scope.
 * - The "2026" filter needs an aggregate by year. No view takes a date range.
 *
 * Adding any of them is a schema change, which goes by versioned migration and
 * is not interface work. The screen omits them.
 */

/**
 * The outcome of one block's query.
 *
 * A failure is modelled rather than thrown so each card can fall back on its
 * own: a village chart that cannot load must not take the four headline
 * figures down with it. `ok: false` is never rendered as zero -- silent failure
 * is what this shape exists to prevent.
 */
export type StatisticsResult<T> = { ok: true; data: T } | { ok: false };

/**
 * The headline figures, whatever scope they were asked for.
 *
 * `replantedTotal` is nullable because `statistics_by_municipality` does not
 * report it: only the project wide view counts replanted trees. Null means "not
 * reported at this scope", never zero.
 */
export type DashboardOverview = StatisticsTotals & {
  replantedTotal: number | null;
};

/** One bar of the per village chart. */
export type VillageCount = {
  villageId: string | null;
  villageName: string | null;
  plantedTotal: number;
};

/** One row of the per species list, counted over the normalized key. */
export type SpeciesCount = {
  speciesId: string;
  speciesName: string;
  plantedTotal: number;
};

/** The municipalities the filter offers, in the order it lists them. */
export type MunicipalityOption = Pick<
  MunicipalityStatistics,
  'municipalityId' | 'municipalityName'
>;

/**
 * PostgREST hands back parsed JSON with no schema attached, so every column is
 * narrowed here instead of being asserted into shape. `any` is forbidden and an
 * assertion would only move the lie somewhere harder to see.
 */
function asRow(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** A rate the view leaves null while its denominator is still zero. */
function readRate(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readTotals(row: Record<string, unknown>): StatisticsTotals {
  return {
    plantedTotal: readCount(row.planted_total),
    aliveTotal: readCount(row.alive_total),
    deadTotal: readCount(row.dead_total),
    survivalRate: readRate(row.survival_rate),
    onTimeRate: readRate(row.on_time_rate),
    overdueTotal: readCount(row.overdue_total),
  };
}

/**
 * The four indicator cards, for the whole project or for one municipality.
 *
 * Two different views back this, because the database has no parameterised
 * one: `statistics_overview` aggregates everything, and
 * `statistics_by_municipality` is the same arithmetic grouped one level down.
 * Reading the grouped view for a single municipality gives figures that are
 * consistent with the unfiltered ones by construction.
 */
export const getOverview = cache(
  async (municipalityId?: string): Promise<StatisticsResult<DashboardOverview>> => {
    const supabase = await createClient();

    if (municipalityId) {
      const { data, error } = await supabase
        .from('statistics_by_municipality')
        .select(
          'planted_total, alive_total, dead_total, survival_rate, on_time_rate, overdue_total',
        )
        .eq('municipality_id', municipalityId)
        .maybeSingle();

      if (error) return { ok: false };

      // No row means the municipality has no active trees, which is a real
      // answer of zero and not a failure.
      const row = asRow(data);
      return { ok: true, data: { ...readTotals(row), replantedTotal: null } };
    }

    const { data, error } = await supabase
      .from('statistics_overview')
      .select(
        'planted_total, alive_total, dead_total, replanted_total, survival_rate, on_time_rate, overdue_total',
      )
      .maybeSingle();

    if (error || data === null) return { ok: false };

    const row = asRow(data);
    return {
      ok: true,
      data: { ...readTotals(row), replantedTotal: readCount(row.replanted_total) },
    };
  },
);

/**
 * Trees planted per village, largest first.
 *
 * Ordered and limited in the database rather than in the component: the chart
 * shows a handful of bars, and pulling every village to sort five of them in
 * JavaScript is the habit that makes a page slow once the project grows past
 * one municipality.
 */
export const getVillageCounts = cache(
  async (municipalityId?: string): Promise<StatisticsResult<VillageCount[]>> => {
    const supabase = await createClient();

    const query = supabase
      .from('statistics_by_village')
      .select('village_id, village_name, planted_total')
      .order('planted_total', { ascending: false });

    const { data, error } = await (municipalityId
      ? query.eq('municipality_id', municipalityId)
      : query);

    if (error || !Array.isArray(data)) return { ok: false };

    return {
      ok: true,
      data: data.map((entry) => {
        const row = asRow(entry);
        return {
          villageId: readText(row.village_id),
          villageName: readText(row.village_name),
          plantedTotal: readCount(row.planted_total),
        };
      }),
    };
  },
);

/**
 * Trees per species, largest first.
 *
 * `statistics_by_species` groups by the normalized key, which is the domain
 * rule: mandarino, Mandarina and MANDARINOS are one line here, and the raw text
 * each guardian typed stays untouched on their tree.
 *
 * It has no municipality column, so this figure is always project wide. The
 * screen says so when a municipality filter is active rather than letting the
 * card look filtered when it is not.
 */
export const getSpeciesCounts = cache(async (): Promise<StatisticsResult<SpeciesCount[]>> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('statistics_by_species')
    .select('species_id, species_name, planted_total')
    .order('planted_total', { ascending: false });

  if (error || !Array.isArray(data)) return { ok: false };

  return {
    ok: true,
    data: data.flatMap((entry) => {
      const row = asRow(entry);
      const speciesId = readText(row.species_id);
      const speciesName = readText(row.species_name);
      if (speciesId === null || speciesName === null) return [];
      return [{ speciesId, speciesName, plantedTotal: readCount(row.planted_total) }];
    }),
  };
});

/**
 * The municipalities that have at least one active tree.
 *
 * Taken from the statistics view and not from the zone table on purpose: a
 * municipality with nothing planted in it would filter the whole dashboard down
 * to zero, which reads like a broken screen rather than an empty one.
 */
export const getMunicipalityOptions = cache(
  async (): Promise<StatisticsResult<MunicipalityOption[]>> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('statistics_by_municipality')
      .select('municipality_id, municipality_name')
      .order('municipality_name', { ascending: true });

    if (error || !Array.isArray(data)) return { ok: false };

    return {
      ok: true,
      data: data.flatMap((entry) => {
        const row = asRow(entry);
        const municipalityId = readText(row.municipality_id);
        const municipalityName = readText(row.municipality_name);
        if (municipalityId === null || municipalityName === null) return [];
        return [{ municipalityId, municipalityName }];
      }),
    };
  },
);
