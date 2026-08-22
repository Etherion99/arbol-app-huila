import 'server-only';

import { cache } from 'react';

import type { TrackingStatus, UserRole, Uuid } from '@arbolapp/core';

import { createClient } from '@/lib/supabase/server';

/** One row of the D3 table, already aggregated. */
export type DirectoryEntry = {
  id: Uuid;
  fullName: string;
  email: string;
  role: UserRole;
  /**
   * Free text school or organisation. It is the closest thing the schema has
   * to the "Egresada / Docente / Representante" the canvas prints in the ROL
   * column, and it is shown beside the real role rather than instead of it.
   */
  institution: string | null;
  /** Set when the account was deactivated, which is a soft delete and nothing else. */
  archivedAt: string | null;
  /** Non archived trees this person guards. `null` when the aggregate failed. */
  treeTotal: number | null;
  upToDateTotal: number | null;
  overdueTotal: number | null;
};

export type DirectoryResult =
  | {
      entries: DirectoryEntry[];
      /** How many of those are guardians, which is what the title counts. */
      guardianTotal: number;
      /**
       * False when the profiles loaded but the per guardian tree aggregate did
       * not. The table still renders the names and emails, and says so.
       */
      treeCountsAvailable: boolean;
    }
  | { error: true };

type TreeTally = { total: number; upToDate: number; overdue: number };

/**
 * PostgREST caps a response, so the tree tally is read in pages rather than in
 * one request that would silently stop at the cap and undercount every
 * guardian. The ceiling exists so a runaway loop cannot hold the render open.
 */
const TREE_PAGE_SIZE = 1000;
const TREE_PAGE_LIMIT = 40;

/**
 * Trees per guardian, tallied in memory.
 *
 * There is no aggregate view keyed by guardian: `tree_overview` is one row per
 * active tree, and grouping it is a schema change, which goes by versioned
 * migration and is not interface work. Two columns per active tree is a small
 * payload, and the tally is what turns them into the ÁRBOLES and AL DÍA
 * columns.
 *
 * Returns `null` when a page fails, so the caller can say the counts are
 * missing instead of printing a zero that would read as "this guardian has no
 * trees".
 */
async function tallyTreesByGuardian(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, TreeTally> | null> {
  const tally = new Map<string, TreeTally>();

  for (let page = 0; page < TREE_PAGE_LIMIT; page += 1) {
    const from = page * TREE_PAGE_SIZE;

    const { data, error } = await supabase
      .from('tree_overview')
      .select('guardian_id, tracking_status')
      .range(from, from + TREE_PAGE_SIZE - 1);

    if (error) return null;

    const rows = (data ?? []) as { guardian_id: string | null; tracking_status: TrackingStatus }[];

    for (const row of rows) {
      // A tree whose guardian left has no owner to count it against. It still
      // exists; it simply belongs to nobody on this screen.
      if (!row.guardian_id) continue;

      const current = tally.get(row.guardian_id) ?? { total: 0, upToDate: 0, overdue: 0 };

      current.total += 1;
      if (row.tracking_status === 'up_to_date') current.upToDate += 1;
      if (row.tracking_status === 'overdue') current.overdue += 1;

      tally.set(row.guardian_id, current);
    }

    if (rows.length < TREE_PAGE_SIZE) return tally;
  }

  return tally;
}

/**
 * The user directory behind D3.
 *
 * Reads `user_directory` and not `public_users`, because this is the one screen
 * in the product that shows an email, and that view is the only place the
 * column is reachable. It is restricted to coordinators in SQL, so the rule
 * survives even if this call were made from somewhere it should not be.
 */
export const getDirectory = cache(async (): Promise<DirectoryResult> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_directory')
    .select('id, full_name, email, role, institution, archived_at')
    .order('full_name', { ascending: true });

  if (error || !data) return { error: true };

  const profiles = data as {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    institution: string | null;
    archived_at: string | null;
  }[];

  const tally = await tallyTreesByGuardian(supabase);

  const entries: DirectoryEntry[] = profiles.map((profile) => {
    const counts = tally?.get(profile.id) ?? { total: 0, upToDate: 0, overdue: 0 };

    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
      institution: profile.institution,
      archivedAt: profile.archived_at,
      treeTotal: tally ? counts.total : null,
      upToDateTotal: tally ? counts.upToDate : null,
      overdueTotal: tally ? counts.overdue : null,
    };
  });

  return {
    entries,
    guardianTotal: entries.filter((entry) => entry.role === 'guardian').length,
    treeCountsAvailable: tally !== null,
  };
});
