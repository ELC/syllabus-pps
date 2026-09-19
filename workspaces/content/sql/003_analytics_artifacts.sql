-- Compiled analytics read model (graph, cytoscape export, diagnostics, dashboards).
-- Rebuilt by the rebuild-analytics Edge Function (or local dev API) after CMS/Cites edits.

create table if not exists public.analytics_artifacts (
  key text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists analytics_artifacts_updated_at_idx
  on public.analytics_artifacts (updated_at desc);

-- Open access for now; tighten with RLS when roles are defined.
alter table public.analytics_artifacts enable row level security;

create policy "analytics_artifacts read"
  on public.analytics_artifacts
  for select
  using (true);

create policy "analytics_artifacts write"
  on public.analytics_artifacts
  for all
  using (true)
  with check (true);
