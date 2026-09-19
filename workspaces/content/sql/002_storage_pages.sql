-- Storage policies for curriculum markdown pages in the `content` bucket under `pages/`.
-- Create the bucket in Supabase Storage if it does not exist (name: content).

drop policy if exists "Authenticated users can read pages" on storage.objects;
create policy "Authenticated users can read pages"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'content' and (storage.foldername(name))[1] = 'pages');

drop policy if exists "Authenticated users can write pages" on storage.objects;
create policy "Authenticated users can write pages"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'content' and (storage.foldername(name))[1] = 'pages');

drop policy if exists "Authenticated users can update pages" on storage.objects;
create policy "Authenticated users can update pages"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'content' and (storage.foldername(name))[1] = 'pages')
  with check (bucket_id = 'content' and (storage.foldername(name))[1] = 'pages');

drop policy if exists "Authenticated users can delete pages" on storage.objects;
create policy "Authenticated users can delete pages"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'content' and (storage.foldername(name))[1] = 'pages');
