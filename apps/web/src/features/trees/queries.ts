import 'server-only';

import { cache } from 'react';

import type { TrackingStatus, TreeStatus, Uuid } from '@arbolapp/core';

import { createClient } from '@/lib/supabase/server';
import { initialsOf } from '@/features/auth/session';
import type { Loaded } from '@/features/species/queries';

/** Everything D6 shows about one tree, as `tree_card()` returns it. */
export type TreeDetail = {
  treeId: Uuid;
  code: string;
  speciesName: string;
  speciesRawText: string;
  trackingStatus: TrackingStatus;
  status: TreeStatus;
  plantedAt: string | null;
  lastUpdatedAt: string | null;
  lat: number | null;
  lng: number | null;
  guardianId: Uuid | null;
  /** Null when the guardian's account was archived: `public_users` hides it. */
  guardianDisplayName: string | null;
  villageName: string | null;
  municipalityName: string | null;
};

/** The growth log reduced to what the DATOS card says about it. */
export type LogbookSummary = {
  entryCount: number;
  lastEntryAt: string | null;
};

/** A guardian who left, so the screen can say when and why rather than guess. */
export type ArchivedGuardian = {
  fullName: string;
  archivedAt: string | null;
  archiveReason: string | null;
};

/** One candidate in the reassignment list. */
export type GuardianCandidate = {
  userId: Uuid;
  fullName: string;
  institution: string | null;
  initials: string;
  treeCount: number;
  /** Trees of theirs that are not up to date, which is what the canvas hints at. */
  pendingCount: number;
};

type TreeCardRow = {
  tree_id: Uuid;
  code: string;
  species_name: string;
  species_raw_text: string;
  tracking_status: TrackingStatus;
  status: TreeStatus;
  planted_at: string | null;
  last_updated_at: string | null;
  lat: number | null;
  lng: number | null;
  guardian_id: Uuid | null;
  guardian_display_name: string | null;
  village_name: string | null;
  municipality_name: string | null;
};

type LogEntryRow = { captured_at: string };

type ArchivedGuardianRow = {
  full_name: string;
  archived_at: string | null;
  archive_reason: string | null;
};

type PublicUserRow = {
  id: Uuid;
  full_name: string;
  institution: string | null;
};

type GuardianTreeRow = {
  guardian_id: Uuid | null;
  tracking_status: TrackingStatus;
};

/**
 * The tree behind D6.
 *
 * `tree_card()` and not a hand-written join: it is the same function the mobile
 * map card calls, so the panel and the phone cannot describe one tree two
 * different ways, and it is the only reachable source of the coordinates -- the
 * location is a PostGIS geometry, which no plain select turns into a pair of
 * numbers.
 *
 * It filters `archived_at is null`, so an archived tree comes back empty and the
 * screen says it was not found. That is a real limitation and not a bug here:
 * reviewing an archived tree needs a query that does not exist yet, and adding
 * one is a schema change.
 */
export const getTreeDetail = cache(async (treeId: string): Promise<Loaded<TreeDetail | null>> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('tree_card', { target_tree_id: treeId });

  if (error) return { ok: false };

  const rows = (data ?? []) as TreeCardRow[];
  const row = rows[0];

  if (!row) return { ok: true, value: null };

  return {
    ok: true,
    value: {
      treeId: row.tree_id,
      code: row.code,
      speciesName: row.species_name,
      speciesRawText: row.species_raw_text,
      trackingStatus: row.tracking_status,
      status: row.status,
      plantedAt: row.planted_at,
      lastUpdatedAt: row.last_updated_at,
      lat: row.lat,
      lng: row.lng,
      guardianId: row.guardian_id,
      guardianDisplayName: row.guardian_display_name,
      villageName: row.village_name,
      municipalityName: row.municipality_name,
    },
  };
});

/** How many entries the growth log holds and when the newest one was taken. */
export const getLogbookSummary = cache(async (treeId: string): Promise<Loaded<LogbookSummary>> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('log_entries')
    .select('captured_at')
    .eq('tree_id', treeId)
    .is('archived_at', null)
    .order('captured_at', { ascending: false });

  if (error || !data) return { ok: false };

  const rows = data as LogEntryRow[];

  return {
    ok: true,
    value: { entryCount: rows.length, lastEntryAt: rows[0]?.captured_at ?? null },
  };
});

/**
 * The account of a guardian who was deactivated.
 *
 * Only asked for when the tree points at a guardian that `public_users` does
 * not return, which is exactly the "guardiana anterior desactivada" case the
 * canvas draws. `user_directory` is the view that can still see the row, and
 * the email column is deliberately not among the ones selected.
 */
export const getArchivedGuardian = cache(
  async (guardianId: string): Promise<Loaded<ArchivedGuardian | null>> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_directory')
      .select('full_name, archived_at, archive_reason')
      .eq('id', guardianId)
      .maybeSingle();

    if (error) return { ok: false };
    if (!data) return { ok: true, value: null };

    const row = data as ArchivedGuardianRow;

    return {
      ok: true,
      value: {
        fullName: row.full_name,
        archivedAt: row.archived_at,
        archiveReason: row.archive_reason,
      },
    };
  },
);

/**
 * Active guardians a tree can be handed to, with their current load.
 *
 * `public_users` rather than `user_directory`: it already filters the archived
 * accounts, which is what "guardián activo" means on this screen, and it has no
 * email column at all -- the reassignment has no business reading one.
 *
 * The counts come from `tree_overview` in one read and are grouped here. One
 * request per candidate would be dozens of round trips for a list the
 * coordinator scans in a second.
 */
export const getGuardianCandidates = cache(async (): Promise<Loaded<GuardianCandidate[]>> => {
  const supabase = await createClient();

  const [{ data: people, error: peopleError }, { data: trees, error: treesError }] =
    await Promise.all([
      supabase
        .from('public_users')
        .select('id, full_name, institution')
        .eq('role', 'guardian')
        .order('full_name'),
      supabase.from('tree_overview').select('guardian_id, tracking_status'),
    ]);

  if (peopleError || !people || treesError || !trees) return { ok: false };

  const treeRows = trees as GuardianTreeRow[];
  const load = new Map<Uuid, { total: number; pending: number }>();

  for (const tree of treeRows) {
    if (!tree.guardian_id) continue;

    const current = load.get(tree.guardian_id) ?? { total: 0, pending: 0 };

    load.set(tree.guardian_id, {
      total: current.total + 1,
      pending: current.pending + (tree.tracking_status === 'up_to_date' ? 0 : 1),
    });
  }

  const rows = people as PublicUserRow[];

  return {
    ok: true,
    value: rows.map((person) => {
      const counts = load.get(person.id) ?? { total: 0, pending: 0 };

      return {
        userId: person.id,
        fullName: person.full_name,
        institution: person.institution,
        initials: initialsOf(person.full_name),
        treeCount: counts.total,
        pendingCount: counts.pending,
      };
    }),
  };
});
