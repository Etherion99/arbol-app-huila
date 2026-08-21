import { useQuery } from '@tanstack/react-query';
import type { SpeciesSuggestion } from '@arbolapp/core';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { supabase } from '@/lib/supabase/client';

/** How long typing has to settle before the catalogue is asked. */
const TYPING_DEBOUNCE_MS = 250;

/** How many suggestions the list shows. The canvas draws three; ten fits a scroll. */
const MAX_SUGGESTIONS = 10;

type SuggestionRow = {
  species_id: string;
  canonical_name: string;
  normalized_key: string;
  tree_count: number;
};

/**
 * The autocomplete behind the free text species field.
 *
 * This is the whole convergence mechanism of the species catalogue, and it works
 * by suggesting rather than correcting. Nothing the guardian types is ever
 * rewritten: `species_suggestions()` offers what other people have already
 * written, ordered by how many trees carry each name, most people pick one, and
 * the catalogue converges on its own. Whatever does not is merged later by the
 * coordinator, by hand, because deciding that `mandarino` and `mandarina` are
 * one species is a judgement about the real world and not a string rule.
 *
 * The query is debounced because every keystroke would otherwise be a round trip
 * on a connection that barely holds.
 */
export function useSpeciesSuggestions(searchText: string) {
  const settled = useDebouncedValue(searchText.trim(), TYPING_DEBOUNCE_MS);

  const query = useQuery({
    queryKey: ['species-suggestions', settled],
    // Names arrive as guardians register trees, so a list a minute old is fine
    // and coming back to the step twice is not two round trips.
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<SpeciesSuggestion[]> => {
      const { data, error } = await supabase
        .rpc('species_suggestions', { search_text: settled, max_results: MAX_SUGGESTIONS })
        .abortSignal(signal);

      if (error !== null) {
        throw new Error(error.message);
      }

      return ((data ?? []) as SuggestionRow[]).map((row) => ({
        speciesId: row.species_id,
        canonicalName: row.canonical_name,
        normalizedKey: row.normalized_key,
        treeCount: row.tree_count,
      }));
    },
  });

  return {
    suggestions: query.data ?? [],
    /**
     * The settled text, not the live one. The list on screen answers the query
     * that produced it, so "nadie ha escrito ese nombre" cannot appear against a
     * word the guardian is still halfway through typing.
     */
    settledText: settled,
    isSettling: settled !== searchText.trim(),
    isLoading: query.isPending,
    error: query.error,
  };
}
