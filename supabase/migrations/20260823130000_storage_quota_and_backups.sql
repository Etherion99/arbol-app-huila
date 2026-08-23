-- Watching the storage allowance, and saying something before it runs out.
--
-- The free plan gives one gigabyte for the whole year. At roughly 200 KB a
-- photograph plus a 300 px thumbnail, and around 1.800 photographs a year, the
-- project fits -- with enough margin that the failure mode is not "we ran out"
-- but "nobody noticed we were going to". A bucket that fills in October takes
-- the growth log with it: uploads start failing, and the guardians who walked
-- to their trees that week are the ones who lose the visit.
--
-- So this measures what is actually stored, compares it with the allowance, and
-- raises a row when the ratio crosses a threshold. Seventy per cent is chosen
-- so there is a whole quarter left to act in: buy the next plan tier, prune the
-- archive, or lower the photograph budget.
--
-- **The alert is a row, not an email.** This project has no mail service of its
-- own and the free plan's is for authentication. A row that the panel reads and
-- the cron cannot duplicate is something a coordinator sees on the screen they
-- already open; an email would be a second system to keep alive.

-- ---------------------------------------------------------------------------
-- What is actually stored
-- ---------------------------------------------------------------------------

-- Bytes held in the growth log bucket, and what fraction of the allowance that
-- is.
--
-- Read from `storage.objects.metadata`, which is where Storage records the size
-- it accepted. Security definer because `storage.objects` is not readable by a
-- coordinator through the API and should not become so: this returns three
-- numbers and no object names.
create or replace function public.storage_usage()
returns table (
  bytes_used bigint,
  bytes_quota bigint,
  object_count bigint,
  used_ratio numeric
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  quota bigint := 1024::bigint * 1024 * 1024;
  used bigint;
  objects bigint;
begin
  if not public.is_coordinator() then
    raise exception 'only a coordinator can read the storage usage' using errcode = '42501';
  end if;

  select coalesce(sum((object.metadata->>'size')::bigint), 0), count(*)
    into used, objects
    from storage.objects object
   where object.bucket_id = 'growth-log-photos';

  return query select used, quota, objects, round(used::numeric / quota, 4);
end;
$fn$;

comment on function public.storage_usage() is
  'Bytes held in the growth log bucket against the one gigabyte allowance. Coordinator only, and it returns figures rather than object names.';

-- ---------------------------------------------------------------------------
-- Alerts
-- ---------------------------------------------------------------------------

create type public.system_alert_kind as enum ('storage_quota');

create table public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  kind public.system_alert_kind not null,
  -- The threshold that was crossed, as a percentage: 70, 85, 95. Part of the
  -- key, so crossing 70 in June and 85 in September are two different alerts
  -- and neither is raised twice.
  threshold_percent smallint not null,
  detail jsonb not null default '{}'::jsonb,
  raised_at timestamptz not null default now(),
  acknowledged_by uuid references public.users (id),
  acknowledged_at timestamptz,
  constraint system_alerts_acknowledgement_together check (
    (acknowledged_by is null) = (acknowledged_at is null)
  )
);

-- What makes the daily sweep idempotent. The cron may run every morning for a
-- year; a threshold once crossed produces one row, and the coordinator is not
-- shown three hundred and sixty five copies of the same warning.
create unique index system_alerts_kind_threshold_key
  on public.system_alerts (kind, threshold_percent);

comment on table public.system_alerts is
  'Something about the platform itself that a coordinator has to know. One row per threshold crossed, ever, which is what lets a daily cron raise it without duplicating.';

alter table public.system_alerts enable row level security;

create policy system_alerts_coordinator_all on public.system_alerts
  for all
  using (public.is_coordinator())
  with check (public.is_coordinator());

grant select, update on public.system_alerts to authenticated;

-- ---------------------------------------------------------------------------
-- The sweep
-- ---------------------------------------------------------------------------

-- The thresholds, ascending. 70 is the one the phase asks for; the two above it
-- exist because an alert nobody acted on in July should say something louder in
-- September rather than nothing at all.
create or replace function public.storage_alert_thresholds()
returns smallint[]
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select array[70, 85, 95]::smallint[];
$fn$;

-- Raises whatever the current usage has crossed and has not been raised before.
--
-- Runs as the cron, which has no session, so the coordinator check inside
-- `storage_usage()` cannot be used -- the count is taken directly here. It is
-- `security definer` for the same reason that function is: `storage.objects`
-- is not otherwise reachable.
--
-- Returns the number of alerts it raised, which for a healthy project is zero
-- every day for a year.
create or replace function public.check_storage_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  quota bigint := 1024::bigint * 1024 * 1024;
  used bigint;
  objects bigint;
  percent numeric;
  threshold smallint;
  raised integer := 0;
begin
  select coalesce(sum((object.metadata->>'size')::bigint), 0), count(*)
    into used, objects
    from storage.objects object
   where object.bucket_id = 'growth-log-photos';

  percent := round(used::numeric * 100 / quota, 2);

  foreach threshold in array public.storage_alert_thresholds() loop
    if percent >= threshold then
      insert into public.system_alerts (kind, threshold_percent, detail)
      values (
        'storage_quota',
        threshold,
        jsonb_build_object(
          'bytesUsed', used,
          'bytesQuota', quota,
          'objectCount', objects,
          'usedPercent', percent
        )
      )
      -- The whole idempotency of the daily run, in one clause.
      on conflict (kind, threshold_percent) do nothing;

      if found then
        raised := raised + 1;
        -- "percent" spelled out rather than a `%` sign: in a format string `%%`
        -- is the literal and `%` is the placeholder, and getting the two the
        -- wrong way round prints `%74.51` instead of `74.51%`.
        raise warning 'storage is at % percent of the allowance (% of % bytes)',
          percent, used, quota;
      end if;
    end if;
  end loop;

  return raised;
end;
$fn$;

comment on function public.check_storage_quota() is
  'Raises a system alert the first time storage crosses each threshold. Safe to run every day forever: the unique index on (kind, threshold_percent) is what makes it idempotent.';

grant execute on function public.storage_usage() to authenticated;
grant execute on function public.storage_alert_thresholds() to authenticated;

-- Daily, half an hour after the reminder sweep, so the two never contend for
-- the same connection. 08:30 in Colombia is 13:30 UTC, and `pg_cron` schedules
-- in UTC with no zone of its own -- the same arrangement, and the same single
-- documented exception, as `run_reminder_sweep`.
select cron.schedule('storage-quota-check', '30 13 * * *', $cron$
  select public.check_storage_quota();
$cron$);

-- ---------------------------------------------------------------------------
-- Backups
-- ---------------------------------------------------------------------------

-- There is no migration that can make a backup happen, and pretending otherwise
-- would be worse than saying so. What a backup needs is a machine that is not
-- this one, running on a schedule this database does not control, holding the
-- result somewhere the project would still have if the Supabase account were
-- lost. That is `.github/workflows/backup.yml` and the runbook in
-- `supabase/README.md`, and neither can be verified until the cloud project
-- exists.
--
-- What *is* here is the one thing the database can contribute: a function that
-- says whether a backup was recorded recently, so a backup that silently stops
-- running is visible from the panel instead of being discovered the day it is
-- needed.

create table public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz,
  -- Bytes of the dump and of the photographs, so a run that "succeeded" while
  -- copying nothing is not mistaken for a good one.
  database_bytes bigint,
  storage_bytes bigint,
  object_count bigint,
  error text,
  created_at timestamptz not null default now()
);

create index backup_runs_recent_idx on public.backup_runs (started_at desc);

comment on table public.backup_runs is
  'One row per backup attempt, written by the scheduled job outside this database. Its purpose is to make a backup that stopped running visible before it is needed.';

alter table public.backup_runs enable row level security;

create policy backup_runs_coordinator_read on public.backup_runs
  for select
  using (public.is_coordinator());

grant select on public.backup_runs to authenticated;

-- How the panel asks "is the backup still happening".
--
-- A day and a half rather than a day: a job that runs at 03:00 and is queued
-- behind a slow runner must not be reported as broken at 03:05 the next
-- morning. Two consecutive missed runs is a real failure and this catches it.
create or replace function public.backup_health()
returns table (
  last_success_at timestamptz,
  hours_since_success numeric,
  is_stale boolean,
  last_error text
)
language sql
stable
set search_path = ''
as $fn$
  select
    success.started_at,
    round(extract(epoch from (now() - success.started_at)) / 3600, 1),
    success.started_at is null or now() - success.started_at > interval '36 hours',
    latest.error
  from (
    select run.started_at
      from public.backup_runs run
     where run.finished_at is not null and run.error is null
     order by run.started_at desc
     limit 1
  ) success
  full outer join (
    select run.error
      from public.backup_runs run
     order by run.started_at desc
     limit 1
  ) latest on true;
$fn$;

comment on function public.backup_health() is
  'Whether a backup has completed recently, for the panel. Stale after 36 hours, which is two missed daily runs rather than one late one.';

grant execute on function public.backup_health() to authenticated;
