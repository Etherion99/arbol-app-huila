-- Row level security for every table in the schema. A table without policies
-- is not finished, so this migration enables RLS on all of them and none is
-- left with an empty policy set.
--
-- Three audiences:
--   anon          reads trees, growth log, species and zones that are not archived
--   authenticated everything above, plus writes on its own trees and entries
--   coordinator   full access, including archiving and merging species
--
-- Nobody gets a delete policy. Records are never deleted, they are archived;
-- the physical deletion reserved for inappropriate content and for data
-- suppression requests runs through service_role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Reads the caller's stored role. Security definer on purpose: a policy on
-- public.users that queried public.users through RLS would recurse.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select account.role
    from public.users account
   where account.id = (select auth.uid())
     and account.archived_at is null;
$$;

comment on function public.current_user_role() is
  'Stored role of the caller, read outside RLS so the policies on public.users do not recurse.';

create or replace function public.is_coordinator()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_user_role() = 'coordinator';
$$;

comment on function public.is_coordinator() is
  'True when the caller is a coordinator. Used by every policy that grants full access.';

-- Ownership check used by the growth log policies and by the storage policies,
-- where the object name is all there is to go on.
create or replace function public.owns_tree(target_tree_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.trees tree
     where tree.id = target_tree_id
       and tree.guardian_id = (select auth.uid())
       and tree.archived_at is null
  );
$$;

comment on function public.owns_tree(uuid) is
  'True when the caller is the guardian of a non archived tree. Security definer so it can answer before the caller has been allowed to read the row.';

-- ---------------------------------------------------------------------------
-- Public projections
-- ---------------------------------------------------------------------------

-- What anyone may know about a guardian. The email is not here, and it is not
-- granted on the table either, so no public query can reach it by any route.
create view public.public_users
with (security_invoker = on)
as
select
  account.id,
  account.full_name,
  account.role,
  account.institution,
  account.created_at
from public.users account
where account.archived_at is null;

comment on view public.public_users is
  'Guardian identity as shown on a tree card. Deliberately without email: no public endpoint exposes a guardian email.';

-- The coordinator does need the emails, to contact a guardian who stopped
-- updating. This view runs as its owner so it can see the column the caller
-- has no privilege on, and gates that with an explicit role check.
create view public.user_directory as
select
  account.id,
  account.full_name,
  account.email,
  account.role,
  account.institution,
  account.is_adult_confirmed,
  account.terms_accepted_at,
  account.created_at,
  account.archived_at,
  account.archive_reason
from public.users account
where public.is_coordinator() or account.id = (select auth.uid());

comment on view public.user_directory is
  'Full profile including email, restricted to coordinators and to the caller''s own row.';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

-- Column level select on users is the hard stop for the email: neither anon nor
-- authenticated holds a privilege on that column, so it cannot be reached even
-- with a hand written query. Writes are granted at table level and constrained
-- by the policies below.
grant select (id, full_name, role, institution, created_at, updated_at, archived_at)
  on public.users to anon, authenticated;
grant insert, update on public.users to authenticated;

grant select on public.zones to anon, authenticated;
grant insert, update on public.zones to authenticated;

grant select on public.species to anon, authenticated;
grant insert, update on public.species to authenticated;

grant select, insert, update on public.species_merges to authenticated;

grant select on public.trees to anon, authenticated;
grant insert, update on public.trees to authenticated;

grant select on public.log_entries to anon, authenticated;
grant insert, update on public.log_entries to authenticated;

-- devices and reminders are never readable by anon, not even in part.
grant select, insert, update on public.devices to authenticated;
grant select, insert, update on public.reminders to authenticated;

grant select on public.tree_tracking to anon, authenticated;
grant select on public.public_users to anon, authenticated;
grant select on public.user_directory to authenticated;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;

create policy users_select_active on public.users
  for select to anon, authenticated
  using (archived_at is null or public.is_coordinator());

create policy users_insert_own_profile on public.users
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and role = 'guardian'
    and archived_at is null
  );

-- A guardian may fix their own profile but cannot promote themselves: the new
-- role has to match the one already stored.
create policy users_update_own_profile on public.users
  for update to authenticated
  using (id = (select auth.uid()) and archived_at is null)
  with check (
    id = (select auth.uid())
    and role = public.current_user_role()
    and archived_at is null
  );

create policy users_coordinator_all on public.users
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

-- ---------------------------------------------------------------------------
-- zones
-- ---------------------------------------------------------------------------

alter table public.zones enable row level security;

create policy zones_select_active on public.zones
  for select to anon, authenticated
  using (archived_at is null or public.is_coordinator());

create policy zones_coordinator_all on public.zones
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

-- ---------------------------------------------------------------------------
-- species
-- ---------------------------------------------------------------------------

alter table public.species enable row level security;

create policy species_select_active on public.species
  for select to anon, authenticated
  using (archived_at is null or public.is_coordinator());

-- A guardian naming a species nobody has used before has to be able to create
-- it, or the tree registration would fail on a species that is simply new.
-- Creating it is all they can do: it starts unarchived and unmerged, and
-- editing or merging is the coordinator's.
create policy species_insert_authenticated on public.species
  for insert to authenticated
  with check (archived_at is null and merged_into_id is null);

create policy species_coordinator_all on public.species
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

-- ---------------------------------------------------------------------------
-- species_merges
-- ---------------------------------------------------------------------------

alter table public.species_merges enable row level security;

-- The merge log is an administrative audit trail, not public information.
create policy species_merges_coordinator_all on public.species_merges
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator() and performed_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- trees
-- ---------------------------------------------------------------------------

alter table public.trees enable row level security;

create policy trees_select_active on public.trees
  for select to anon, authenticated
  using (archived_at is null or public.is_coordinator());

create policy trees_insert_own on public.trees
  for insert to authenticated
  with check (guardian_id = (select auth.uid()) and archived_at is null);

-- The with check clause is what stops a guardian from archiving a tree or from
-- signing someone else's name to it; the using clause is what stops them from
-- touching a tree that is not theirs.
create policy trees_update_own on public.trees
  for update to authenticated
  using (guardian_id = (select auth.uid()) and archived_at is null)
  with check (guardian_id = (select auth.uid()) and archived_at is null);

create policy trees_coordinator_all on public.trees
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

-- ---------------------------------------------------------------------------
-- log_entries
-- ---------------------------------------------------------------------------

alter table public.log_entries enable row level security;

create policy log_entries_select_active on public.log_entries
  for select to anon, authenticated
  using (archived_at is null or public.is_coordinator());

create policy log_entries_insert_own_tree on public.log_entries
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.owns_tree(tree_id)
    and archived_at is null
  );

create policy log_entries_update_own on public.log_entries
  for update to authenticated
  using (author_id = (select auth.uid()) and archived_at is null)
  with check (author_id = (select auth.uid()) and archived_at is null);

create policy log_entries_coordinator_all on public.log_entries
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------

alter table public.devices enable row level security;

create policy devices_own_all on public.devices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy devices_coordinator_all on public.devices
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------

alter table public.reminders enable row level security;

-- A guardian sees the reminders addressed to them and may mark one as opened.
-- Sending them is the cron's job, which runs as service_role.
create policy reminders_select_own on public.reminders
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy reminders_update_own on public.reminders
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy reminders_coordinator_all on public.reminders
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());
