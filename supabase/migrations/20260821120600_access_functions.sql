-- What the clients actually call: one function for the map and a set of views
-- for the admin panel.

-- ---------------------------------------------------------------------------
-- Zone ancestry
-- ---------------------------------------------------------------------------

-- Flattens the catalogue so a tree, which points at a village, can be reported
-- by municipality or by department without every query rewriting the walk up
-- the tree.
create view public.zone_ancestry
with (security_invoker = on)
as
with recursive chain as (
  select
    zone.id as zone_id,
    zone.id as ancestor_id,
    zone.parent_id,
    zone.type,
    zone.name
  from public.zones zone
  union all
  select
    chain.zone_id,
    parent.id,
    parent.parent_id,
    parent.type,
    parent.name
  from chain
  join public.zones parent on parent.id = chain.parent_id
)
select
  zone_id,
  (array_agg(ancestor_id) filter (where type = 'department'))[1] as department_id,
  (array_agg(name) filter (where type = 'department'))[1] as department_name,
  (array_agg(ancestor_id) filter (where type = 'municipality'))[1] as municipality_id,
  (array_agg(name) filter (where type = 'municipality'))[1] as municipality_name,
  (array_agg(ancestor_id) filter (where type = 'village'))[1] as village_id,
  (array_agg(name) filter (where type = 'village'))[1] as village_name
from chain
group by zone_id;

comment on view public.zone_ancestry is
  'Every zone resolved to its department, municipality and village, so reports can group at any level.';

-- Expands a zone filter to the zone and everything under it, which is what
-- lets the map filter by municipality and still match trees registered against
-- one of its villages.
create or replace function public.zone_subtree(zone_ids uuid[])
returns table (zone_id uuid)
language sql
stable
set search_path = ''
as $$
  with recursive down as (
    select zone.id
      from public.zones zone
     where zone.id = any(zone_ids)
    union all
    select child.id
      from down
      join public.zones child on child.parent_id = down.id
  )
  select id from down;
$$;

comment on function public.zone_subtree(uuid[]) is
  'The given zones plus all their descendants, so a municipality filter reaches the trees of its villages.';

-- ---------------------------------------------------------------------------
-- Map viewport
-- ---------------------------------------------------------------------------

-- Everything the map needs to paint one dot, and nothing else. No photograph,
-- no guardian, no measurements: the card is a separate request made when a
-- marker is tapped, so panning the map never pays for data nobody looked at.
--
-- Archived trees are excluded here as well as by the row level policy. The
-- policy is what makes it safe; this clause is what makes it explicit.
create or replace function public.trees_in_viewport(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  zoom integer default 14,
  species_filter uuid[] default null,
  zone_filter uuid[] default null
)
returns table (
  tree_id uuid,
  lng double precision,
  lat double precision,
  tracking_status text,
  species_id uuid,
  species_name text
)
language sql
stable
set search_path = ''
as $$
  select
    tree.id,
    extensions.st_x(tree.location),
    extensions.st_y(tree.location),
    tracking.tracking_status,
    tree.species_id,
    species.canonical_name
  from public.trees tree
  join public.tree_tracking tracking on tracking.tree_id = tree.id
  join public.species species on species.id = tree.species_id
  where tree.archived_at is null
    and extensions.st_intersects(
      tree.location,
      extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
    and (species_filter is null or tree.species_id = any(species_filter))
    and (
      zone_filter is null
      or tree.zone_id in (select zone_id from public.zone_subtree(zone_filter))
    )
  -- Wider views cannot show every dot anyway, so the ceiling drops with the
  -- zoom level. It bounds the payload until the map groups the far out levels
  -- into counted circles.
  limit case
    when zoom < 11 then 250
    when zoom < 15 then 750
    else 1000
  end;
$$;

comment on function public.trees_in_viewport(
  double precision, double precision, double precision, double precision,
  integer, uuid[], uuid[]
) is
  'Trees inside a bounding box, reduced to what a map marker needs. Filters out archived trees and caps the result by zoom level.';

-- ---------------------------------------------------------------------------
-- Reporting
-- ---------------------------------------------------------------------------

-- One row per active tree with everything the panel groups by, so the
-- aggregate views below stay short and always agree with each other.
create view public.tree_overview
with (security_invoker = on)
as
select
  tree.id as tree_id,
  tree.code,
  tree.status,
  tree.planted_at,
  tree.last_updated_at,
  tree.next_reminder_at,
  tree.guardian_id,
  tree.species_id,
  species.canonical_name as species_name,
  species.normalized_key as species_key,
  ancestry.department_id,
  ancestry.department_name,
  ancestry.municipality_id,
  ancestry.municipality_name,
  ancestry.village_id,
  ancestry.village_name,
  tracking.tracking_status,
  entries.follow_up_total,
  entries.on_time_total
from public.trees tree
join public.species species on species.id = tree.species_id
join public.zone_ancestry ancestry on ancestry.zone_id = tree.zone_id
join public.tree_tracking tracking on tracking.tree_id = tree.id
left join lateral (
  -- Cycle 1 is the planting and can never be late, so counting it would only
  -- inflate the punctuality rate.
  select
    count(*) filter (where entry.cycle > 1) as follow_up_total,
    count(*) filter (where entry.cycle > 1 and entry.on_time) as on_time_total
  from public.log_entries entry
  where entry.tree_id = tree.id
    and entry.archived_at is null
) entries on true
where tree.archived_at is null;

comment on view public.tree_overview is
  'Active trees joined to species, zone hierarchy, tracking status and growth log punctuality. The single source the statistics views aggregate.';

create view public.statistics_overview
with (security_invoker = on)
as
select
  count(*) as planted_total,
  count(*) filter (where status in ('alive', 'at_risk')) as alive_total,
  count(*) filter (where status = 'dead') as dead_total,
  count(*) filter (where status = 'replanted') as replanted_total,
  round(
    count(*) filter (where status in ('alive', 'at_risk'))::numeric
      / nullif(count(*), 0) * 100,
    1
  ) as survival_rate,
  round(
    sum(on_time_total)::numeric / nullif(sum(follow_up_total), 0) * 100,
    1
  ) as on_time_rate,
  count(*) filter (where tracking_status = 'overdue') as overdue_total
from public.tree_overview;

comment on view public.statistics_overview is
  'Headline figures of the project: planted, alive, survival rate and update punctuality.';

create view public.statistics_by_municipality
with (security_invoker = on)
as
select
  municipality_id,
  municipality_name,
  department_name,
  count(*) as planted_total,
  count(*) filter (where status in ('alive', 'at_risk')) as alive_total,
  count(*) filter (where status = 'dead') as dead_total,
  round(
    count(*) filter (where status in ('alive', 'at_risk'))::numeric
      / nullif(count(*), 0) * 100,
    1
  ) as survival_rate,
  round(
    sum(on_time_total)::numeric / nullif(sum(follow_up_total), 0) * 100,
    1
  ) as on_time_rate,
  count(*) filter (where tracking_status = 'overdue') as overdue_total
from public.tree_overview
group by municipality_id, municipality_name, department_name;

comment on view public.statistics_by_municipality is
  'Planting figures grouped by municipality, the breakdown the PRAE report opens with.';

create view public.statistics_by_village
with (security_invoker = on)
as
select
  village_id,
  village_name,
  municipality_id,
  municipality_name,
  count(*) as planted_total,
  count(*) filter (where status in ('alive', 'at_risk')) as alive_total,
  count(*) filter (where status = 'dead') as dead_total,
  round(
    count(*) filter (where status in ('alive', 'at_risk'))::numeric
      / nullif(count(*), 0) * 100,
    1
  ) as survival_rate,
  round(
    sum(on_time_total)::numeric / nullif(sum(follow_up_total), 0) * 100,
    1
  ) as on_time_rate,
  count(*) filter (where tracking_status = 'overdue') as overdue_total
from public.tree_overview
group by village_id, village_name, municipality_id, municipality_name;

comment on view public.statistics_by_village is
  'Planting figures grouped by village, the level the guardians recognise.';

-- Grouped by the normalized key and never by the raw text, which is what keeps
-- mandarino, Mandarina and MANDARINOS from counting as three species.
create view public.statistics_by_species
with (security_invoker = on)
as
select
  species_id,
  species_key,
  species_name,
  count(*) as planted_total,
  count(*) filter (where status in ('alive', 'at_risk')) as alive_total,
  count(*) filter (where status = 'dead') as dead_total,
  round(
    count(*) filter (where status in ('alive', 'at_risk'))::numeric
      / nullif(count(*), 0) * 100,
    1
  ) as survival_rate,
  round(
    sum(on_time_total)::numeric / nullif(sum(follow_up_total), 0) * 100,
    1
  ) as on_time_rate
from public.tree_overview
group by species_id, species_key, species_name;

comment on view public.statistics_by_species is
  'Planting figures per species, counted over the normalized key so free text variants do not split a species in two.';

-- Typing mistakes surface here before they reach a report: a species one single
-- guardian ever used is usually a variant of one that already exists.
create view public.species_with_single_occurrence
with (security_invoker = on)
as
select
  species_id,
  species_key,
  species_name,
  count(*) as planted_total
from public.tree_overview
group by species_id, species_key, species_name
having count(*) = 1;

comment on view public.species_with_single_occurrence is
  'Species used by exactly one tree, the shortlist a coordinator reviews before merging variants.';

grant select on public.zone_ancestry to anon, authenticated;
grant select on public.tree_overview to anon, authenticated;
grant select on public.statistics_overview to anon, authenticated;
grant select on public.statistics_by_municipality to anon, authenticated;
grant select on public.statistics_by_village to anon, authenticated;
grant select on public.statistics_by_species to anon, authenticated;
grant select on public.species_with_single_occurrence to authenticated;

grant execute on function public.zone_subtree(uuid[]) to anon, authenticated;
grant execute on function public.trees_in_viewport(
  double precision, double precision, double precision, double precision,
  integer, uuid[], uuid[]
) to anon, authenticated;
