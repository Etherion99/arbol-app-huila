-- People, places and species: the three catalogues every tree points at.

-- Keeps `updated_at` honest without asking the application to remember it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.touch_updated_at() is
  'Trigger helper that stamps updated_at on every row update.';

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.user_role not null default 'guardian',
  institution text,
  is_adult_confirmed boolean not null,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  archive_reason text,
  constraint users_full_name_not_blank check (btrim(full_name) <> ''),
  constraint users_email_lowercase check (email = lower(email)),
  constraint users_email_shape check (email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
  constraint users_adult_declaration check (is_adult_confirmed),
  constraint users_archive_fields_together check (
    (archived_at is null) = (archived_by is null)
  )
);

create unique index users_email_key on public.users (email);
create index users_role_idx on public.users (role) where archived_at is null;

comment on table public.users is
  'Profile attached to an auth.users identity. Holds only what the platform needs; the credentials stay in the auth schema.';
comment on column public.users.id is
  'Same identifier as auth.users, so a profile can never drift from its login.';
comment on column public.users.email is
  'Copy of the login email, needed by the coordinator to contact a guardian. Never exposed publicly: public reads go through public.public_users, which omits it.';
comment on column public.users.role is
  'Drives every policy in this schema. A guardian only writes its own rows; a coordinator moderates everything.';
comment on column public.users.institution is
  'Free text school or organisation. Optional because guardians include neighbours who are not tied to one.';
comment on column public.users.is_adult_confirmed is
  'Express declaration of legal age, required because the platform only admits adults. Constrained to true so a profile cannot exist without it.';
comment on column public.users.terms_accepted_at is
  'When the user accepted the terms and the privacy notice. Law 1581 needs the acceptance dated, not just recorded.';
comment on column public.users.archived_at is
  'Soft delete marker. Records are never deleted, so every public query filters archived_at is null.';
comment on column public.users.archived_by is
  'Coordinator who archived the row, kept for the audit trail.';
comment on column public.users.archive_reason is
  'Why the row was archived, so a later reviewer does not have to guess.';

create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- zones
-- ---------------------------------------------------------------------------

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.zones (id),
  type public.zone_type not null,
  name text not null,
  slug text not null,
  divipola_code text,
  geometry extensions.geometry(MultiPolygon, 4326),
  centroid extensions.geometry(Point, 4326),
  suggested_zoom smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  archive_reason text,
  constraint zones_name_not_blank check (btrim(name) <> ''),
  constraint zones_root_is_department check ((type = 'department') = (parent_id is null)),
  constraint zones_not_own_parent check (parent_id is distinct from id),
  constraint zones_zoom_range check (suggested_zoom is null or suggested_zoom between 1 and 22),
  constraint zones_archive_fields_together check (
    (archived_at is null) = (archived_by is null)
  )
);

-- Two villages of the same municipality cannot share a slug, and neither can
-- two departments. `nulls not distinct` is what makes the second half hold,
-- since a department has no parent.
create unique index zones_parent_slug_key
  on public.zones (parent_id, slug) nulls not distinct;

create index zones_parent_idx on public.zones (parent_id) where archived_at is null;
create index zones_type_idx on public.zones (type) where archived_at is null;
create index zones_geometry_idx on public.zones using gist (geometry);

comment on table public.zones is
  'Hierarchical catalogue department > municipality > village, addressed through parent_id.';
comment on column public.zones.parent_id is
  'Containing zone. Null only for a department, which is the root of the tree.';
comment on column public.zones.slug is
  'Accent free lowercase form of the name, used for lookups and deep links so a rename of the display name does not break them.';
comment on column public.zones.divipola_code is
  'DANE administrative code, present for departments and municipalities. Villages have no official code.';
comment on column public.zones.geometry is
  'Real outline of the zone. Deliberately created empty: the village shapefiles for La Plata do not exist yet, and reserving the column now turns their arrival into a data load instead of a destructive migration.';
comment on column public.zones.centroid is
  'Approximate centre used to frame the map when a zone is selected, since there is no outline to fit to yet.';
comment on column public.zones.suggested_zoom is
  'Zoom level that pairs with the centroid to frame the zone, standing in for fitting the map to a real outline.';

create trigger zones_touch_updated_at
  before update on public.zones
  for each row execute function public.touch_updated_at();

-- A village must hang off a municipality and a municipality off a department.
-- The level of the parent lives in another row, so a check constraint cannot
-- see it and a trigger has to.
create or replace function public.zones_enforce_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_type public.zone_type;
  expected_parent public.zone_type;
begin
  if new.parent_id is null then
    return new;
  end if;

  expected_parent := case new.type
    when 'municipality' then 'department'::public.zone_type
    when 'village' then 'municipality'::public.zone_type
  end;

  select z.type into parent_type from public.zones z where z.id = new.parent_id;

  if parent_type is distinct from expected_parent then
    raise exception 'a % must hang off a %, not off a %',
      new.type, expected_parent, coalesce(parent_type::text, 'missing zone');
  end if;

  return new;
end;
$$;

create trigger zones_enforce_hierarchy
  before insert or update of type, parent_id on public.zones
  for each row execute function public.zones_enforce_hierarchy();

-- ---------------------------------------------------------------------------
-- species
-- ---------------------------------------------------------------------------

create table public.species (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null,
  canonical_name text not null,
  merged_into_id uuid references public.species (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  archive_reason text,
  constraint species_canonical_name_not_blank check (btrim(canonical_name) <> ''),
  -- There is deliberately no constraint tying normalized_key to
  -- canonical_name. Two reasons, both real. The key is not a fixed point of
  -- normalize_species(), because the trailing plural `s` is stripped
  -- unconditionally: `aguacate hass` keys to `aguacate has`, which would key
  -- again to `aguacate ha`. And after a merge the coordinator picks which
  -- variant name becomes official, so the surviving row can legitimately read
  -- canonical_name `Mandarina` under key `mandarino`.
  constraint species_key_not_blank check (normalized_key <> ''),
  constraint species_not_merged_into_itself check (merged_into_id is distinct from id),
  constraint species_archive_fields_together check (
    (archived_at is null) = (archived_by is null)
  )
);

create unique index species_normalized_key_key on public.species (normalized_key);
create index species_merged_into_idx on public.species (merged_into_id)
  where merged_into_id is not null;

comment on table public.species is
  'One row per species the guardians have named. The list grows on its own: there is no closed catalogue, only free text collapsed onto a normalized key.';
comment on column public.species.normalized_key is
  'Grouping key produced by normalize_species(). Unique, and the only thing counts are ever taken over.';
comment on column public.species.canonical_name is
  'Display name the coordinator settled on. A merge changes it; the raw text each guardian typed is kept on the tree and never touched.';
comment on column public.species.merged_into_id is
  'Set when this species was folded into another one. The row stays so the merge can be reverted and so old links keep resolving.';

create trigger species_touch_updated_at
  before update on public.species
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- species_merges
-- ---------------------------------------------------------------------------

create table public.species_merges (
  id uuid primary key default gen_random_uuid(),
  source_species_id uuid not null references public.species (id),
  target_species_id uuid not null references public.species (id),
  performed_by uuid not null references public.users (id),
  performed_at timestamptz not null default now(),
  affected_tree_ids uuid[] not null default '{}',
  affected_tree_count integer generated always as (cardinality(affected_tree_ids)) stored,
  reverted_at timestamptz,
  reverted_by uuid references public.users (id),
  constraint species_merges_distinct_sides check (source_species_id <> target_species_id),
  constraint species_merges_revert_fields_together check (
    (reverted_at is null) = (reverted_by is null)
  )
);

create index species_merges_source_idx on public.species_merges (source_species_id);
create index species_merges_target_idx on public.species_merges (target_species_id);
create index species_merges_performed_at_idx on public.species_merges (performed_at desc);

comment on table public.species_merges is
  'Audit trail of every species merge, kept because a merge relabels trees and has to be reversible.';
comment on column public.species_merges.affected_tree_ids is
  'Exact trees relabelled by this merge. The list, and not just the count, is what makes an exact revert possible after other trees have been registered.';
comment on column public.species_merges.affected_tree_count is
  'Size of affected_tree_ids, stored so the admin panel can list merges without unnesting the array.';
comment on column public.species_merges.reverted_at is
  'When the merge was undone. A reverted merge stays on record instead of being deleted.';
