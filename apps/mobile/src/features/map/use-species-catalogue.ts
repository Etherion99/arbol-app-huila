import { useQuery } from '@tanstack/react-query';
import type { Uuid } from '@arbolapp/core';

import { supabase } from '@/lib/supabase/client';

export type SpeciesOption = {
  id: Uuid;
  canonicalName: string;
  treeCount: number;
};

type SpeciesRow = {
  id: string;
  canonical_name: string;
  trees: { count: number }[];
};

/**
 * The species the filter offers, ordered by how many trees carry each name.
 *
 * The filter matches on the identifier and never on the text. `mandarino` and
 * `mandarinos` are two different species until a coordinator decides otherwise
 * -- the normalisation deliberately leaves plurals alone -- so filtering by a
 * string would silently fold two rows of the catalogue into one and report a
 * count that matches no query anyone could repeat.
 *
 * Species that have been merged away are left out: they still exist so old
 * links resolve, but they carry no trees and would be dead options.
 */
export function useSpeciesCatalogue() {
  return useQuery({
    queryKey: ['species-catalogue'],
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<SpeciesOption[]> => {
      const { data, error } = await supabase
        .from('species')
        .select('id, canonical_name, trees(count)')
        .is('archived_at', null)
        .is('merged_into_id', null)
        // Filters the embedded count, not the species: an archived tree must
        // not be counted here any more than it is drawn on the map.
        .is('trees.archived_at', null)
        .order('canonical_name')
        .abortSignal(signal);

      if (error !== null) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as SpeciesRow[];

      return rows
        .map<SpeciesOption>((row) => ({
          id: row.id,
          canonicalName: row.canonical_name,
          treeCount: row.trees[0]?.count ?? 0,
        }))
        .sort(
          (a, b) => b.treeCount - a.treeCount || a.canonicalName.localeCompare(b.canonicalName),
        );
    },
  });
}
