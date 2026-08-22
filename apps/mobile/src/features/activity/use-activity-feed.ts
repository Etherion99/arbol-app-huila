import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IsoDateTime, TrackingStatus, Uuid } from '@arbolapp/core';

import { useGuardianTrees, type GuardianTree } from '@/features/trees/use-guardian-trees';
import { supabase } from '@/lib/supabase/client';

/** A cycle a tree is still waiting for. */
export type PendingActivity = {
  treeId: Uuid;
  speciesName: string;
  villageName: string | null;
  /** The cycle the row names, which the canvas takes from the newest one recorded. */
  cycle: number;
  /** When the photograph was due. What the relative date is measured against. */
  dueAt: IsoDateTime;
  trackingStatus: TrackingStatus;
};

/** A cycle already closed, as the "Anteriores" section lists it. */
export type ResolvedActivity = {
  entryId: Uuid;
  treeId: Uuid;
  speciesName: string;
  cycle: number;
  capturedAt: IsoDateTime;
  /** Decided by a database trigger from `captured_at`, never by this client. */
  onTime: boolean;
};

type LogEntryRow = {
  id: string;
  tree_id: string;
  cycle: number;
  captured_at: string;
  on_time: boolean;
};

/**
 * How far back the closed cycles go. Six entries a year per tree, so this is
 * comfortably more than a season for a guardian with a handful of trees, and it
 * keeps a single screen from pulling somebody's whole history down a vereda
 * connection.
 */
const HISTORY_LIMIT = 40;

export const activityHistoryQueryKey = (treeIds: readonly string[]) =>
  ['activity-history', ...treeIds] as const;

/**
 * Everything the activity tab draws, from the two sources that actually exist.
 *
 * ## Where each half comes from
 *
 * "Pendientes" is derived from `guardian_trees()` and nothing else. The tracking
 * status is computed in the database from `next_reminder_at`, so a tree that is
 * overdue here is the same tree that is overdue on the map and in the list;
 * recomputing it on the client is how those three surfaces start disagreeing
 * about one tree.
 *
 * "Anteriores" reads the growth log itself rather than `reminders`. Both tables
 * are readable by their guardian, but only one of them has rows: `reminders` is
 * written by the notification cron, which is not built yet, so a feed built on
 * it would be permanently empty. The growth log is written every time a
 * guardian closes a cycle, and it carries the two things the row needs that a
 * reminder does not have -- the cycle's `on_time` verdict and its capture date.
 *
 * ## What is missing on purpose
 *
 * The canvas also puts the coordinator's notices in "Anteriores" -- an archived
 * tree with its reason. There is no source for that row. `trees_select_active`
 * hides an archived tree from everyone but a coordinator, and `guardian_trees()`
 * filters `archived_at is null` on top of that, so the guardian can no longer
 * read either the tree or its `archive_reason`. It would take a notices table,
 * or a policy that lets a guardian see their own archived trees, and inventing
 * either here would put a row on screen that no query can ever fill.
 */
export function useActivityFeed() {
  const trees = useGuardianTrees();

  // Derived during render. The list is already ordered by what falls due first,
  // which is the order the pending section reads in.
  const pending = useMemo<PendingActivity[]>(
    () => (trees.data ?? []).filter(isPending).map(toPendingActivity),
    [trees.data],
  );

  const treeIds = useMemo(() => (trees.data ?? []).map((tree) => tree.treeId).sort(), [trees.data]);

  const speciesByTree = useMemo(() => {
    const names = new Map<string, string>();
    for (const tree of trees.data ?? []) {
      names.set(tree.treeId, tree.speciesName);
    }
    return names;
  }, [trees.data]);

  const history = useQuery({
    queryKey: activityHistoryQueryKey(treeIds),
    enabled: treeIds.length > 0,
    // The same window the tree list uses, so arriving here straight after
    // closing a cycle shows that cycle rather than a stale list.
    staleTime: 30_000,
    queryFn: async ({ signal }): Promise<LogEntryRow[]> => {
      const { data, error } = await supabase
        .from('log_entries')
        .select('id, tree_id, cycle, captured_at, on_time')
        .in('tree_id', treeIds)
        .is('archived_at', null)
        .order('captured_at', { ascending: false })
        .limit(HISTORY_LIMIT)
        .abortSignal(signal);

      if (error !== null) {
        throw new Error(error.message);
      }

      return (data ?? []) as LogEntryRow[];
    },
  });

  // Joined during render against the trees already in cache, rather than by
  // embedding the tree in the query: the names are sitting here anyway, and an
  // embed would refetch every species on each page of the log.
  const resolved = useMemo<ResolvedActivity[]>(
    () =>
      (history.data ?? []).flatMap((entry) => {
        const speciesName = speciesByTree.get(entry.tree_id);
        // A log entry whose tree is no longer in the guardian's list -- archived
        // between the two queries. Dropped rather than drawn nameless.
        if (speciesName === undefined) {
          return [];
        }

        return [
          {
            entryId: entry.id,
            treeId: entry.tree_id,
            speciesName,
            cycle: entry.cycle,
            capturedAt: entry.captured_at,
            onTime: entry.on_time,
          },
        ];
      }),
    [history.data, speciesByTree],
  );

  return {
    pending,
    resolved,
    hasTrees: (trees.data ?? []).length > 0,
    isPending: trees.isPending,
    isHistoryPending: treeIds.length > 0 && history.isPending,
    isRefetching: trees.isRefetching || history.isRefetching,
    /** The trees query owns the screen's error: without it there is nothing to draw. */
    error: trees.error,
    /** Reported separately, so a failed history never blanks a working pending list. */
    historyError: history.error,
    refetch: () => {
      void trees.refetch();
      void history.refetch();
    },
  };
}

function isPending(tree: GuardianTree): boolean {
  return tree.trackingStatus === 'due_soon' || tree.trackingStatus === 'overdue';
}

function toPendingActivity(tree: GuardianTree): PendingActivity {
  return {
    treeId: tree.treeId,
    speciesName: tree.speciesName,
    villageName: tree.villageName,
    // The planting record is cycle 1, so a tree with no entry yet is waiting on
    // its first rather than on a zeroth.
    cycle: tree.latestCycle ?? 1,
    dueAt: tree.nextReminderAt,
    trackingStatus: tree.trackingStatus,
  };
}
