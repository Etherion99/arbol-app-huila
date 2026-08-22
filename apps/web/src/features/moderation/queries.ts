import 'server-only';

import { cache } from 'react';

import type { Uuid } from '@arbolapp/core';

import { createClient } from '@/lib/supabase/server';

/**
 * How many trees need the coordinator's attention, for the sidebar badge.
 *
 * ## What this counts, and what the design asks for
 *
 * The canvas shows "Moderación · 4 marcados" over cards reading "GPS difiere
 * 240 m de la foto", "duplicado a <3 m" and "sin bitácora hace 5 meses". Two of
 * those three do not exist in the database: nothing compares a declared
 * coordinate against photo EXIF, and nothing detects two trees planted within
 * three metres of each other. There is no flag column and no moderation queue
 * table, and adding one is a schema change, which goes by versioned migration
 * and is not interface work.
 *
 * So this counts what the database can actually answer: trees whose tracking
 * status is `overdue`, which is the third card's case and the only one with a
 * real signal behind it. `statistics_overview.overdue_total` is the same figure
 * the dashboard's punctuality card reads, so the badge and the tablero cannot
 * disagree.
 *
 * Returns `undefined` when the query fails. The sidebar renders no badge at
 * all in that case, because a badge showing 0 would tell the coordinator there
 * is nothing to review, which is a different claim from not knowing.
 */
export const getModerationCount = cache(async (): Promise<number | undefined> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('statistics_overview')
    .select('overdue_total')
    .maybeSingle();

  if (error || !data) return undefined;

  return data.overdue_total ?? undefined;
});

/** One card in the D4 grid. */
export type FlaggedTree = {
  treeId: Uuid;
  /** The tag code, HUI-LP-0042, which is how a tree is named out loud. */
  code: string;
  speciesName: string;
  villageName: string | null;
  /** Whole months since the last log entry, the figure the card states. */
  monthsSinceLastEntry: number;
  guardianName: string | null;
};

export type FlaggedTreesResult = { trees: FlaggedTree[]; total: number } | { error: true };

/**
 * How many cards the grid draws at once. The count in the title is the real
 * total; this only bounds what is rendered, because a coordinator works through
 * the oldest cases first and a grid of several hundred would cost far more than
 * it helps.
 */
const FLAGGED_LIMIT = 60;

/** Whole months between two instants, floored, never below zero. */
function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) -
    (to.getDate() < from.getDate() ? 1 : 0);

  return Math.max(0, months);
}

function isPresent(value: string | null): value is string {
  return value !== null;
}

/**
 * Names for a handful of guardians, in one request rather than one per card.
 *
 * Read from `public_users` and not `user_directory`. This screen has no
 * business with an email -- D3 is the one surface that shows one -- and asking
 * the view that cannot return it is what keeps that true however this file is
 * edited later.
 *
 * A failure here loses only the name: the card still says which tree it is and
 * still archives, so it is not worth failing the whole screen over.
 */
async function readGuardianNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data } = await supabase
    .from('public_users')
    .select('id, full_name')
    .in('id', [...ids]);

  const rows = (data ?? []) as { id: string; full_name: string }[];

  return new Map(rows.map((row) => [row.id, row.full_name]));
}

/**
 * The trees the coordinator has to look at, longest neglected first.
 *
 * Same criterion as `getModerationCount` above, and deliberately so: the number
 * in the sidebar badge and the number over this grid come from one definition
 * of "marcado", so they cannot tell the coordinator two different things.
 */
export const getFlaggedTrees = cache(async (): Promise<FlaggedTreesResult> => {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from('tree_overview')
    .select('tree_id, code, species_name, village_name, last_updated_at, guardian_id', {
      count: 'exact',
    })
    .eq('tracking_status', 'overdue')
    .order('last_updated_at', { ascending: true })
    .limit(FLAGGED_LIMIT);

  if (error || !data) return { error: true };

  const rows = data as {
    tree_id: string;
    code: string;
    species_name: string;
    village_name: string | null;
    last_updated_at: string;
    guardian_id: string | null;
  }[];

  const guardianIds = [...new Set(rows.map((row) => row.guardian_id).filter(isPresent))];
  const guardianNames = await readGuardianNames(supabase, guardianIds);

  const now = new Date();

  return {
    total: count ?? rows.length,
    trees: rows.map((row) => ({
      treeId: row.tree_id,
      code: row.code,
      speciesName: row.species_name,
      villageName: row.village_name,
      monthsSinceLastEntry: monthsBetween(new Date(row.last_updated_at), now),
      guardianName: row.guardian_id ? (guardianNames.get(row.guardian_id) ?? null) : null,
    })),
  };
});
