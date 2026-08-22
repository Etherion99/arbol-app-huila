import 'server-only';

import { cache } from 'react';

import type { Uuid } from '@arbolapp/core';

import { createClient } from '@/lib/supabase/server';

/** One mergeable species: a normalized key, its display name and its trees. */
export type SpeciesVariant = {
  speciesId: Uuid;
  canonicalName: string;
  normalizedKey: string;
  treeCount: number;
};

/** A species exactly one tree carries, which is usually somebody's typo. */
export type SingleOccurrenceSpecies = {
  speciesId: Uuid;
  speciesName: string;
};

/**
 * What a query answered, or that it failed.
 *
 * A bare `null` cannot tell "no hay especies" apart from "no se pudo
 * preguntar", and on this panel that difference decides whether the coordinator
 * trusts the screen.
 */
export type Loaded<T> = { ok: true; value: T } | { ok: false };

/**
 * The rows PostgREST sends back, in the snake_case the database uses.
 *
 * They are written out because the Supabase client has no generated schema to
 * infer from, so without them every field access would be untyped.
 */
type SpeciesSuggestionRow = {
  species_id: Uuid;
  canonical_name: string;
  normalized_key: string;
  tree_count: number | string | null;
};

type SingleOccurrenceRow = {
  species_id: Uuid;
  species_name: string;
};

/**
 * Every species that can still take part in a merge.
 *
 * `species_suggestions` and not `statistics_by_species`: the suggestion
 * function already excludes the archived rows and the ones folded into another
 * species, which is precisely the set the coordinator may pick from, and it
 * counts the trees on the way. The statistics view would also drop any species
 * whose trees are all archived, hiding a name that still needs cleaning up.
 *
 * The empty search text asks for the whole list; the ceiling bounds the payload
 * rather than paging it. The catalogue is a few dozen names typed by the
 * guardians of one municipality, so a second page is not a case that exists.
 */
export const getSpeciesVariants = cache(async (): Promise<Loaded<SpeciesVariant[]>> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('species_suggestions', {
    search_text: '',
    max_results: 500,
  });

  if (error || !data) return { ok: false };

  const rows = data as SpeciesSuggestionRow[];

  return {
    ok: true,
    value: rows.map((row) => ({
      speciesId: row.species_id,
      canonicalName: row.canonical_name,
      normalizedKey: row.normalized_key,
      // `count()` is a bigint, and PostgREST may send one as a string.
      treeCount: Number(row.tree_count ?? 0),
    })),
  };
});

/** The shortlist behind the typo warning on D5. */
export const getSingleOccurrenceSpecies = cache(
  async (): Promise<Loaded<SingleOccurrenceSpecies[]>> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('species_with_single_occurrence')
      .select('species_id, species_name')
      .order('species_name');

    if (error || !data) return { ok: false };

    const rows = data as SingleOccurrenceRow[];

    return {
      ok: true,
      value: rows.map((row) => ({
        speciesId: row.species_id,
        speciesName: row.species_name,
      })),
    };
  },
);
