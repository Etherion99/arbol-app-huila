-- Making a registration something a report can be built on.
--
-- Until now nothing in the schema could tell a tree somebody walked to from a
-- tree somebody typed. The figures this project hands to the Secretaría de
-- Ambiente are only defensible if that distinction exists, so this migration
-- adds the two signals that produce it -- a photograph taken somewhere other
-- than the declared point, and two trees standing on top of each other -- and
-- the queue a coordinator works through.
--
-- **Nothing here rejects anything.** Under canopy a consumer GPS wanders by
-- more than a hundred metres through nobody's fault, and two saplings at the
-- edge of a plot really can be three metres apart. Every signal raises a flag
-- against a tree that is otherwise registered normally, and a person decides.
-- An automatic refusal would call honest guardians liars, and a guardian called
-- a liar by a machine does not come back.
--
-- It also closes the one hole the offline queue opens. A queued planting that
-- is retried after its first attempt committed but before its answer arrived
-- would otherwise plant a second tree, and no natural key could tell the two
-- apart. A client request identifier can.

-- ---------------------------------------------------------------------------
-- Idempotent planting
-- ---------------------------------------------------------------------------

alter table public.trees
  add column client_request_id text;

comment on column public.trees.client_request_id is
  'The identifier of the queue job that planted this tree, minted on the phone before the first attempt. A retried planting finds its own tree instead of creating a second one. Text rather than uuid because the queue mints an opaque, sortable id of its own and there is no reason to make it produce a second one. Null for rows written before the queue existed and for the seed.';

-- Unique per guardian rather than globally: the identifier comes off a phone
-- and the database has no reason to assume two phones never collide. Partial,
-- so every row that predates the queue keeps its null without competing.
create unique index trees_client_request_key
  on public.trees (guardian_id, client_request_id)
  where client_request_id is not null;

-- ---------------------------------------------------------------------------
-- Flags
-- ---------------------------------------------------------------------------

create type public.registration_flag_reason as enum (
  'gps_mismatch',
  'duplicate_location',
  'missing_capture_location'
);

create type public.registration_flag_resolution as enum ('confirmed', 'dismissed');

-- The thresholds, in the one place both sides read them from.
--
-- `GPS_COHERENCE_METRES` and `DUPLICATE_RADIUS_METRES` in packages/core are the
-- client's copy, and `pnpm test:offline` compares the two. It is the same
-- arrangement `normalize_species()` and `reminder_offset_days()` already live
-- under, for the same reason: a silent drift would move where the line falls
-- without anything raising.
create or replace function public.registration_flag_thresholds()
returns table (gps_coherence_metres integer, duplicate_radius_metres integer)
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select 150, 3;
$fn$;

comment on function public.registration_flag_thresholds() is
  'The two distances registration flagging is decided by, mirrored in packages/core and compared by pnpm test:offline.';

create table public.registration_flags (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  reason public.registration_flag_reason not null,
  -- Metres of separation for both distance reasons, null when there was
  -- nothing to measure. Stored rather than recomputed because it is what the
  -- check saw at the moment of registration, and a tree can be moved later.
  distance_metres numeric(10, 2),
  related_tree_id uuid references public.trees (id) on delete set null,
  created_at timestamptz not null default now(),
  resolution public.registration_flag_resolution,
  resolved_by uuid references public.users (id),
  resolved_at timestamptz,
  resolution_note text,
  constraint registration_flags_not_self check (related_tree_id is distinct from tree_id),
  -- A resolution is a decision by somebody at some moment: the three fields
  -- are set together or not at all, so an unresolved flag can never look
  -- half judged.
  constraint registration_flags_resolution_together check (
    (resolution is null) = (resolved_by is null)
    and (resolution is null) = (resolved_at is null)
  )
);

-- One flag of a kind per tree. A re-registration that trips the same signal
-- twice is one thing to look at, not two, and this is what makes the whole
-- check idempotent under a queued retry.
create unique index registration_flags_tree_reason_key
  on public.registration_flags (tree_id, reason);

-- The queue itself: what a coordinator opens the screen to see, oldest first.
create index registration_flags_open_idx
  on public.registration_flags (created_at)
  where resolution is null;

comment on table public.registration_flags is
  'Signals that a registration deserves a human look. Never a rejection: the tree exists and is on the map, and a coordinator decides what the signal meant.';
comment on column public.registration_flags.distance_metres is
  'What the check measured when the flag was raised, kept rather than recomputed because the tree can be moved afterwards.';
comment on column public.registration_flags.resolution is
  'Null while the flag is open. A coordinator confirms it or dismisses it; neither outcome deletes anything.';

-- ---------------------------------------------------------------------------
-- Raising the flags
-- ---------------------------------------------------------------------------

-- Runs the three checks over a tree that has just been registered.
--
-- Security definer, and necessarily: the duplicate check has to see every tree
-- standing near this one, including those of other guardians, and a guardian
-- can select those but a flag must not depend on that staying true. It reads
-- ids and coordinates only, and returns nothing about the neighbour to the
-- caller beyond the fact that one is there.
--
-- `on conflict do nothing` against the unique index is what makes it safe to
-- call twice for the same tree, which a retried queue entry does.
create or replace function public.flag_registration(
  target_tree_id uuid,
  in_capture_lng double precision default null,
  in_capture_lat double precision default null
)
returns public.registration_flag_reason[]
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  thresholds record;
  declared extensions.geometry;
  captured extensions.geometry;
  drift numeric;
  neighbour record;
  raised public.registration_flag_reason[] := array[]::public.registration_flag_reason[];
begin
  select * into thresholds from public.registration_flag_thresholds();

  select tree.location into declared
    from public.trees tree
   where tree.id = target_tree_id;

  if declared is null then
    raise exception 'tree % does not exist', target_tree_id using errcode = '22023';
  end if;

  -- 1 · The photograph carries no coordinate at all.
  --
  -- Flagged rather than ignored, and this is the check that keeps the other two
  -- honest: without it, the way to pass every test is to turn location off
  -- before opening the camera. It is also the mildest of the three -- an old
  -- handset, a denied permission and a cold start with no fix all land here --
  -- so it is the one a coordinator dismisses most, and that is fine.
  if in_capture_lng is null or in_capture_lat is null then
    insert into public.registration_flags (tree_id, reason)
    values (target_tree_id, 'missing_capture_location')
    on conflict do nothing;

    raised := raised || 'missing_capture_location'::public.registration_flag_reason;
  else
    captured := extensions.st_setsrid(
      extensions.st_makepoint(in_capture_lng, in_capture_lat), 4326
    );

    -- 2 · Declared point against where the shutter was pressed.
    --
    -- Measured as geography, so the answer is metres on the ellipsoid rather
    -- than degrees, which at this latitude would be a number with no meaning.
    drift := round(
      extensions.st_distance(
        declared::extensions.geography, captured::extensions.geography
      )::numeric,
      2
    );

    if drift > thresholds.gps_coherence_metres then
      insert into public.registration_flags (tree_id, reason, distance_metres)
      values (target_tree_id, 'gps_mismatch', drift)
      on conflict do nothing;

      raised := raised || 'gps_mismatch'::public.registration_flag_reason;
    end if;
  end if;

  -- 3 · Another live tree close enough to be this one, registered twice.
  --
  -- Archived trees are excluded: a coordinator who archived a duplicate last
  -- month has already answered this question, and re-asking it would make the
  -- queue impossible to empty. `st_dwithin` on geography so the spatial index
  -- is used and the radius is metres.
  select tree.id as neighbour_id,
         round(
           extensions.st_distance(
             declared::extensions.geography, tree.location::extensions.geography
           )::numeric,
           2
         ) as separation
    into neighbour
    from public.trees tree
   where tree.id <> target_tree_id
     and tree.archived_at is null
     and extensions.st_dwithin(
           declared::extensions.geography,
           tree.location::extensions.geography,
           thresholds.duplicate_radius_metres
         )
   order by separation
   limit 1;

  if neighbour.neighbour_id is not null then
    insert into public.registration_flags (tree_id, reason, distance_metres, related_tree_id)
    values (target_tree_id, 'duplicate_location', neighbour.separation, neighbour.neighbour_id)
    on conflict do nothing;

    raised := raised || 'duplicate_location'::public.registration_flag_reason;
  end if;

  return raised;
end;
$fn$;

comment on function public.flag_registration(uuid, double precision, double precision) is
  'Runs the three registration integrity checks over a freshly planted tree and records what they found. Raises flags, never refuses: every one of them goes to a coordinator.';

-- ---------------------------------------------------------------------------
-- register_tree, now idempotent and checked
-- ---------------------------------------------------------------------------

-- The signature and the return type both change, and neither can be done with
-- `create or replace`.
drop function if exists public.register_tree(
  text, uuid, double precision, double precision, date, integer, integer,
  timestamptz, double precision, double precision, text
);

-- A tree and its cycle 1 entry, created together, checked, and safe to call
-- twice.
--
-- What is new against the previous version:
--
--   * `in_client_request_id` -- the identifier the phone minted before its
--     first attempt. When a row already carries it, that row is returned and
--     nothing is written. This is what lets the offline queue retry a planting
--     whose answer was lost on the radio without planting a second tree, and it
--     is the only mechanism that can: two plantings of the same tree are
--     identical in every natural column.
--   * the integrity checks, run after the insert, inside the same transaction.
--     A flag is not a refusal, so it does not roll anything back -- it travels
--     back to the phone in `flags` so the guardian is told plainly, on the
--     screen where it still means something, that a coordinator will look.
--
-- Still security invoker, so every row level policy decides as before.
create or replace function public.register_tree(
  in_species_raw_text text,
  in_zone_id uuid,
  in_lng double precision,
  in_lat double precision,
  in_planted_at date,
  in_height_cm integer,
  in_visible_branches integer,
  in_captured_at timestamptz,
  in_capture_lng double precision default null,
  in_capture_lat double precision default null,
  in_notes text default null,
  in_client_request_id text default null
)
returns table (
  tree_id uuid,
  code text,
  cycle integer,
  photo_path text,
  thumbnail_path text,
  was_already_registered boolean,
  flags text[]
)
language plpgsql
set search_path = ''
as $fn$
declare
  actor uuid := (select auth.uid());
  new_tree public.trees;
  new_entry public.log_entries;
  resolved_species uuid;
  allocated_code text;
  existing record;
  raised public.registration_flag_reason[];
begin
  if actor is null then
    raise exception 'only a signed in guardian can register a tree' using errcode = '42501';
  end if;

  -- The retry path. Read before anything is allocated, so a repeat costs one
  -- index lookup rather than a species insert and a code from the sequence.
  if in_client_request_id is not null then
    select tree.id as existing_id, tree.code as existing_code
      into existing
      from public.trees tree
     where tree.guardian_id = actor
       and tree.client_request_id = in_client_request_id;

    if existing.existing_id is not null then
      return query
        select existing.existing_id,
               existing.existing_code,
               entry.cycle,
               entry.photo_path,
               entry.thumbnail_path,
               true,
               coalesce(
                 (select array_agg(flag.reason::text)
                    from public.registration_flags flag
                   where flag.tree_id = existing.existing_id),
                 array[]::text[]
               )
          from public.log_entries entry
         where entry.tree_id = existing.existing_id
           and entry.cycle = 1;
      return;
    end if;
  end if;

  resolved_species := public.resolve_species(in_species_raw_text);
  allocated_code := public.next_tree_code(in_zone_id);

  insert into public.trees (
    code, guardian_id, species_id, species_raw_text, location, zone_id,
    planted_at, last_updated_at, client_request_id
  )
  values (
    allocated_code,
    actor,
    resolved_species,
    btrim(in_species_raw_text),
    extensions.st_setsrid(extensions.st_makepoint(in_lng, in_lat), 4326),
    in_zone_id,
    in_planted_at,
    in_captured_at,
    in_client_request_id
  )
  returning * into new_tree;

  -- The object keys are built here from the identifier the insert produced,
  -- following the same convention growthLogPhotoPath() builds in the client:
  -- the tree folder first, which is what lets a storage policy decide ownership
  -- from the object name alone.
  insert into public.log_entries (
    tree_id, author_id, photo_path, thumbnail_path, captured_at, capture_location,
    height_cm, visible_branches, health_status, notes
  )
  values (
    new_tree.id,
    actor,
    new_tree.id::text || '/1/photo.jpg',
    new_tree.id::text || '/1/thumbnail.jpg',
    in_captured_at,
    case
      when in_capture_lng is null or in_capture_lat is null then null
      else extensions.st_setsrid(
        extensions.st_makepoint(in_capture_lng, in_capture_lat), 4326
      )
    end,
    in_height_cm,
    in_visible_branches::smallint,
    'healthy',
    in_notes
  )
  returning * into new_entry;

  raised := public.flag_registration(new_tree.id, in_capture_lng, in_capture_lat);

  return query
    select new_tree.id, new_tree.code, new_entry.cycle, new_entry.photo_path,
           new_entry.thumbnail_path, false, raised::text[];
end;
$fn$;

comment on function public.register_tree(
  text, uuid, double precision, double precision, date, integer, integer,
  timestamptz, double precision, double precision, text, text
) is
  'Creates a tree and its cycle 1 growth log entry in one transaction, runs the registration integrity checks, and returns the object keys the photograph must be uploaded to. Repeating a client request id returns the tree that call already made instead of planting a second one.';

-- ---------------------------------------------------------------------------
-- The review queue
-- ---------------------------------------------------------------------------

-- What the coordinator's review screen lists, oldest flag first.
--
-- A function rather than a view because it joins the zone ancestry, the newest
-- photograph and the neighbouring tree's code, none of which PostgREST can ask
-- for across a single table. Coordinator only: the `is_coordinator()` guard is
-- repeated inside even though the table's policy already says so, because a
-- `security definer` function that forgot it would hand the whole queue to
-- anybody with a session.
--
-- No email, here or anywhere: the guardian is named by `public_users` through
-- `short_display_name()`, exactly as the map card names them.
create or replace function public.registration_review_queue(
  include_resolved boolean default false
)
returns table (
  flag_id uuid,
  tree_id uuid,
  code text,
  species_name text,
  village_name text,
  municipality_name text,
  guardian_id uuid,
  guardian_display_name text,
  reason text,
  distance_metres numeric,
  related_tree_id uuid,
  related_tree_code text,
  planted_at date,
  flagged_at timestamptz,
  photo_path text
)
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not public.is_coordinator() then
    raise exception 'only a coordinator can read the registration review queue'
      using errcode = '42501';
  end if;

  return query
    select
      flag.id,
      tree.id,
      tree.code,
      species.canonical_name,
      ancestry.village_name,
      ancestry.municipality_name,
      tree.guardian_id,
      public.short_display_name(guardian.full_name),
      flag.reason::text,
      flag.distance_metres,
      flag.related_tree_id,
      related.code,
      tree.planted_at,
      flag.created_at,
      latest.photo_path
    from public.registration_flags flag
    join public.trees tree on tree.id = flag.tree_id
    join public.species species on species.id = tree.species_id
    left join public.zone_ancestry ancestry on ancestry.zone_id = tree.zone_id
    left join public.public_users guardian on guardian.id = tree.guardian_id
    left join public.trees related on related.id = flag.related_tree_id
    left join lateral (
      select entry.photo_path
      from public.log_entries entry
      where entry.tree_id = tree.id
        and entry.archived_at is null
      order by entry.cycle desc
      limit 1
    ) latest on true
    where tree.archived_at is null
      and (include_resolved or flag.resolution is null)
    -- Oldest first: a flag nobody has looked at for a month is the one that
    -- decides whether this queue is being worked at all.
    order by flag.created_at;
end;
$fn$;

comment on function public.registration_review_queue(boolean) is
  'The flagged registrations a coordinator has to judge, oldest first, with the tree, its zone, its guardian short name and the neighbour a duplicate flag points at. Never an email.';

-- What a coordinator decides about a flag.
--
-- Neither outcome removes anything. `confirmed` says the signal was real, which
-- is the coordinator's cue to archive the tree with a reason through the
-- ordinary moderation path -- archiving is not folded in here, because the two
-- are different decisions and one screen must not make the other silently.
-- `dismissed` says the guardian was doing their job and the GPS was not.
create or replace function public.resolve_registration_flag(
  target_flag_id uuid,
  in_resolution public.registration_flag_resolution,
  in_note text default null
)
returns public.registration_flags
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor uuid := (select auth.uid());
  updated public.registration_flags;
begin
  if not public.is_coordinator() then
    raise exception 'only a coordinator can resolve a registration flag'
      using errcode = '42501';
  end if;

  update public.registration_flags flag
     set resolution = in_resolution,
         resolved_by = actor,
         resolved_at = now(),
         resolution_note = nullif(btrim(coalesce(in_note, '')), '')
   where flag.id = target_flag_id
  returning * into updated;

  if updated.id is null then
    raise exception 'no registration flag %', target_flag_id using errcode = '22023';
  end if;

  return updated;
end;
$fn$;

comment on function public.resolve_registration_flag(
  uuid, public.registration_flag_resolution, text
) is
  'Records what a coordinator decided about a flag. Confirming does not archive the tree: that is the moderation path, and a separate decision.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.registration_flags enable row level security;

-- Guardians deliberately cannot read this table.
--
-- A guardian is told about their own flags once, by `register_tree()`, on the
-- screen where the registration happened, in the words the app chooses. Giving
-- them a live feed of "estás marcado" would turn a review into an accusation
-- standing permanently on their own tree, and would also hand anybody who
-- wanted to game the checks a way to test them until they passed.
create policy registration_flags_coordinator_all on public.registration_flags
  for all
  using (public.is_coordinator())
  with check (public.is_coordinator());

grant select, insert, update on public.registration_flags to authenticated;
grant execute on function public.registration_flag_thresholds() to anon, authenticated;
grant execute on function public.flag_registration(uuid, double precision, double precision)
  to authenticated;
grant execute on function public.registration_review_queue(boolean) to authenticated;
grant execute on function public.resolve_registration_flag(
  uuid, public.registration_flag_resolution, text
) to authenticated;
grant execute on function public.register_tree(
  text, uuid, double precision, double precision, date, integer, integer,
  timestamptz, double precision, double precision, text, text
) to authenticated;
