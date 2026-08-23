-- The bimonthly reminder engine: where a guardian's choice about being
-- notified is stored, which trees are owed a nudge right now, and the schedule
-- that asks the Edge Function to send them.
--
-- The tables this reads and writes -- `devices` and `reminders` -- already
-- exist. Nothing here duplicates them, and nothing here re-decides the
-- cadence: `next_reminder_after()` owns that, and every query below reads it
-- through the generated `trees.next_reminder_at`.

-- ---------------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------------

-- A table of its own rather than two columns on `users`.
--
-- The select privilege on `users` is granted column by column, to `anon` as
-- well as to `authenticated`, precisely so the email cannot be reached by any
-- route. Putting a preference there would force a choice between handing it to
-- `anon` and splitting that grant into two audiences, after which every column
-- added to `users` would have to remember which side it belonged on. Here the
-- question is a row check and the table starts out unreachable by `anon`,
-- which is the same posture `devices` and `reminders` already hold.
--
-- Keyed by guardian rather than by installation: turning reminders off means
-- "stop asking me", not "stop asking me on the tablet". Whether one
-- installation can still be reached is `devices.is_active`, which is a
-- delivery fact rather than a choice.
create table public.notification_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  wants_growth_log_reminders boolean not null default true,
  wants_coordinator_notices boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Per guardian choice about being notified. A missing row means both defaults, so nobody has to be backfilled.';
comment on column public.notification_preferences.wants_growth_log_reminders is
  'Whether the bimonthly sweep may reach this guardian. False stops the push; the tree still shows as pending in the app.';
comment on column public.notification_preferences.wants_coordinator_notices is
  'Whether this account receives coordinator traffic. On a coordinator it also gates the copy of the day 21 follow up.';

create trigger notification_preferences_touch_updated_at
  before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

alter table public.notification_preferences enable row level security;

-- Never granted to anon, not even in part.
grant select, insert, update on public.notification_preferences to authenticated;

create policy notification_preferences_own_all on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A coordinator can read who has opted out, which is the difference between a
-- guardian who ignores the reminders and one who never receives them.
create policy notification_preferences_coordinator_read on public.notification_preferences
  for select to authenticated
  using (public.is_coordinator());

-- ---------------------------------------------------------------------------
-- Device registration
-- ---------------------------------------------------------------------------

-- Claims a push token for the signed in guardian.
--
-- This cannot be an ordinary upsert from the client, and the reason is the one
-- case that matters most: a phone that changes hands. The token belongs to the
-- installation, not to the account, so when a second guardian signs in on the
-- same device Expo hands the app the same string. The row for it already
-- exists and belongs to somebody else, which `devices_own_all` will neither let
-- the newcomer update nor let them insert past -- the token is unique. Left
-- there, that row would keep delivering one guardian's reminders to a phone
-- another guardian is now holding.
--
-- So the conflict moves the row rather than rejecting it: the token is
-- reassigned, reactivated and stamped. The previous owner stops receiving on
-- this device the moment the new one signs in, which is the only correct
-- answer, and they keep receiving on any other device they registered because
-- those are rows of their own.
--
-- Security definer for exactly that reassignment, and no wider: the caller is
-- always the new owner, taken from the session rather than from an argument,
-- so this cannot be used to hand somebody else's token to a third party.
create or replace function public.register_device(
  token text,
  device_platform text
)
returns public.devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  saved public.devices;
begin
  if caller is null then
    raise exception 'a push token belongs to a signed in guardian'
      using errcode = '28000';
  end if;

  insert into public.devices (user_id, expo_push_token, platform, is_active, last_seen_at)
  values (caller, token, device_platform, true, now())
  on conflict (expo_push_token) do update
     set user_id = caller,
         platform = excluded.platform,
         is_active = true,
         last_seen_at = now()
  returning * into saved;

  return saved;
end;
$$;

comment on function public.register_device(text, text) is
  'Claims an Expo push token for the caller, moving it off whoever held it before. Security definer so a phone that changes hands cannot leave a token delivering somebody else''s reminders.';

grant execute on function public.register_device(text, text) to authenticated;

-- Stops delivery to this installation, on sign out or when the guardian turns
-- reminders off. The row survives: a deactivated token is how a reinstall on
-- the same phone is told apart from somebody who never registered one.
create or replace function public.retire_device(token text)
returns integer
language sql
volatile
set search_path = ''
as $$
  with retired as (
    update public.devices
       set is_active = false,
           last_seen_at = now()
     where expo_push_token = token
       and user_id = (select auth.uid())
    returning 1
  )
  select coalesce(count(*), 0)::integer from retired;
$$;

comment on function public.retire_device(text) is
  'Deactivates the caller''s own token. Runs as the caller, so it can only silence a device that is theirs.';

grant execute on function public.retire_device(text) to authenticated;

-- ---------------------------------------------------------------------------
-- The escalation ladder
-- ---------------------------------------------------------------------------

-- How many days after the due date each step goes out on.
--
-- This is the database's copy of `REMINDER_OFFSET_DAYS` in packages/core,
-- which builds the same table out of `REMINDER_FOLLOW_UP_DAYS` and
-- `DAYS_UNTIL_OVERDUE`. The two must agree exactly: the sweep decides what to
-- send from this one and the app explains the ladder from that one, so a drift
-- would have the phone describing a schedule the server does not keep.
-- `pnpm test:reminders` compares them step by step, the same arrangement
-- `normalize_species()` and `normalizeSpecies()` already live under.
--
-- The cadence is not restated here. Day zero is `trees.next_reminder_at`,
-- which `next_reminder_after()` generated; these are offsets from it.
create or replace function public.reminder_offset_days(kind public.reminder_kind)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case kind
    when 'cycle' then 0
    when 'follow_up_7d' then 7
    when 'follow_up_21d' then 21
    when 'overdue' then 30
  end;
$$;

comment on function public.reminder_offset_days(public.reminder_kind) is
  'Days after the due date each escalation step fires on. Mirrors REMINDER_OFFSET_DAYS in packages/core; pnpm test:reminders compares them.';

-- ---------------------------------------------------------------------------
-- The sweep
-- ---------------------------------------------------------------------------

-- Every reminder that is owed right now and has not been sent.
--
-- One row per (tree, step), not per tree: a sweep that missed a day has to be
-- able to catch up, and the grouping that turns these into a single
-- notification per guardian happens in the Edge Function rather than here.
--
-- What is excluded, and why each one matters:
--   archived trees        a tree nobody is looking after any more owes nothing
--   dead trees            the growth log is closed; asking for a photograph of
--                         it is the cruellest thing the app could do
--   unassigned trees      there is no guardian to notify
--   archived guardians    the account is gone
--   opted out guardians   the choice is respected at the source, so a push is
--                         never built for somebody who said no
--   steps already sent    `reminders` already holds (tree, cycle, kind), and
--                         that unique key is the idempotency guarantee this
--                         query leans on rather than reimplementing
--
-- Security definer because the caller is the service role acting for every
-- guardian at once, and because it reads `users` and `notification_preferences`
-- across rows no single caller owns. Execute is granted to service_role only.
create or replace function public.due_reminders()
returns table (
  tree_id uuid,
  code text,
  species_name text,
  village_name text,
  guardian_id uuid,
  guardian_name text,
  cycle integer,
  kind public.reminder_kind,
  due_at timestamptz,
  scheduled_for timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with candidate as (
    select
      tree.id as tree_id,
      tree.code,
      species.canonical_name as species_name,
      ancestry.village_name,
      tree.guardian_id,
      guardian.full_name as guardian_name,
      -- The cycle being asked for is the next one, exactly as the growth log
      -- screen computes it. The planting record is cycle 1, so a tree with no
      -- entry at all is waiting on its first rather than on a zeroth.
      coalesce(latest.cycle, 0) + 1 as cycle,
      tree.next_reminder_at as due_at
    from public.trees tree
    join public.users guardian on guardian.id = tree.guardian_id
    join public.species species on species.id = tree.species_id
    left join public.zone_ancestry ancestry on ancestry.zone_id = tree.zone_id
    left join public.notification_preferences preference
      on preference.user_id = tree.guardian_id
    left join lateral (
      select entry.cycle
      from public.log_entries entry
      where entry.tree_id = tree.id
        and entry.archived_at is null
      order by entry.cycle desc
      limit 1
    ) latest on true
    where tree.archived_at is null
      and tree.status <> 'dead'
      and tree.guardian_id is not null
      and guardian.archived_at is null
      -- Absent row means the defaults, which is what lets the preference exist
      -- without backfilling everybody who signed up before it did.
      and coalesce(preference.wants_growth_log_reminders, true)
      and tree.next_reminder_at <= now()
  )
  select
    candidate.tree_id,
    candidate.code,
    candidate.species_name,
    candidate.village_name,
    candidate.guardian_id,
    candidate.guardian_name,
    candidate.cycle,
    step.kind,
    candidate.due_at,
    candidate.due_at + make_interval(days => public.reminder_offset_days(step.kind))
  from candidate
  cross join unnest(enum_range(null::public.reminder_kind)) as step(kind)
  where candidate.due_at + make_interval(days => public.reminder_offset_days(step.kind)) <= now()
    and not exists (
      select 1
      from public.reminders sent
      where sent.tree_id = candidate.tree_id
        and sent.cycle = candidate.cycle
        and sent.kind = step.kind
    )
  order by candidate.guardian_id, candidate.due_at, public.reminder_offset_days(step.kind);
$$;

comment on function public.due_reminders() is
  'Every reminder owed right now and not yet sent, one row per tree and step. Archived, dead, unassigned and opted out trees never appear.';

-- Who receives the copy of the day 21 follow up.
--
-- The copy is not recorded in `reminders`: that table is keyed by
-- (tree, cycle, kind) and the guardian's own row already occupies it. Which is
-- the right shape rather than a limitation -- the guardian's row is what makes
-- the whole step idempotent, so once it exists neither the nudge nor its copy
-- goes out again.
create or replace function public.reminder_coordinators()
returns table (
  user_id uuid,
  full_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select account.id, account.full_name
  from public.users account
  left join public.notification_preferences preference on preference.user_id = account.id
  where account.role = 'coordinator'
    and account.archived_at is null
    and coalesce(preference.wants_coordinator_notices, true);
$$;

comment on function public.reminder_coordinators() is
  'Coordinators who accept notices, for the copy of the day 21 follow up. The copy has no reminders row: the guardian''s row already guards the step.';

-- What the sweep touches directly, and nothing else.
--
-- `service_role` bypasses RLS but it does not bypass the grant, and this schema
-- hands out privileges one table at a time rather than leaning on a default.
-- So the sweep is given exactly the two verbs it uses on each table: it reads
-- the tokens it is about to send to and retires the dead ones, and it writes
-- the record of what went out. It is not given delete on either, because it
-- never removes a device or a reminder -- a token that stopped working is
-- deactivated, not erased.
grant select, update on public.devices to service_role;
grant select, insert on public.reminders to service_role;

revoke execute on function public.due_reminders() from public, anon, authenticated;
revoke execute on function public.reminder_coordinators() from public, anon, authenticated;
grant execute on function public.due_reminders() to service_role;
grant execute on function public.reminder_coordinators() to service_role;

-- ---------------------------------------------------------------------------
-- The history the activity tab reads
-- ---------------------------------------------------------------------------

-- The reminders addressed to the signed in guardian, newest first.
--
-- `reminders` is already readable by its own guardian under
-- `reminders_select_own`, so this adds no reach; it exists to carry the tree's
-- species and code alongside, which the row itself does not hold and which the
-- feed would otherwise fetch tree by tree.
--
-- Not security definer, and deliberately: it runs as the caller and the policy
-- decides, which is the same arrangement `guardian_trees()` uses.
create or replace function public.reminder_feed(history_limit integer default 40)
returns table (
  reminder_id uuid,
  tree_id uuid,
  species_name text,
  code text,
  kind public.reminder_kind,
  cycle integer,
  sent_at timestamptz,
  opened_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    reminder.id,
    reminder.tree_id,
    species.canonical_name,
    tree.code,
    reminder.kind,
    reminder.cycle,
    reminder.sent_at,
    reminder.opened_at,
    reminder.resolved_at
  from public.reminders reminder
  join public.trees tree on tree.id = reminder.tree_id
  join public.species species on species.id = tree.species_id
  where reminder.user_id = (select auth.uid())
  order by reminder.sent_at desc
  limit least(greatest(coalesce(history_limit, 40), 1), 200);
$$;

comment on function public.reminder_feed(integer) is
  'Reminders sent to the signed in guardian with the tree named, for the activity tab. Runs as the caller: the reminders policy decides what comes back.';

grant execute on function public.reminder_feed(integer) to authenticated;

-- Marks a reminder as opened. The client knows it was tapped; nothing else
-- does, and `opened_at` is the number that says whether the cadence works.
create or replace function public.mark_reminder_opened(target_tree_id uuid, target_cycle integer)
returns integer
language sql
volatile
set search_path = ''
as $$
  update public.reminders
     set opened_at = now()
   where tree_id = target_tree_id
     and cycle = target_cycle
     and user_id = (select auth.uid())
     and opened_at is null
  returning 1;
$$;

comment on function public.mark_reminder_opened(uuid, integer) is
  'Stamps opened_at on the reminders of one cycle when the guardian arrives through the notification. Runs as the caller, so it can only touch their own.';

grant execute on function public.mark_reminder_opened(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- The schedule
-- ---------------------------------------------------------------------------

-- Asks the Edge Function to run the sweep.
--
-- The URL and the key are read from database settings rather than written
-- here: a versioned migration must not carry a service role key, and the same
-- migration has to apply against the local stack and the hosted project, which
-- do not share a hostname. `supabase/README.md` says how they are set.
--
-- Returns the pg_net request id so a missed run can be traced back through
-- `net._http_response`.
create or replace function public.run_reminder_sweep()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint text := nullif(current_setting('app.reminder_sweep_url', true), '');
  service_key text := nullif(current_setting('app.reminder_sweep_key', true), '');
  request_id bigint;
begin
  if endpoint is null or service_key is null then
    -- A warning rather than an exception. The sweep having nowhere to call is
    -- a deployment gap, and raising would leave a failed pg_cron entry every
    -- morning that says nothing more than this line does.
    raise warning 'reminder sweep not dispatched: app.reminder_sweep_url or app.reminder_sweep_key is unset';
    return null;
  end if;

  select extensions.net.http_post(
    url := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('trigger', 'cron'),
    timeout_milliseconds := 60000
  ) into request_id;

  return request_id;
end;
$$;

comment on function public.run_reminder_sweep() is
  'Calls the reminder-sweep Edge Function over pg_net. Reads its endpoint and key from database settings so no key lives in a migration.';

revoke execute on function public.run_reminder_sweep() from public, anon, authenticated;
grant execute on function public.run_reminder_sweep() to service_role;

-- 08:00 in Colombia, every day.
--
-- pg_cron expressions carry no zone of their own -- it schedules in UTC -- so
-- the hour is written as the UTC one that lands on 08:00 there. The zone is
-- not restated here: `next_reminder_after()` is the only place in this schema
-- that names it, and `pnpm test:reminders` reads this schedule back and checks
-- that 13:00 UTC really is `REMINDER_DISPATCH_HOUR` in `REMINDER_TIME_ZONE`,
-- so the two cannot drift without a test going red.
--
-- Colombia has no daylight saving, which is why one fixed UTC hour is correct
-- all year and not just for half of it.
select cron.unschedule('reminder-sweep')
  where exists (select 1 from cron.job where jobname = 'reminder-sweep');

select cron.schedule(
  'reminder-sweep',
  '0 13 * * *',
  $cron$select public.run_reminder_sweep();$cron$
);
