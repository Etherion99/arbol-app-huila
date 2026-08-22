'use server';

import { revalidatePath } from 'next/cache';

import type { Uuid } from '@arbolapp/core';

import { texts } from '@/constants/texts';
import { routes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

export type ReassignResult = { ok: true } | { ok: false; error: string };

/**
 * Hands a tree to another guardian.
 *
 * Only `guardian_id` moves. The canvas promises that "el ciclo se reinicia
 * desde hoy", which would mean writing `last_updated_at`; that column is the
 * capture time of the newest growth log entry, so moving it would invent a
 * measurement nobody took and push the punctuality rate up. The screen says
 * what this does instead of promising what it does not.
 *
 * The gate is `trees_coordinator_all`, the row level policy: this action is a
 * public endpoint like any other, and a guardian calling it by hand updates
 * nothing, because their token matches no row of somebody else's tree.
 * `.select('id')` is what turns that silent no-op into a visible failure --
 * without it a refused update returns success with no rows.
 */
export async function reassignGuardian(input: {
  treeId: Uuid;
  guardianId: Uuid;
}): Promise<ReassignResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trees')
    .update({ guardian_id: input.guardianId })
    .eq('id', input.treeId)
    .is('archived_at', null)
    .select('id');

  if (error) return { ok: false, error: texts.treeDetail.errors.reassign };

  const updated = (data ?? []) as { id: Uuid }[];

  if (updated.length === 0) return { ok: false, error: texts.treeDetail.errors.notCoordinator };

  revalidatePath(routes.tree(input.treeId));
  revalidatePath(routes.moderation);

  return { ok: true };
}
