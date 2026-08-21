-- Bucket for the growth log photographs.
--
-- Object naming convention, one folder per tree and one per cycle:
--
--   <tree_id>/<cycle>/photo.jpg      the compressed photograph, around 200 KB
--   <tree_id>/<cycle>/thumbnail.jpg  the 300 px thumbnail the timeline loads
--
-- Putting the tree identifier first is what lets a storage policy decide
-- ownership from the object name alone, without a join the storage layer
-- cannot express.

-- The bucket is private rather than public. A public bucket hands out an
-- unauthenticated URL for every object, and there would be no way to stop
-- serving the photographs of an archived tree. Private plus a read policy
-- gives the same open access to what is visible and none to what is not.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'growth-log-photos',
  'growth-log-photos',
  false,
  -- One mebibyte. Photographs are compressed to roughly 200 KB before upload;
  -- this ceiling is what stops an untouched camera original from reaching the
  -- bucket and eating the yearly storage allowance in a single upload.
  1048576,
  array['image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Object names come from the client, so the first folder is not necessarily a
-- uuid. A plain cast would raise instead of simply failing the policy.
create or replace function public.try_uuid(candidate text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return candidate::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

comment on function public.try_uuid(text) is
  'Casts to uuid or returns null. Lets a storage policy read a tree id out of an object name without raising on a malformed one.';

-- Whether the tree behind an object is one the public may see.
create or replace function public.tree_is_visible(target_tree_id uuid)
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
       and tree.archived_at is null
  );
$$;

comment on function public.tree_is_visible(uuid) is
  'True when the tree exists and is not archived. Gates public reads of its photographs.';

-- ---------------------------------------------------------------------------
-- Bucket policies
-- ---------------------------------------------------------------------------

create policy growth_log_photos_read_visible on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'growth-log-photos'
    and public.tree_is_visible(public.try_uuid((storage.foldername(name))[1]))
  );

create policy growth_log_photos_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'growth-log-photos'
    and public.owns_tree(public.try_uuid((storage.foldername(name))[1]))
  );

-- Re-uploading a cycle happens when a photograph comes out unusable. Only the
-- guardian of that tree may overwrite it.
create policy growth_log_photos_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'growth-log-photos'
    and public.owns_tree(public.try_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'growth-log-photos'
    and public.owns_tree(public.try_uuid((storage.foldername(name))[1]))
  );

create policy growth_log_photos_coordinator_all on storage.objects
  for all to authenticated
  using (bucket_id = 'growth-log-photos' and public.is_coordinator())
  with check (bucket_id = 'growth-log-photos' and public.is_coordinator());
