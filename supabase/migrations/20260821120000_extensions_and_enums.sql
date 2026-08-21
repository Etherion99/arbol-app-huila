-- Foundations shared by the whole schema: spatial support, the scheduling
-- extensions the reminder sweep will rely on, and the enumerated types that
-- every table below reuses.

-- Extensions live in their own schema so `public` only holds project objects.
-- `extensions` is already part of the API search path, so PostGIS types stay
-- reachable from PostgREST without qualifying them.
create schema if not exists extensions;

-- Trees, log entries and zones are all geolocated: PostGIS is not optional.
create extension if not exists postgis with schema extensions;

-- pg_cron schedules the reminder sweep and pg_net lets it call the Edge
-- Function that pushes the notifications. Nothing is scheduled yet -- the
-- engine itself is built later -- but enabling them here keeps the database
-- ready for it and surfaces a missing binary now instead of halfway through
-- that work.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Who a person is inside the platform. Guardians look after their own trees;
-- coordinators moderate, archive and merge species.
create type public.user_role as enum ('guardian', 'coordinator');

-- Life cycle of the tree in the field. `replanted` keeps the map point and
-- chains the previous growth log so the history of the site is not lost.
create type public.tree_status as enum ('alive', 'at_risk', 'dead', 'replanted');

-- Health the guardian reports on each growth log entry. Kept apart from
-- `tree_status` because one is a field observation and the other is the state
-- the coordinator manages.
create type public.health_status as enum ('healthy', 'at_risk', 'sick', 'dead');

-- Levels of the zone catalogue: department, municipality and village.
create type public.zone_type as enum ('department', 'municipality', 'village');

-- Reason a reminder was sent. `cycle` is the bimonthly nudge, the follow ups
-- escalate, and `overdue` marks the tree as neglected.
create type public.reminder_kind as enum ('cycle', 'follow_up_7d', 'follow_up_21d', 'overdue');

-- Grouping key for a species name typed by hand. Counts per species are only
-- ever taken over this key, never over the raw text, which stays untouched in
-- `trees.species_raw_text`.
--
-- This must stay identical to `normalizeSpecies()` in packages/core:
-- `pnpm test:species` compares both over a list of variants and fails if they
-- ever drift, because a drift silently splits one species into two counts.
--
-- The steps mirror the TypeScript one for one: decompose to NFD, drop the
-- combining marks, lower case, collapse runs of whitespace, trim, and drop a
-- single trailing plural `s`. Both character classes are spelled with escapes
-- so this file stays plain ASCII, and both are wider than PostgreSQL's own
-- `\s` and `btrim` defaults, which do not cover the non breaking spaces and
-- combining marks JavaScript folds away.
create or replace function public.normalize_species(raw_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  with decomposed as (
    select lower(normalize(coalesce(raw_text, ''), NFD)) as value
  ),
  without_marks as (
    select regexp_replace(
      value,
      '[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20f0\ufe20-\ufe2f\u00a8\u00af\u00b4\u00b7\u00b8\u02b0-\u02ff]',
      '',
      'g'
    ) as value
    from decomposed
  ),
  squeezed as (
    select btrim(
      regexp_replace(
        value,
        '[\u0009-\u000d \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+',
        ' ',
        'g'
      ),
      ' '
    ) as value
    from without_marks
  )
  select regexp_replace(value, 's$', '') from squeezed;
$$;

comment on function public.normalize_species(text) is
  'Grouping key for free text species names. Mirrors normalizeSpecies() in packages/core; the per-species count depends on both producing the same key.';
