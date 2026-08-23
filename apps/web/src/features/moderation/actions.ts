'use server';

import { revalidatePath } from 'next/cache';

import { texts } from '@/constants/texts';
import { requireCoordinator } from '@/features/auth/session';
import { routes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

/** What the archive dialog gets back. A sentence, never a thrown error. */
export type ArchiveTreeState = {
  error: string | null;
  /** Set once the tree was archived, so the dialog can close itself. */
  done?: boolean;
};

/** The shortest motive that still explains anything to the guardian. */
const MIN_REASON_LENGTH = 10;

/**
 * Archives a tree.
 *
 * This is an `update` and it will never be a `delete`. Nothing in this project
 * is destroyed: the row stays, the growth log stays, the photographs stay, and
 * `archived_at` is what takes the tree off the active map and out of the
 * reminder sweep. A guardian who loses a tree this way can still be shown
 * everything they recorded, and the tree can be brought back or reassigned.
 *
 * `archive_reason` is mandatory here for the same reason it is mandatory in the
 * dialog: the guardian reads it. An archive with no explanation is how a
 * volunteer decides the project stopped trusting them and stops recording.
 *
 * The write is allowed by `trees_coordinator_all`, which lets a coordinator
 * update any tree. The gate is re-checked here rather than trusted from the
 * screen: a Server Action is a public endpoint, and the only thing standing
 * between it and the internet is what it verifies itself.
 */
export async function archiveTree(formData: FormData): Promise<ArchiveTreeState> {
  const coordinator = await requireCoordinator();

  const treeId = String(formData.get('treeId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (!treeId) return { error: texts.moderation.errors.unknown };
  if (!reason) return { error: texts.moderation.reasonRequired };
  if (reason.length < MIN_REASON_LENGTH) return { error: texts.moderation.reasonTooShort };

  const supabase = await createClient();

  const { error } = await supabase
    .from('trees')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: coordinator.userId,
      archive_reason: reason,
    })
    .eq('id', treeId)
    // Archiving something already archived would overwrite the first
    // coordinator's reason and date with a second one.
    .is('archived_at', null);

  if (error) {
    const denied =
      error.code === '42501' || error.message.toLowerCase().includes('row-level security');

    return { error: denied ? texts.moderation.errors.notAllowed : texts.moderation.errors.unknown };
  }

  // The sidebar badge and this grid both count overdue trees, so both have to
  // be rebuilt, and the badge lives in the panel layout.
  revalidatePath(routes.moderation);
  revalidatePath('/panel', 'layout');

  return { error: null, done: true };
}

/** What the review queue's two buttons get back. */
export type ResolveFlagState = { error: string | null; done?: boolean };

/**
 * Records what a coordinator decided about a flagged registration.
 *
 * Two outcomes, and neither of them removes anything. `confirmed` says the
 * signal was real; `dismissed` says the guardian was doing their job and the
 * GPS was not. The flag stays on the row either way, carrying who decided and
 * when, because a review queue that forgets its own decisions cannot be audited
 * and would ask the same question again on the next sweep.
 *
 * **Confirming does not archive the tree.** The two are different decisions --
 * "this reading is genuinely wrong" and "this tree should leave the map" -- and
 * folding them together would mean a coordinator clicking through a queue
 * silently retiring somebody's tree without writing the motive the guardian is
 * owed. The card puts the archive dialog next to this button, so the second
 * decision is available and is still a decision.
 *
 * The coordinator gate is re-checked here as well as inside the function: a
 * Server Action is a public endpoint, and the only thing between it and the
 * internet is what it verifies itself.
 */
export async function resolveRegistrationFlag(formData: FormData): Promise<ResolveFlagState> {
  await requireCoordinator();

  const flagId = String(formData.get('flagId') ?? '');
  const resolution = String(formData.get('resolution') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  if (!flagId) return { error: texts.moderation.errors.unknown };
  if (resolution !== 'confirmed' && resolution !== 'dismissed') {
    return { error: texts.moderation.errors.unknown };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc('resolve_registration_flag', {
    target_flag_id: flagId,
    in_resolution: resolution,
    in_note: note === '' ? null : note,
  });

  if (error) {
    const denied =
      error.code === '42501' || error.message.toLowerCase().includes('row-level security');

    return { error: denied ? texts.moderation.errors.notAllowed : texts.moderation.errors.unknown };
  }

  // The queue and the sidebar badge both count open flags, and the badge lives
  // in the panel layout.
  revalidatePath(routes.moderation);
  revalidatePath('/panel', 'layout');

  return { error: null, done: true };
}
