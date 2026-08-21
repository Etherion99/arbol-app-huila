import { useQuery } from '@tanstack/react-query';
import type { Uuid } from '@arbolapp/core';

import { supabase } from '@/lib/supabase/client';

/** A tree the guardian can jump to straight from the search box. */
export type TreeSearchResult = {
  treeId: Uuid;
  code: string;
  speciesName: string;
  lng: number;
  lat: number;
};

type SearchRow = {
  id: string;
  code: string;
  species_raw_text: string;
  location: unknown;
  species: { canonical_name: string } | null;
};

/** Shortest text worth a round trip. Two characters match most of the project. */
const MIN_QUERY_LENGTH = 3;

/**
 * Escapes what Postgres reads as a wildcard.
 *
 * A guardian typing `%` into the search box means a per cent sign, not "match
 * anything". Passing it through would turn a narrow lookup into a full scan and
 * return results that have nothing to do with what they typed.
 */
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function readPoint(raw: unknown): { lng: number; lat: number } | null {
  if (typeof raw !== 'object' || raw === null || !('coordinates' in raw)) {
    return null;
  }

  const { coordinates } = raw as { coordinates: unknown };

  if (!Array.isArray(coordinates)) {
    return null;
  }

  const [lng, lat] = coordinates;

  return typeof lng === 'number' && typeof lat === 'number' ? { lng, lat } : null;
}

/**
 * Trees whose code contains what was typed.
 *
 * Only the code is matched, not the species: species already has its own filter
 * that works by identifier, and matching free text here would quietly re-create
 * the text based grouping the project has decided against -- `mandarino` and
 * `mandarinos` are different species until a coordinator says otherwise.
 *
 * Archived trees are excluded, the same as everywhere else a client asks about
 * trees, so a code that no longer exists publicly simply returns nothing.
 */
export function useTreeSearch(query: string) {
  const trimmed = query.trim();
  const isSearchable = trimmed.length >= MIN_QUERY_LENGTH;

  return useQuery({
    queryKey: ['tree-search', trimmed],
    enabled: isSearchable,
    staleTime: 30_000,
    queryFn: async ({ signal }): Promise<TreeSearchResult[]> => {
      const { data, error } = await supabase
        .from('trees')
        .select('id, code, species_raw_text, location, species(canonical_name)')
        .is('archived_at', null)
        .ilike('code', `%${escapeLikePattern(trimmed)}%`)
        .order('code')
        .limit(10)
        .abortSignal(signal);

      if (error !== null) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as unknown as SearchRow[];
      const results: TreeSearchResult[] = [];

      for (const row of rows) {
        const point = readPoint(row.location);

        // A tree with no readable coordinate cannot be flown to, and offering a
        // result that does nothing when pressed is worse than one result fewer.
        if (point === null) {
          continue;
        }

        results.push({
          treeId: row.id,
          code: row.code,
          speciesName: row.species?.canonical_name ?? row.species_raw_text,
          lng: point.lng,
          lat: point.lat,
        });
      }

      return results;
    },
  });
}
