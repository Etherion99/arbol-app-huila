-- Tables the bimonthly reminder engine will run on. The engine itself is built
-- later; what it needs to be idempotent and auditable is defined here.

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  expo_push_token text not null,
  platform text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_platform_known check (platform in ('android', 'ios')),
  constraint devices_token_not_blank check (btrim(expo_push_token) <> '')
);

-- A push token identifies one installation. If it reappears it belongs to the
-- same device, so the row is updated rather than duplicated.
create unique index devices_expo_push_token_key on public.devices (expo_push_token);

create index devices_user_idx on public.devices (user_id) where is_active;

comment on table public.devices is
  'Expo push token per installation. A guardian with a phone and a tablet has two rows, and a notification goes to both.';
comment on column public.devices.expo_push_token is
  'Token issued by Expo. Rotates on reinstall, which is why it is unique rather than a primary key.';
comment on column public.devices.is_active is
  'Cleared when Expo reports the token as no longer deliverable, so the sweep stops paying for pushes that go nowhere.';
comment on column public.devices.last_seen_at is
  'Last time the app confirmed this token. Lets a stale installation be told apart from an uninstalled one.';

create trigger devices_touch_updated_at
  before update on public.devices
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  kind public.reminder_kind not null,
  cycle integer not null,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reminders_cycle_positive check (cycle >= 1)
);

-- The whole point of this table. A retried cron run inserts the same
-- (tree, cycle, kind) and is rejected, so a guardian is never notified twice
-- for the same thing.
create unique index reminders_tree_cycle_kind_key
  on public.reminders (tree_id, cycle, kind);

create index reminders_open_by_user_idx on public.reminders (user_id, sent_at desc)
  where resolved_at is null;
create index reminders_open_by_tree_idx on public.reminders (tree_id)
  where resolved_at is null;

comment on table public.reminders is
  'One row per reminder actually sent. Its unique key is what makes the cron idempotent: a retry cannot duplicate a notification.';
comment on column public.reminders.cycle is
  'Growth log cycle this reminder is asking for. Part of the unique key, so the same escalation can repeat for the next cycle but never for this one.';
comment on column public.reminders.kind is
  'Which step of the escalation this is: the bimonthly nudge, one of the two follow ups, or the notice that the tree is now overdue.';
comment on column public.reminders.sent_at is
  'When it went out. Not nullable, because the row exists only because it was sent.';
comment on column public.reminders.opened_at is
  'When the guardian tapped the notification. Null means it was delivered but ignored, which is the number that says whether the cadence works.';
comment on column public.reminders.resolved_at is
  'Set by the growth log trigger when an entry for this tree arrives, whether or not the guardian came in through the notification.';
