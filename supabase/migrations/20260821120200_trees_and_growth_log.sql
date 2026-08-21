-- The two tables the whole product revolves around: the tree and its growth
-- log. The planting record is not separate from the log -- it is cycle 1.

-- ---------------------------------------------------------------------------
-- Reminder cadence
-- ---------------------------------------------------------------------------

-- When a tree falls due after a log entry: two months later, in Colombian
-- time. The platform operates in one country and one time zone, so the zone is
-- pinned here, once, and every other place that needs the cadence calls this.
--
-- Writing it as `last_entry_at + interval '2 months'` would not work in the
-- generated column below. Adding months to a timestamptz is stable rather than
-- immutable, because the answer depends on the session time zone, and a stored
-- generated column will only accept an immutable expression. Naming the zone
-- removes that dependency. The instant produced is the same either way, since
-- Colombia has no daylight saving.
create or replace function public.next_reminder_after(last_entry_at timestamptz)
returns timestamptz
language sql
immutable
parallel safe
set search_path = ''
as $$
  select timezone(
    'America/Bogota',
    timezone('America/Bogota', last_entry_at) + interval '2 months'
  );
$$;

comment on function public.next_reminder_after(timestamptz) is
  'When a tree falls due after a log entry: two months later in Colombian time. The single place the cadence and the time zone are written down.';

-- ---------------------------------------------------------------------------
-- trees
-- ---------------------------------------------------------------------------

create table public.trees (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  guardian_id uuid references public.users (id),
  species_id uuid not null references public.species (id),
  species_raw_text text not null,
  location extensions.geometry(Point, 4326) not null,
  zone_id uuid not null references public.zones (id),
  planted_at date not null,
  status public.tree_status not null default 'alive',
  last_updated_at timestamptz not null default now(),
  next_reminder_at timestamptz generated always as (
    public.next_reminder_after(last_updated_at)
  ) stored,
  replaces_tree_id uuid references public.trees (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  archive_reason text,
  constraint trees_code_shape check (code ~ '^[A-Z]{3}-[A-Z]{2}-[0-9]{4}$'),
  constraint trees_species_raw_text_not_blank check (btrim(species_raw_text) <> ''),
  constraint trees_not_own_replacement check (replaces_tree_id is distinct from id),
  constraint trees_archive_fields_together check (
    (archived_at is null) = (archived_by is null)
  )
);

create unique index trees_code_key on public.trees (code);

-- Spatial index behind every map query.
create index trees_location_idx on public.trees using gist (location);

-- Partial index for the lists and statistics, which never look at archived
-- rows. Keeping archived trees out of it also keeps it small as the archive
-- grows.
create index trees_active_idx on public.trees (zone_id, species_id, status)
  where archived_at is null;

-- Sweep index for the reminder cron. Archived and dead trees are excluded
-- because they must never produce a reminder, which is also what keeps the
-- index from growing with rows the sweep would only skip.
create index trees_next_reminder_idx on public.trees (next_reminder_at)
  where archived_at is null and status <> 'dead';

create index trees_guardian_idx on public.trees (guardian_id) where archived_at is null;
create index trees_species_idx on public.trees (species_id);

comment on table public.trees is
  'One planted tree. Never deleted: a tree that is gone is archived, and one that was replaced points at its predecessor through replaces_tree_id.';
comment on column public.trees.code is
  'Human readable identifier such as HUI-LP-0042, used on the physical tag and when a guardian reports a problem out loud.';
comment on column public.trees.guardian_id is
  'Owner of the tree. Nullable so a tree whose guardian left shows up as unassigned instead of disappearing.';
comment on column public.trees.species_id is
  'Species this tree counts towards. A merge repoints it; species_raw_text is what survives untouched.';
comment on column public.trees.species_raw_text is
  'Exactly what the guardian typed. Never modified, not even by a merge, so the origin of the datum is always recoverable.';
comment on column public.trees.location is
  'Where the tree stands. Exact and public by decision of the project.';
comment on column public.trees.zone_id is
  'Village the guardian selected. An attribute, not a spatial lookup: there are no village outlines yet.';
comment on column public.trees.last_updated_at is
  'Capture time of the most recent log entry, not the upload time. It is what the reminder cadence counts from.';
comment on column public.trees.next_reminder_at is
  'When this tree is due for its next log entry. Generated, so it can never fall out of step with last_updated_at.';
comment on column public.trees.replaces_tree_id is
  'Tree this one replaced on the same spot, so the history of the site survives a replanting.';

create trigger trees_touch_updated_at
  before update on public.trees
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- log_entries
-- ---------------------------------------------------------------------------

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  -- Cascading is not how a tree normally goes away -- it gets archived. It
  -- only applies to the physical deletion reserved for inappropriate content
  -- and for personal data suppression requests, where the log has to go too.
  tree_id uuid not null references public.trees (id) on delete cascade,
  author_id uuid not null references public.users (id),
  cycle integer not null,
  photo_path text not null,
  thumbnail_path text not null,
  captured_at timestamptz not null,
  capture_location extensions.geometry(Point, 4326),
  height_cm integer,
  visible_branches smallint,
  health_status public.health_status not null,
  notes text,
  on_time boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.users (id),
  archive_reason text,
  constraint log_entries_cycle_positive check (cycle >= 1),
  constraint log_entries_height_range check (height_cm is null or height_cm between 1 and 5000),
  constraint log_entries_branches_range check (
    visible_branches is null or visible_branches between 0 and 1000
  ),
  constraint log_entries_photo_paths_not_blank check (
    btrim(photo_path) <> '' and btrim(thumbnail_path) <> ''
  ),
  -- A living tree is measured; a dead one is explained instead. This is the
  -- capture rule from the field form, written where it cannot be bypassed.
  constraint log_entries_measures_when_alive check (
    health_status = 'dead' or height_cm is not null
  ),
  constraint log_entries_cause_when_dead check (
    health_status <> 'dead' or btrim(coalesce(notes, '')) <> ''
  ),
  constraint log_entries_archive_fields_together check (
    (archived_at is null) = (archived_by is null)
  )
);

-- One entry per cycle and per tree. Declared descending so the same index that
-- enforces the rule is also the one the timeline reads, newest cycle first.
create unique index log_entries_tree_cycle_key on public.log_entries (tree_id, cycle desc);

create index log_entries_capture_location_idx
  on public.log_entries using gist (capture_location);
create index log_entries_author_idx on public.log_entries (author_id)
  where archived_at is null;
create index log_entries_captured_at_idx on public.log_entries (captured_at desc)
  where archived_at is null;

comment on table public.log_entries is
  'Growth log. The planting record is cycle 1 of this table, not a separate row somewhere else.';
comment on column public.log_entries.cycle is
  'Sequential number of the entry for its tree, starting at 1 for the planting. Filled in by a trigger when the client leaves it null.';
comment on column public.log_entries.photo_path is
  'Object key in the growth log bucket. The image itself never lives in the database.';
comment on column public.log_entries.thumbnail_path is
  'Object key of the 300 px thumbnail, which is what the map card and the timeline load.';
comment on column public.log_entries.captured_at is
  'Timestamp read from the photo EXIF, not the upload time. In the field the upload can happen days later, when there is signal.';
comment on column public.log_entries.capture_location is
  'Where the device was when the photo was taken, kept to cross check against the declared location of the tree.';
comment on column public.log_entries.height_cm is
  'Height in centimetres. Null only when the entry reports the tree as dead.';
comment on column public.log_entries.visible_branches is
  'Branch count the guardian could see, the second quantitative measure behind the growth curve.';
comment on column public.log_entries.on_time is
  'Whether the entry arrived before the tree was due. Derived by a trigger from captured_at so it cannot be reported optimistically by the client.';

create trigger log_entries_touch_updated_at
  before update on public.log_entries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Growth log side effects
-- ---------------------------------------------------------------------------

-- Numbers the entry and judges its punctuality. Both are derived from the tree
-- rather than taken from the client: the cycle has to be gapless and on_time
-- decides a published statistic.
create or replace function public.log_entries_assign_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  due_at timestamptz;
begin
  if new.cycle is null then
    select coalesce(max(entry.cycle), 0) + 1
      into new.cycle
      from public.log_entries entry
     where entry.tree_id = new.tree_id;
  end if;

  if new.cycle = 1 then
    -- The planting entry has nothing to be late for.
    new.on_time := true;
  else
    select tree.next_reminder_at into due_at
      from public.trees tree
     where tree.id = new.tree_id;

    new.on_time := new.captured_at <= due_at;
  end if;

  return new;
end;
$$;

create trigger log_entries_assign_cycle
  before insert on public.log_entries
  for each row execute function public.log_entries_assign_cycle();

-- Everything a new entry changes elsewhere: the tree moves its clock forward,
-- a death propagates to the tree status, and the reminders that were chasing
-- this tree stop chasing it.
create or replace function public.log_entries_apply_to_tree()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.trees tree
     set last_updated_at = greatest(tree.last_updated_at, new.captured_at),
         status = case
           when new.health_status = 'dead' then 'dead'::public.tree_status
           when new.health_status in ('at_risk', 'sick') and tree.status = 'alive'
             then 'at_risk'::public.tree_status
           when new.health_status = 'healthy' and tree.status = 'at_risk'
             then 'alive'::public.tree_status
           else tree.status
         end
   where tree.id = new.tree_id;

  update public.reminders reminder
     set resolved_at = now()
   where reminder.tree_id = new.tree_id
     and reminder.resolved_at is null;

  return null;
end;
$$;

comment on function public.log_entries_apply_to_tree() is
  'Applies a new growth log entry to its tree and closes the reminders that were chasing it.';

-- ---------------------------------------------------------------------------
-- Tracking status
-- ---------------------------------------------------------------------------

-- How close a tree is to its next entry. This depends on now(), so it cannot
-- be a stored generated column the way next_reminder_at can: a stored value
-- would be correct the day it was written and wrong every day after. A view
-- evaluates it at read time, which is the only moment it is asked for.
create view public.tree_tracking
with (security_invoker = on)
as
select
  tree.id as tree_id,
  tree.next_reminder_at,
  case
    when tree.archived_at is not null then 'archived'
    when tree.status = 'dead' then 'dead'
    when tree.next_reminder_at <= now() then 'overdue'
    when tree.next_reminder_at <= now() + interval '15 days' then 'due_soon'
    else 'up_to_date'
  end as tracking_status
from public.trees tree;

comment on view public.tree_tracking is
  'Tracking status of every tree, evaluated at read time because it depends on now().';

-- The reminders table arrives in the next migration; PL/pgSQL resolves names at
-- execution time, and nothing writes a log entry in between.
create trigger log_entries_apply_to_tree
  after insert on public.log_entries
  for each row execute function public.log_entries_apply_to_tree();
