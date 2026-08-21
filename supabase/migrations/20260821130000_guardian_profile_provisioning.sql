-- Provisioning of the guardian profile that pairs with an auth identity.
--
-- `public.users` cannot exist without an express declaration of legal age and a
-- dated acceptance of the terms, and until this migration nothing created that
-- row. Two routes were possible and the trigger is the only one that works:
--
--   * From the client, right after sign up. It cannot: with email confirmation
--     enabled `signUp` returns no session, so `auth.uid()` is null and the
--     `users_insert_own_profile` policy rejects the insert. Even with the
--     session available, the insert is a second network call that can fail on
--     the intermittent rural signal this project is built for, leaving a
--     credential with no profile -- an account whose owner cannot repair it.
--
--   * From a trigger on `auth.users`. The profile is written inside the same
--     transaction as the credential, so either both exist or neither does.
--
-- The trigger only provisions the profile when the metadata carries the legal
-- age declaration, which is what a self service sign up sends. Identities
-- created by the seed, by an administrator or by a future invite flow do not
-- carry it and bring their own profile row; provisioning one for them would
-- fabricate a declaration nobody made.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  declared_adult boolean := case
    when jsonb_typeof(metadata -> 'is_adult_confirmed') = 'boolean'
      then (metadata ->> 'is_adult_confirmed')::boolean
    else false
  end;
  accepted_terms boolean := case
    when jsonb_typeof(metadata -> 'terms_accepted') = 'boolean'
      then (metadata ->> 'terms_accepted')::boolean
    else false
  end;
begin
  if not (declared_adult and accepted_terms) then
    return new;
  end if;

  insert into public.users (
    id, full_name, email, institution, is_adult_confirmed, terms_accepted_at
  )
  values (
    new.id,
    -- The client validates the name before sending it. The fallback only
    -- exists so a blank one can never violate the check constraint and fail
    -- the sign up: a guardian can correct the name from the profile screen,
    -- but cannot recover from an account that was never created.
    coalesce(nullif(btrim(metadata ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    nullif(btrim(metadata ->> 'institution'), ''),
    true,
    -- Stamped by the database, not read from the metadata. The acceptance is
    -- a dated legal record and the server clock is the only one that cannot be
    -- moved by whoever is accepting.
    now()
  )
  -- The sweep is idempotent so a replayed insert cannot raise on a profile
  -- that is already there.
  on conflict (id) do nothing;

  -- `role` is deliberately not read from the metadata: it defaults to
  -- 'guardian' in the table. Taking it from a payload the client controls
  -- would let anyone sign up as a coordinator.
  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Creates the public.users profile for a self service sign up, in the same transaction as the credential, so an auth identity is never left without a profile.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
