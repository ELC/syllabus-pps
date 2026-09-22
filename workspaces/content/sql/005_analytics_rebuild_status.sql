-- Singleton row tracking analytics rebuild progress (Edge Function + dev rebuild API).

create table if not exists public.analytics_rebuild_status (
  id smallint primary key check (id = 1),
  state text not null check (state in ('idle', 'running')),
  started_at timestamptz,
  finished_at timestamptz,
  last_error text,
  last_ok_at timestamptz,
  page_count integer,
  resource_count integer,
  updated_at timestamptz not null default now()
);

insert into public.analytics_rebuild_status (id, state)
values (1, 'idle')
on conflict (id) do nothing;

alter table public.analytics_rebuild_status enable row level security;

create policy "analytics_rebuild_status read"
  on public.analytics_rebuild_status
  for select
  using (true);

create policy "analytics_rebuild_status write"
  on public.analytics_rebuild_status
  for all
  using (true)
  with check (true);
