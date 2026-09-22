-- Restrict content writes to app admins (read stays available to all authenticated users).

-- Resources (Cites)
drop policy if exists "Authenticated users can insert resources" on public.resources;
drop policy if exists "Authenticated users can update resources" on public.resources;
drop policy if exists "Authenticated users can delete resources" on public.resources;

drop policy if exists "App admins can insert resources" on public.resources;
create policy "App admins can insert resources"
  on public.resources
  for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "App admins can update resources" on public.resources;
create policy "App admins can update resources"
  on public.resources
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "App admins can delete resources" on public.resources;
create policy "App admins can delete resources"
  on public.resources
  for delete
  to authenticated
  using (public.is_app_admin());

-- Curriculum pages (Storage)
drop policy if exists "Authenticated users can write pages" on storage.objects;
drop policy if exists "Authenticated users can update pages" on storage.objects;
drop policy if exists "Authenticated users can delete pages" on storage.objects;

drop policy if exists "App admins can write pages" on storage.objects;
create policy "App admins can write pages"
  on storage.objects
  for insert
  to authenticated
  with check (
    public.is_app_admin()
    and bucket_id = 'content'
    and (storage.foldername(name))[1] = 'pages'
  );

drop policy if exists "App admins can update pages" on storage.objects;
create policy "App admins can update pages"
  on storage.objects
  for update
  to authenticated
  using (
    public.is_app_admin()
    and bucket_id = 'content'
    and (storage.foldername(name))[1] = 'pages'
  )
  with check (
    public.is_app_admin()
    and bucket_id = 'content'
    and (storage.foldername(name))[1] = 'pages'
  );

drop policy if exists "App admins can delete pages" on storage.objects;
create policy "App admins can delete pages"
  on storage.objects
  for delete
  to authenticated
  using (
    public.is_app_admin()
    and bucket_id = 'content'
    and (storage.foldername(name))[1] = 'pages'
  );

-- Roadmap layout curation
drop policy if exists "Authenticated users can insert roadmap course layouts" on public.roadmap_course_layouts;
drop policy if exists "Authenticated users can update roadmap course layouts" on public.roadmap_course_layouts;
drop policy if exists "Authenticated users can delete roadmap course layouts" on public.roadmap_course_layouts;

drop policy if exists "App admins can insert roadmap course layouts" on public.roadmap_course_layouts;
create policy "App admins can insert roadmap course layouts"
  on public.roadmap_course_layouts
  for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "App admins can update roadmap course layouts" on public.roadmap_course_layouts;
create policy "App admins can update roadmap course layouts"
  on public.roadmap_course_layouts
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "App admins can delete roadmap course layouts" on public.roadmap_course_layouts;
create policy "App admins can delete roadmap course layouts"
  on public.roadmap_course_layouts
  for delete
  to authenticated
  using (public.is_app_admin());

drop policy if exists "Authenticated users can insert roadmap concept layouts" on public.roadmap_concept_layouts;
drop policy if exists "Authenticated users can update roadmap concept layouts" on public.roadmap_concept_layouts;
drop policy if exists "Authenticated users can delete roadmap concept layouts" on public.roadmap_concept_layouts;

drop policy if exists "App admins can insert roadmap concept layouts" on public.roadmap_concept_layouts;
create policy "App admins can insert roadmap concept layouts"
  on public.roadmap_concept_layouts
  for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "App admins can update roadmap concept layouts" on public.roadmap_concept_layouts;
create policy "App admins can update roadmap concept layouts"
  on public.roadmap_concept_layouts
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "App admins can delete roadmap concept layouts" on public.roadmap_concept_layouts;
create policy "App admins can delete roadmap concept layouts"
  on public.roadmap_concept_layouts
  for delete
  to authenticated
  using (public.is_app_admin());
