import type { Uuid } from '@arbolapp/core';

import { useGuardianTrees } from '@/features/trees/use-guardian-trees';
import { formatShortDate } from '@/lib/dates';

/**
 * When the next photograph of a tree is due, in the three shapes a screen can
 * actually draw: the date, the wait for it, and the failure to get it.
 *
 * `failed` carries its own retry rather than leaving the screen to find one,
 * because a date that quietly never arrives is the silent failure this app does
 * not allow itself.
 */
export type NextPhotoDate =
  | { state: 'loading' }
  | { state: 'ready'; date: string }
  | { state: 'failed'; retry: () => void };

/**
 * The next photograph date for one tree, read off the guardian's own list.
 *
 * `register_tree()` returns the identity of what it wrote — the id, the code
 * and the cycle — and not the reminder date, so the date has to be fetched. It
 * is fetched from `guardian_trees()` rather than from `tree_card()` on purpose:
 * registering already invalidates the guardian's list, so that refetch is in
 * flight whatever this screen does, and reading the date out of it costs no
 * extra round trip. `tree_card()` would add an RPC and a Storage signature for
 * a thumbnail this screen never shows, on the rural connection the guardian is
 * standing in.
 *
 * A tree missing from a settled list is reported as a failure and not as an
 * absence. The row was just written, so the only ways it is not there are a
 * list that failed or a list fetched before the write landed, and both are
 * things retrying can fix.
 */
export function useNextPhotoDate(treeId: Uuid): NextPhotoDate {
  const trees = useGuardianTrees();

  // Derived while rendering. Mirroring it into state through an effect would
  // add a render for a value the query already has.
  const tree = trees.data?.find((candidate) => candidate.treeId === treeId);

  if (tree !== undefined) {
    return { state: 'ready', date: formatShortDate(tree.nextReminderAt) };
  }

  if (trees.isPending || trees.isFetching) {
    return { state: 'loading' };
  }

  return { state: 'failed', retry: () => void trees.refetch() };
}
