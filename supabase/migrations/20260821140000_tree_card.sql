-- What the floating card shows when a marker is tapped.
--
-- It exists as its own function because the map deliberately does not carry
-- this payload: `trees_in_viewport()` returns a dot and nothing else, so
-- panning never pays for a photograph, a guardian or a measurement that nobody
-- looked at. One tap, one request, one tree.

-- ---------------------------------------------------------------------------
-- Guardian display name
-- ---------------------------------------------------------------------------

-- The card names the guardian by given name and the initial of their last
-- surname -- "Andrés Cabrera" reads as "Andrés C.". The full name is public and
-- reachable through `public_users`; this is not a privacy control, it is the
-- shape the card asks for, and it lives in SQL so the mobile app and the web
-- panel cannot render the same guardian two different ways.
create or replace function public.short_display_name(full_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  with parts as (
    select
      array_remove(regexp_split_to_array(btrim(coalesce(full_name, '')), '\s+'), '') as tokens
  )
  select case
    when cardinality(tokens) = 0 then null
    when cardinality(tokens) = 1 then tokens[1]
    else tokens[1] || ' ' || upper(left(tokens[cardinality(tokens)], 1)) || '.'
  end
  from parts;
$$;

comment on function public.short_display_name(text) is
  'Given name plus the initial of the last surname, the form the tree card names a guardian by.';

-- ---------------------------------------------------------------------------
-- Tree card
-- ---------------------------------------------------------------------------

-- Security invoker, so the row level policies decide what comes back. An
-- archived tree is unreachable here for the same reason it is unreachable on
-- the map, and the email is not selected because no public endpoint exposes it.
--
-- The photograph travels as an object key, never as a URL. The bucket is
-- private, so the client asks for a signed URL once the card is open, which is
-- also why the map never sees these paths.
create or replace function public.tree_card(target_tree_id uuid)
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
  guardian_id uuid,
  guardian_display_name text,
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
    tree.guardian_id,
    public.short_display_name(guardian.full_name),
    ancestry.village_name,
    ancestry.municipality_name,
    latest.cycle,
    latest.photo_path,
    latest.thumbnail_path
  from public.trees tree
  join public.tree_tracking tracking on tracking.tree_id = tree.id
  join public.species species on species.id = tree.species_id
  left join public.zone_ancestry ancestry on ancestry.zone_id = tree.zone_id
  left join public.public_users guardian on guardian.id = tree.guardian_id
  -- The newest cycle that still exists. A tree whose only entry was archived
  -- keeps its card and shows the placeholder, rather than disappearing.
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
  'Everything the floating map card shows for one tree: species, guardian short name, zone, tracking status and the newest photograph as an object key. Never the guardian email.';

grant execute on function public.short_display_name(text) to anon, authenticated;
grant execute on function public.tree_card(uuid) to anon, authenticated;
