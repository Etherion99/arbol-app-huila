import 'server-only';

import { cache } from 'react';

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
