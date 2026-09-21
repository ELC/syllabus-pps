-- Curated concept subgraph layout (spine, branches, joins) per degree course.

create table if not exists public.roadmap_concept_layouts (
  degree_slug text not null check (degree_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  course_slug text not null check (course_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  curation jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (degree_slug, course_slug)
);

create or replace function public.roadmap_concept_layouts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists roadmap_concept_layouts_set_updated_at on public.roadmap_concept_layouts;
create trigger roadmap_concept_layouts_set_updated_at
before update on public.roadmap_concept_layouts
for each row
execute function public.roadmap_concept_layouts_set_updated_at();

alter table public.roadmap_concept_layouts enable row level security;

drop policy if exists "Anyone can read roadmap concept layouts" on public.roadmap_concept_layouts;
create policy "Anyone can read roadmap concept layouts"
  on public.roadmap_concept_layouts
  for select
  using (true);

drop policy if exists "Authenticated users can insert roadmap concept layouts" on public.roadmap_concept_layouts;
create policy "Authenticated users can insert roadmap concept layouts"
  on public.roadmap_concept_layouts
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update roadmap concept layouts" on public.roadmap_concept_layouts;
create policy "Authenticated users can update roadmap concept layouts"
  on public.roadmap_concept_layouts
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete roadmap concept layouts" on public.roadmap_concept_layouts;
create policy "Authenticated users can delete roadmap concept layouts"
  on public.roadmap_concept_layouts
  for delete
  to authenticated
  using (true);
