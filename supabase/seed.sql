-- Test data for local development: the zone catalogue of La Plata, a
-- coordinator, six guardians and two hundred trees with their growth log.
--
-- The dates are relative to now(), so a reset always produces trees that are
-- up to date, trees about to fall due and trees already overdue, no matter
-- when it runs. The species are written the way guardians actually write them,
-- with the case, accent and plural variants that the normalized key exists to
-- collapse.
--
-- Everyone signs in with the password arbolapp2026.

begin;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create temporary table seed_people (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  institution text
);

insert into seed_people (id, email, full_name, role, institution) values
  ('11111111-1111-4111-8111-000000000001', 'coordinacion@iesansebastian.edu.co',
   'Marta Lucía Ortiz Bonilla', 'coordinator', 'I.E. San Sebastián'),
  ('11111111-1111-4111-8111-000000000002', 'andres.cabrera@iesansebastian.edu.co',
   'Andrés Felipe Cabrera Ruiz', 'guardian', 'I.E. San Sebastián'),
  ('11111111-1111-4111-8111-000000000003', 'yulieth.perdomo@iesansebastian.edu.co',
   'Yulieth Perdomo Ramírez', 'guardian', 'I.E. San Sebastián'),
  ('11111111-1111-4111-8111-000000000004', 'jhon.munoz@iesansebastian.edu.co',
   'Jhon Fredy Muñoz Chaux', 'guardian', 'I.E. San Sebastián'),
  ('11111111-1111-4111-8111-000000000005', 'diana.losada@iesansebastian.edu.co',
   'Diana Carolina Losada Vargas', 'guardian', 'Junta de Acción Comunal'),
  ('11111111-1111-4111-8111-000000000006', 'wilmer.trujillo@iesansebastian.edu.co',
   'Wilmer Trujillo Gasca', 'guardian', 'I.E. San Sebastián'),
  ('11111111-1111-4111-8111-000000000007', 'luz.chavarro@iesansebastian.edu.co',
   'Luz Dary Chavarro Solano', 'guardian', 'UMATA La Plata');

-- The login identities. Written straight into the auth schema so a local
-- session can be opened with a real token and the policies can be exercised
-- the way a client would hit them.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  -- Auth reads these into plain strings and refuses to scan a null, so a row
  -- written by hand has to spell out the empty tokens the sign up flow would
  -- have left behind.
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  person.id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  person.email,
  extensions.crypt('arbolapp2026', extensions.gen_salt('bf')),
  now() - interval '6 months',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', person.full_name),
  now() - interval '6 months',
  now() - interval '6 months',
  '', '', '', '', '', '', '', ''
from seed_people person;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  person.id::text,
  person.id,
  jsonb_build_object('sub', person.id::text, 'email', person.email, 'email_verified', true),
  'email',
  now() - interval '6 months',
  now() - interval '6 months',
  now() - interval '6 months'
from seed_people person;

insert into public.users (
  id, full_name, email, role, institution, is_adult_confirmed, terms_accepted_at, created_at
)
select
  person.id,
  person.full_name,
  person.email,
  person.role,
  person.institution,
  true,
  now() - interval '6 months',
  now() - interval '6 months'
from seed_people person;

-- ---------------------------------------------------------------------------
-- Zones
-- ---------------------------------------------------------------------------

insert into public.zones (id, parent_id, type, name, slug, divipola_code, centroid, suggested_zoom)
values (
  '22222222-2222-4222-8222-000000000001', null, 'department', 'Huila', 'huila', '41',
  extensions.st_setsrid(extensions.st_makepoint(-75.5500, 2.5500), 4326), 8
);

insert into public.zones (id, parent_id, type, name, slug, divipola_code, centroid, suggested_zoom)
values (
  '22222222-2222-4222-8222-000000000002', '22222222-2222-4222-8222-000000000001',
  'municipality', 'La Plata', 'la-plata', '41396',
  extensions.st_setsrid(extensions.st_makepoint(-75.8916, 2.3936), 4326), 12
);

-- Villages of La Plata. The geometry column stays empty: the outlines do not
-- exist yet, so the map frames a zone from its centroid and suggested zoom.
insert into public.zones (parent_id, type, name, slug, centroid, suggested_zoom)
select
  '22222222-2222-4222-8222-000000000002',
  'village',
  village.name,
  village.slug,
  extensions.st_setsrid(extensions.st_makepoint(village.lng, village.lat), 4326),
  14
from (values
  ('Belén', 'belen', -75.9350, 2.4200),
  ('Getsemaní', 'getsemani', -75.8500, 2.4450),
  ('Monserrate', 'monserrate', -75.9600, 2.3600),
  ('San Andrés', 'san-andres', -75.8200, 2.3450),
  ('Villa Losada', 'villa-losada', -75.9100, 2.4600),
  ('El Vergel', 'el-vergel', -75.8700, 2.3200),
  ('Guacamayas', 'guacamayas', -75.9800, 2.4100),
  ('La Candelaria', 'la-candelaria', -75.8350, 2.4000),
  ('Buenavista', 'buenavista', -75.9450, 2.3300),
  ('El Carmen', 'el-carmen', -75.8850, 2.4750)
) as village(name, slug, lng, lat);

-- ---------------------------------------------------------------------------
-- Species
-- ---------------------------------------------------------------------------

-- One row per normalized key. Several of these are variants of each other and
-- are left unmerged on purpose: merging them is what the admin panel is for,
-- and a pre-merged catalogue would leave nothing to exercise.
insert into public.species (normalized_key, canonical_name) values
  ('mandarino', 'Mandarino'),
  ('mandarina', 'Mandarina'),
  ('limon', 'Limón'),
  ('limon tahiti', 'Limón Tahití'),
  ('limone', 'Limones'),
  ('naranjo', 'Naranjo'),
  ('naranja', 'Naranja'),
  ('aguacate', 'Aguacate'),
  ('aguacate has', 'Aguacate Hass'),
  ('guayabo', 'Guayabo'),
  ('guayaba', 'Guayaba'),
  ('mango', 'Mango'),
  ('lulo', 'Lulo'),
  ('granadilla', 'Granadilla'),
  ('chirimoya', 'Chirimoya'),
  ('papayo', 'Papayo'),
  ('papaya', 'Papaya');

-- ---------------------------------------------------------------------------
-- Planting plan
-- ---------------------------------------------------------------------------

-- Every derived value for the two hundred trees, worked out once so the tree
-- row, its planting date and each of its log entries cannot disagree.
create temporary table seed_plan as
with catalog as (
  select
    (select array_agg(zone.id order by zone.slug)
       from public.zones zone
      where zone.type = 'village') as villages,
    (select array_agg(account.id order by account.email)
       from public.users account
      where account.role = 'guardian') as guardians,
    -- The same species written the way six different people would write it.
    array[
      'mandarino', 'Mandarina', 'MANDARINOS', 'mandarinos', 'Mandarino',
      'limón', 'Limón Tahití', 'LIMONES', 'limon', 'Limón',
      'naranjo', 'Naranja', 'NARANJOS', 'naranjos',
      'aguacate', 'Aguacates', 'aguacate hass', 'Aguacate Hass',
      'guayabo', 'Guayaba', 'guayabos',
      'mango', 'Mangos', 'MANGO',
      'lulo', 'Lulos', 'granadilla', 'Granadillas',
      'chirimoya', 'Chirimoyas', 'papayo', 'Papaya', 'Papayos', 'mandarino '
    ]::text[] as variants
)
select
  serial_number,
  'HUI-LP-' || lpad(serial_number::text, 4, '0') as code,
  catalog.villages[1 + (serial_number % array_length(catalog.villages, 1))] as zone_id,
  catalog.guardians[1 + (serial_number % array_length(catalog.guardians, 1))] as guardian_id,
  catalog.variants[1 + ((serial_number * 7) % array_length(catalog.variants, 1))] as raw_text,
  -- Days since the most recent entry. Split so that some trees are inside the
  -- cycle, some are about to fall due and the rest are already late. Taken
  -- modulo seven rather than modulo ten, because the village is chosen modulo
  -- ten and the two have to be independent: otherwise every overdue tree would
  -- land in the same handful of villages.
  case
    when (serial_number * 3) % 7 < 3 then 3 + (serial_number * 7) % 42
    when (serial_number * 3) % 7 < 5 then 48 + (serial_number * 3) % 12
    else 70 + (serial_number * 11) % 200
  end as last_offset_days,
  1 + (serial_number * 5) % 4 as cycle_count,
  -- Some guardians came back before the two months were up and some after,
  -- which is what gives the punctuality rate something to measure.
  45 + (serial_number * 13) % 34 as cycle_gap_days
from generate_series(1, 200) as serial_number
cross join catalog;

-- ---------------------------------------------------------------------------
-- Trees
-- ---------------------------------------------------------------------------

insert into public.trees (
  code, guardian_id, species_id, species_raw_text, location, zone_id,
  planted_at, last_updated_at
)
select
  plan.code,
  plan.guardian_id,
  species.id,
  plan.raw_text,
  -- Scattered up to roughly two kilometres around the centre of the village.
  extensions.st_setsrid(
    extensions.st_makepoint(
      extensions.st_x(zone.centroid) + ((plan.serial_number * 37 % 101) - 50) / 2200.0,
      extensions.st_y(zone.centroid) + ((plan.serial_number * 53 % 101) - 50) / 2200.0
    ),
    4326
  ),
  zone.id,
  (
    now() - make_interval(
      days => plan.last_offset_days + (plan.cycle_count - 1) * plan.cycle_gap_days
    )
  )::date,
  -- Set to the planting instant so the growth log trigger, which only ever
  -- moves this forward, can walk it up cycle by cycle.
  now() - make_interval(
    days => plan.last_offset_days + (plan.cycle_count - 1) * plan.cycle_gap_days
  )
from seed_plan plan
join public.zones zone on zone.id = plan.zone_id
join public.species species
  on species.normalized_key = public.normalize_species(plan.raw_text);

-- ---------------------------------------------------------------------------
-- Growth log
-- ---------------------------------------------------------------------------

-- One statement per cycle, in order, because each entry moves the tree clock
-- forward and the next entry is judged punctual or late against it.
do $$
declare
  current_cycle integer;
begin
  for current_cycle in 1..4 loop
    insert into public.log_entries (
      tree_id, author_id, cycle, photo_path, thumbnail_path,
      captured_at, capture_location, height_cm, visible_branches,
      health_status, notes
    )
    select
      tree.id,
      tree.guardian_id,
      current_cycle,
      tree.id || '/' || current_cycle || '/photo.jpg',
      tree.id || '/' || current_cycle || '/thumbnail.jpg',
      now() - make_interval(
        days => plan.last_offset_days
          + (plan.cycle_count - current_cycle) * plan.cycle_gap_days
      ),
      tree.location,
      55 + (plan.serial_number % 25)
        + (current_cycle - 1) * (18 + plan.serial_number % 12),
      (3 + (current_cycle - 1) * 2 + plan.serial_number % 4)::smallint,
      case
        when current_cycle < plan.cycle_count then 'healthy'
        when plan.serial_number % 23 = 0 then 'sick'
        when plan.serial_number % 11 = 0 then 'at_risk'
        else 'healthy'
      end::public.health_status,
      case
        when current_cycle = 1
          then 'Siembra realizada con el acompañamiento del grupo PRAE.'
        when plan.serial_number % 23 = 0 and current_cycle = plan.cycle_count
          then 'Hojas con manchas amarillas; se reportó a la UMATA.'
        when plan.serial_number % 11 = 0 and current_cycle = plan.cycle_count
          then 'El verano golpeó fuerte, se reforzó el riego.'
        when plan.serial_number % 5 = 0
          then 'Se aplicó abono orgánico y se limpió el plateo.'
        else null
      end
    from seed_plan plan
    join public.trees tree on tree.code = plan.code
    where plan.cycle_count >= current_cycle;
  end loop;
end;
$$;

-- Trees that did not make it. The entry is what kills them: the growth log
-- trigger propagates a dead reading to the tree status.
insert into public.log_entries (
  tree_id, author_id, cycle, photo_path, thumbnail_path,
  captured_at, capture_location, health_status, notes
)
select
  tree.id,
  tree.guardian_id,
  plan.cycle_count + 1,
  tree.id || '/' || (plan.cycle_count + 1) || '/photo.jpg',
  tree.id || '/' || (plan.cycle_count + 1) || '/thumbnail.jpg',
  now() - make_interval(days => plan.last_offset_days / 2),
  tree.location,
  'dead',
  'Se secó por completo durante el verano; el ganado alcanzó el plateo.'
from seed_plan plan
join public.trees tree on tree.code = plan.code
where plan.serial_number % 17 = 0;

-- ---------------------------------------------------------------------------
-- Replanting
-- ---------------------------------------------------------------------------

-- Three of the dead trees were replaced on the same spot. The new tree points
-- back at the old one so the history of the site survives.
insert into public.trees (
  code, guardian_id, species_id, species_raw_text, location, zone_id,
  planted_at, last_updated_at, replaces_tree_id
)
select
  'HUI-LP-' || lpad((200 + replaced.position)::text, 4, '0'),
  replaced.guardian_id,
  replaced.species_id,
  replaced.species_raw_text,
  replaced.location,
  replaced.zone_id,
  (now() - interval '25 days')::date,
  now() - interval '25 days',
  replaced.id
from (
  select tree.*, row_number() over (order by tree.code) as position
  from public.trees tree
  where tree.status = 'dead'
  order by tree.code
  limit 3
) as replaced;

insert into public.log_entries (
  tree_id, author_id, cycle, photo_path, thumbnail_path,
  captured_at, capture_location, height_cm, visible_branches, health_status, notes
)
select
  tree.id,
  tree.guardian_id,
  1,
  tree.id || '/1/photo.jpg',
  tree.id || '/1/thumbnail.jpg',
  now() - interval '25 days',
  tree.location,
  48,
  3::smallint,
  'healthy',
  'Resiembra en el mismo sitio del árbol anterior.'
from public.trees tree
where tree.replaces_tree_id is not null;

update public.trees
   set status = 'replanted'
 where id in (select replaces_tree_id from public.trees where replaces_tree_id is not null);

-- ---------------------------------------------------------------------------
-- Archived trees and unassigned trees
-- ---------------------------------------------------------------------------

update public.trees tree
   set archived_at = now() - interval '18 days',
       archived_by = (select account.id from public.users account where account.role = 'coordinator'),
       archive_reason = 'Predio vendido; el nuevo propietario no autoriza el seguimiento.'
  from seed_plan plan
 where tree.code = plan.code
   and plan.serial_number % 21 = 0;

-- Two guardians left the project. Their trees stay on the map waiting for a
-- replacement, which is what the panel lists as unassigned.
update public.trees
   set guardian_id = null
 where code in ('HUI-LP-0007', 'HUI-LP-0088');

-- ---------------------------------------------------------------------------
-- Devices and open reminders
-- ---------------------------------------------------------------------------

insert into public.devices (user_id, expo_push_token, platform, last_seen_at)
select
  account.id,
  'ExponentPushToken[seed-' || replace(account.id::text, '-', '') || ']',
  case when row_number() over (order by account.email) % 3 = 0 then 'ios' else 'android' end,
  now() - make_interval(days => (row_number() over (order by account.email))::integer)
from public.users account
where account.role = 'guardian';

-- The reminders the sweep would have produced for the trees already past due.
-- They are inserted last: an entry arriving on a tree resolves its open
-- reminders, so seeding them earlier would close them again.
insert into public.reminders (tree_id, user_id, kind, cycle, sent_at)
select
  tree.id,
  tree.guardian_id,
  'cycle',
  coalesce(
    (select max(entry.cycle) from public.log_entries entry where entry.tree_id = tree.id),
    0
  ) + 1,
  tree.next_reminder_at
from public.trees tree
where tree.archived_at is null
  and tree.status <> 'dead'
  and tree.guardian_id is not null
  and tree.next_reminder_at < now();

-- The first escalation, for the trees that were already a week past due when
-- the sweep last ran.
insert into public.reminders (tree_id, user_id, kind, cycle, sent_at)
select
  reminder.tree_id,
  reminder.user_id,
  'follow_up_7d',
  reminder.cycle,
  reminder.sent_at + interval '7 days'
from public.reminders reminder
join public.trees tree on tree.id = reminder.tree_id
where reminder.kind = 'cycle'
  and tree.next_reminder_at < now() - interval '7 days';

commit;
