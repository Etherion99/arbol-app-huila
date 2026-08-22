'use server';

import { revalidatePath } from 'next/cache';

import type { Uuid } from '@arbolapp/core';

import { texts } from '@/constants/texts';
import { routes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

/**
 * The merge and its undo, as the screen calls them.
 *
 * Neither reimplements anything: `merge_species()` and `revert_species_merge()`
 * already exist in the database, they relabel the trees and write the audit
 * row in one transaction, and they check the caller's role themselves. That
 * check is what makes these Server Actions safe to expose -- an action is a
 * public endpoint, and a guardian who called this one by hand would get 42501
 * from Postgres, not a merge.
 *
 * Errors come back as a sentence rather than thrown. An exception crossing the
 * server boundary arrives as an opaque digest with the reason stripped, and the
 * coordinator would be left with a screen that simply stopped.
 */

export type MergeResult =
  | { ok: true; mergeIds: Uuid[]; variantCount: number }
  | { ok: false; error: string };

export type RevertResult = { ok: true } | { ok: false; error: string };

/** Postgres' "insufficient privilege", raised by both functions for a guardian. */
const INSUFFICIENT_PRIVILEGE = '42501';

function messageFor(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === INSUFFICIENT_PRIVILEGE) return texts.species.errors.notCoordinator;
  return fallback;
}

export async function mergeSpecies(input: {
  sourceIds: Uuid[];
  targetId: Uuid;
  /** The surviving name when it is none of the merged ones. */
  newCanonicalName: string | null;
}): Promise<MergeResult> {
  const sourceIds = input.sourceIds.filter((id) => id !== input.targetId);

  if (sourceIds.length === 0) return { ok: false, error: texts.species.errors.selectTwo };

  const newName = input.newCanonicalName?.trim() ?? '';

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('merge_species', {
    source_species_ids: sourceIds,
    target_species_id: input.targetId,
    new_canonical_name: newName === '' ? null : newName,
  });

  if (error) return { ok: false, error: messageFor(error, texts.species.errors.merge) };

  // One identifier per merge recorded, one per source. Keeping them is what
  // lets the screen offer an exact undo of what it just did.
  const mergeIds = Array.isArray(data) ? (data as Uuid[]) : [];

  revalidatePath(routes.species);

  return { ok: true, mergeIds, variantCount: sourceIds.length };
}

/**
 * Undoes the merges of one operation.
 *
 * Newest first, so the target's display name is restored by the last revert to
 * touch it -- every row of the same operation recorded the same previous name,
 * and unwinding in reverse order is the only sequence that cannot leave an
 * intermediate one behind.
 */
export async function revertSpeciesMerges(mergeIds: Uuid[]): Promise<RevertResult> {
  if (mergeIds.length === 0) return { ok: false, error: texts.species.errors.revert };

  const supabase = await createClient();

  for (const mergeId of [...mergeIds].reverse()) {
    const { error } = await supabase.rpc('revert_species_merge', { merge_id: mergeId });

    if (error) return { ok: false, error: messageFor(error, texts.species.errors.revert) };
  }

  revalidatePath(routes.species);

  return { ok: true };
}
