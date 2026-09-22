-- Curated course roadmap grid overrides (templateAreas per year), keyed by degree slug.

create table if not exists public.roadmap_course_layouts (
  degree_slug text primary key check (degree_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  years jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.roadmap_course_layouts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists roadmap_course_layouts_set_updated_at on public.roadmap_course_layouts;
create trigger roadmap_course_layouts_set_updated_at
before update on public.roadmap_course_layouts
for each row
execute function public.roadmap_course_layouts_set_updated_at();

alter table public.roadmap_course_layouts enable row level security;

drop policy if exists "Anyone can read roadmap course layouts" on public.roadmap_course_layouts;
create policy "Anyone can read roadmap course layouts"
  on public.roadmap_course_layouts
  for select
  using (true);

drop policy if exists "Authenticated users can insert roadmap course layouts" on public.roadmap_course_layouts;
create policy "Authenticated users can insert roadmap course layouts"
  on public.roadmap_course_layouts
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update roadmap course layouts" on public.roadmap_course_layouts;
create policy "Authenticated users can update roadmap course layouts"
  on public.roadmap_course_layouts
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete roadmap course layouts" on public.roadmap_course_layouts;
create policy "Authenticated users can delete roadmap course layouts"
  on public.roadmap_course_layouts
  for delete
  to authenticated
  using (true);
