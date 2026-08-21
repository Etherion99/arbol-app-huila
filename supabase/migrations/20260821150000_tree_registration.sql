-- Registering a tree, which until now was the one thing the schema described
-- but nothing could actually do.
--
-- Three gaps are closed here:
--
--   1. `trees.code` had a shape constraint and a unique index but nothing that
--      produced a value. The seed built it by hand. A client building it
--      instead would race with every other client on the unique index and
--      would also have to know which letters stand for which zone.
--   2. Planting is a tree plus its cycle 1 entry, and the two have to appear
--      together or not at all. Two round trips from a phone on a rural
--      connection cannot promise that; one function in one transaction can.
--   3. The tree card had no coordinates, so the detail screen could not draw
--      the mini map without a second query for a column it is already reading.

-- ---------------------------------------------------------------------------
-- Human readable code
-- ---------------------------------------------------------------------------

-- The letters in `HUI-LP-0042`: three for the department, two for the
-- municipality. They are derived from the zone catalogue rather than stored,
-- because the catalogue is editable from the panel and a stored prefix would
-- be a second copy of a name that can change.
--
-- The department contributes its first three letters and the municipality the
-- initial of each of its words, which is what turns Huila and La Plata into
-- HUI and LP. A single word municipality falls back to its first two letters,
-- so Neiva becomes NE rather than a one letter prefix that would not satisfy
-- the shape constraint.
create or replace function public.tree_code_prefix(target_zone_id uuid)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  department_name text;
  municipality_name text;
  department_part text;
  municipality_part text;
  initials text;
begin
  select ancestry.department_name, ancestry.municipality_name
    into department_name, municipality_name
    from public.zone_ancestry ancestry
   where ancestry.zone_id = target_zone_id;

  if department_name is null or municipality_name is null then
    raise exception 'zone % does not resolve to a department and a municipality', target_zone_id
      using errcode = '22023';
  end if;

  -- Unaccented uppercase letters only: the shape constraint accepts A-Z, and
  -- "Bogotá" or "Chocó" would otherwise produce a code no query could match.
  department_part := regexp_replace(
    upper(public.normalize_species(department_name)), '[^A-Z]', '', 'g'
  );

  initials := regexp_replace(
    upper(public.normalize_species(municipality_name)), '[^A-Z ]', '', 'g'
  );
  municipality_part := regexp_replace(
    array_to_string(
      array(select left(word, 1) from unnest(string_to_array(initials, ' ')) word where word <> ''),
      ''
    ),
    '[^A-Z]', '', 'g'
  );

  if length(municipality_part) < 2 then
    municipality_part := regexp_replace(initials, '[^A-Z]', '', 'g');
  end if;

  if length(department_part) < 3 or length(municipality_part) < 2 then
    raise exception 'zone % has names too short to build a tree code from', target_zone_id
      using errcode = '22023';
  end if;

  return left(department_part, 3) || '-' || left(municipality_part, 2);
end;
$$;

comment on function public.tree_code_prefix(uuid) is
  'The letter part of a tree code, derived from the department and municipality names so it follows a rename instead of freezing an old one.';

-- The next free code for a zone.
--
-- The advisory lock is what makes it safe. Two guardians planting in the same
-- municipality at the same second would otherwise both read the same maximum
-- and both try to write it, and one of them would get a unique violation on a
-- form they had already filled in. The lock is taken on the prefix, so La
-- Plata and Neiva never wait for each other, and it is transaction scoped, so
-- it is released by the same commit that writes the row.
-- Security definer, and for once that is the point rather than a convenience:
-- a guardian cannot select an archived tree, so as the caller this would read a
-- maximum that skips every retired code and would hand back one already taken.
-- The unique index sees all the rows; this has to see them too.
create or replace function public.next_tree_code(target_zone_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  prefix text := public.tree_code_prefix(target_zone_id);
  next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext('tree_code:' || prefix));

  select coalesce(max(substring(tree.code from 8 for 4)::integer), 0) + 1
    into next_number
    from public.trees tree
   where tree.code like prefix || '-%';

  if next_number > 9999 then
    raise exception 'the code range for % is exhausted', prefix using errcode = '54000';
  end if;

  return prefix || '-' || lpad(next_number::text, 4, '0');
end;
$$;

comment on function public.next_tree_code(uuid) is
  'Allocates the next free tree code for a zone, serialising concurrent planting in the same municipality through a transaction scoped advisory lock.';

-- ---------------------------------------------------------------------------
-- Species, from free text
-- ---------------------------------------------------------------------------

-- Resolves what the guardian typed to a species row, creating it when the name
-- is genuinely new.
--
-- `on conflict do nothing` followed by a select rather than `on conflict do
-- update`: a guardian holds insert on species but not update, so an upsert
-- would be refused by the row level policy for the ordinary case of two people
-- naming the same species at the same time.
--
-- A species that has already been merged away resolves to its target, so a
-- guardian typing a name a coordinator retired last week lands on the surviving
-- row instead of resurrecting the old one. That is what the security definer is
-- for: a merged species is archived, and the caller cannot see it to follow it.
create or replace function public.resolve_species(raw_text text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  key text := public.normalize_species(raw_text);
  found_id uuid;
  merged_target uuid;
begin
  if key = '' then
    raise exception 'the species name cannot be blank' using errcode = '22023';
  end if;

  insert into public.species (normalized_key, canonical_name)
  values (key, btrim(raw_text))
  on conflict (normalized_key) do nothing;

  select species.id, species.merged_into_id
    into found_id, merged_target
    from public.species species
   where species.normalized_key = key;

  if found_id is null then
    raise exception 'could not resolve the species %', raw_text using errcode = '22023';
  end if;

  return coalesce(merged_target, found_id);
end;
$$;

comment on function public.resolve_species(text) is
  'Maps free text to the species row it counts towards, creating it when new and following a merge when the name was retired.';

-- ---------------------------------------------------------------------------
-- Planting
-- ---------------------------------------------------------------------------

-- A tree and its cycle 1 entry, created together.
--
-- Security invoker, so every row level policy still decides: the tree insert
-- is checked against `trees_insert_own` and the entry against
-- `log_entries_insert_own_tree`, which calls `owns_tree()` and sees the tree
-- this same transaction just wrote.
--
-- The photograph is not an argument. Its object key is derived here from the
-- identifier the insert produced, following the same convention
-- `growthLogPhotoPath()` builds in the client, and the upload happens
-- afterwards against a row that already exists -- which is the only order the
-- storage policies allow, since they decide ownership by reading a tree id out
-- of the object name. A failed upload therefore leaves a complete registration
-- with a photograph still to send, never a tree without a growth log.
--
-- `cycle` and `on_time` are left to the triggers, and `next_reminder_at` is
-- generated. None of the three is ever written from here.
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
  in_notes text default null
)
returns table (
  tree_id uuid,
  code text,
  cycle integer,
  photo_path text,
  thumbnail_path text
)
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  new_tree public.trees;
  new_entry public.log_entries;
  resolved_species uuid;
  allocated_code text;
begin
  if actor is null then
    raise exception 'only a signed in guardian can register a tree' using errcode = '42501';
  end if;

  resolved_species := public.resolve_species(in_species_raw_text);
  allocated_code := public.next_tree_code(in_zone_id);

  insert into public.trees (
    code, guardian_id, species_id, species_raw_text, location, zone_id,
    planted_at, last_updated_at
  )
  values (
    allocated_code,
    actor,
    resolved_species,
    btrim(in_species_raw_text),
    extensions.st_setsrid(extensions.st_makepoint(in_lng, in_lat), 4326),
    in_zone_id,
    in_planted_at,
    in_captured_at
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

  return query
    select new_tree.id, new_tree.code, new_entry.cycle, new_entry.photo_path,
           new_entry.thumbnail_path;
end;
$$;

comment on function public.register_tree(
  text, uuid, double precision, double precision, date, integer, integer,
  timestamptz, double precision, double precision, text
) is
  'Creates a tree and its cycle 1 growth log entry in one transaction and returns the object keys the photograph must be uploaded to. The planting record is never separate from the tree.';

-- ---------------------------------------------------------------------------
-- The guardian's own trees
-- ---------------------------------------------------------------------------

-- What the "Mis árboles" tab lists. It exists as a function because the
-- tracking status lives in a view and the newest cycle in a lateral, neither
-- of which PostgREST can express against the trees table on its own.
--
-- The thumbnail travels as an object key for the same reason it does on the
-- map card: the bucket is private, and signing one URL per row before anything
-- is on screen would be a round trip per tree to paint a list.
create or replace function public.guardian_trees()
returns table (
  tree_id uuid,
  code text,
  species_name text,
  species_raw_text text,
  tracking_status text,
  status public.tree_status,
  planted_at date,
  last_updated_at timestamptz,
  next_reminder_at timestamptz,
  village_name text,
  municipality_name text,
  latest_cycle integer,
  latest_thumbnail_path text
)
language sql
stable
set search_path = ''
as $$
  select
    tree.id,
    tree.code,
    species.canonical_name,
    tree.species_raw_text,
    tracking.tracking_status,
    tree.status,
    tree.planted_at,
    tree.last_updated_at,
    tree.next_reminder_at,
    ancestry.village_name,
    ancestry.municipality_name,
    latest.cycle,
    latest.thumbnail_path
  from public.trees tree
  join public.tree_tracking tracking on tracking.tree_id = tree.id
  join public.species species on species.id = tree.species_id
  left join public.zone_ancestry ancestry on ancestry.zone_id = tree.zone_id
  left join lateral (
    select entry.cycle, entry.thumbnail_path
    from public.log_entries entry
    where entry.tree_id = tree.id
      and entry.archived_at is null
    order by entry.cycle desc
    limit 1
  ) latest on true
  where tree.guardian_id = (select auth.uid())
    and tree.archived_at is null
  -- Whatever needs a photograph soonest comes first, which is the order the
  -- list is actually read in.
  order by tree.next_reminder_at;
$$;

comment on function public.guardian_trees() is
  'The signed in guardian''s active trees with their tracking status and newest cycle, ordered by what falls due first.';

-- ---------------------------------------------------------------------------
-- Tree card, with the coordinates the detail screen draws
-- ---------------------------------------------------------------------------

-- The return type gains three columns, which `create or replace` cannot do.
drop function if exists public.tree_card(uuid);

create function public.tree_card(target_tree_id uuid)
returns table (
  tree_id uuid,
  code text,
  species_id uuid,
  species_name text,
  species_raw_text text,
  tracking_status text,
  status public.tree_status,
  planted_at date,
  last_updated_at timestamptz,
  next_reminder_at timestamptz,
  lng double precision,
  lat double precision,
  guardian_id uuid,
  guardian_display_name text,
  guardian_since timestamptz,
  village_name text,
  municipality_name text,
  latest_cycle integer,
  latest_photo_path text,
  latest_thumbnail_path text
)
language sql
stable
set search_path = ''
as $$
  select
    tree.id,
    tree.code,
    tree.species_id,
    species.canonical_name,
    tree.species_raw_text,
    tracking.tracking_status,
    tree.status,
    tree.planted_at,
    tree.last_updated_at,
    tree.next_reminder_at,
    extensions.st_x(tree.location),
    extensions.st_y(tree.location),
    tree.guardian_id,
    public.short_display_name(guardian.full_name),
    guardian.created_at,
    ancestry.village_name,
    ancestry.municipality_name,
    latest.cycle,
    latest.photo_path,
    latest.thumbnail_path
  from public.trees tree
  join public.tree_tracking tracking on tracking.tree_id = tree.id
  join public.species species on species.id = tree.species_id
  left join public.zone_ancestry ancestry on ancestry.zone_id = tree.zone_id
  -- public_users and not users: the guardian's email is not selected here and
  -- is not reachable from here either.
  left join public.public_users guardian on guardian.id = tree.guardian_id
  left join lateral (
    select entry.cycle, entry.photo_path, entry.thumbnail_path
    from public.log_entries entry
    where entry.tree_id = tree.id
      and entry.archived_at is null
    order by entry.cycle desc
    limit 1
  ) latest on true
  where tree.id = target_tree_id
    and tree.archived_at is null;
$$;

comment on function public.tree_card(uuid) is
  'Everything the map card and the tree detail show for one tree: species, guardian short name, zone, coordinates, tracking status and the newest photograph as an object key. Never the guardian email.';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant execute on function public.tree_card(uuid) to anon, authenticated;
grant execute on function public.tree_code_prefix(uuid) to authenticated;
grant execute on function public.next_tree_code(uuid) to authenticated;
grant execute on function public.resolve_species(text) to authenticated;
grant execute on function public.guardian_trees() to authenticated;
grant execute on function public.register_tree(
  text, uuid, double precision, double precision, date, integer, integer,
  timestamptz, double precision, double precision, text
) to authenticated;
