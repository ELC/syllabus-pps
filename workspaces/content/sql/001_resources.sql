-- Resource catalog for Cites (CSL-JSON entries keyed by stable id).
create table if not exists public.resources (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  entry jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.resources_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
before update on public.resources
for each row
execute function public.resources_set_updated_at();

alter table public.resources enable row level security;

drop policy if exists "Authenticated users can read resources" on public.resources;
create policy "Authenticated users can read resources"
  on public.resources
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert resources" on public.resources;
create policy "Authenticated users can insert resources"
  on public.resources
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update resources" on public.resources;
create policy "Authenticated users can update resources"
  on public.resources
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete resources" on public.resources;
create policy "Authenticated users can delete resources"
  on public.resources
  for delete
  to authenticated
  using (true);
