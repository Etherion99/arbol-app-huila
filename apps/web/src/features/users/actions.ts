'use server';

import { revalidatePath } from 'next/cache';

import { texts } from '@/constants/texts';
import { requireCoordinator } from '@/features/auth/session';
import { routes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

/** What the deactivation dialog gets back. A sentence, never a thrown error. */
export type UserStatusState = {
  error: string | null;
  /** Set once the update landed, so the dialog can close itself. */
  done?: boolean;
};

/** The shortest motive that still explains anything to a later reviewer. */
const MIN_REASON_LENGTH = 10;

/**
 * Deactivates an account.
 *
 * This is a soft delete and only a soft delete: `archived_at`, `archived_by`
 * and `archive_reason` are written and nothing is removed. The person's trees
 * and their growth log stay exactly where they are and can be reassigned. A
 * `delete` here would destroy a PRAE record that the project promised to keep.
 *
 * The reason is mandatory in the same breath as the archive marker, because the
 * schema constrains the two archive fields to travel together and because a
 * deactivation nobody can explain later is indistinguishable from a mistake.
 */
export async function deactivateUser(formData: FormData): Promise<UserStatusState> {
  const coordinator = await requireCoordinator();

  const userId = String(formData.get('userId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (!userId) return { error: texts.users.errors.unknown };
  // Row level security would happily allow this: a coordinator may update any
  // user row, including their own. What it would not do is give the panel back
  // afterwards, because the role gate reads `archived_at`.
  if (userId === coordinator.userId) return { error: texts.users.errors.cannotDeactivateSelf };
  if (!reason) return { error: texts.users.reasonRequired };
  if (reason.length < MIN_REASON_LENGTH) return { error: texts.users.reasonTooShort };

  const supabase = await createClient();

  const { error } = await supabase
    .from('users')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: coordinator.userId,
      archive_reason: reason,
    })
    .eq('id', userId);

  if (error) return { error: messageFor(error) };

  revalidatePath(routes.users);

  return { error: null, done: true };
}

/**
 * Puts a deactivated account back in service by clearing the archive marker.
 *
 * The three archive fields are cleared together because the table constrains
 * `archived_at` and `archived_by` to be null or set as a pair.
 */
export async function reactivateUser(formData: FormData): Promise<UserStatusState> {
  await requireCoordinator();

  const userId = String(formData.get('userId') ?? '');
  if (!userId) return { error: texts.users.errors.unknown };

  const supabase = await createClient();

  const { error } = await supabase
    .from('users')
    .update({ archived_at: null, archived_by: null, archive_reason: null })
    .eq('id', userId);

  if (error) return { error: messageFor(error) };

  revalidatePath(routes.users);

  return { error: null, done: true };
}

/**
 * Turns a PostgREST failure into one of our sentences. A row level security
 * refusal comes back as an empty result or a 42501, and either way the honest
 * thing to say is that the account may not do this -- not the English string
 * Supabase wrote for a developer.
 */
function messageFor(error: { code?: string; message: string }): string {
  if (error.code === '42501' || error.message.toLowerCase().includes('row-level security')) {
    return texts.users.errors.notAllowed;
  }
  return texts.users.errors.unknown;
}
