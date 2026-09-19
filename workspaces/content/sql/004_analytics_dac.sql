-- Relational read model for Bruin DAC (Postgres connection). Populated on analytics rebuild.

create table if not exists public.analytics_dac_metrics (
  metric_key text primary key,
  value numeric not null
);

create table if not exists public.analytics_dac_rows (
  dataset text not null,
  row_data jsonb not null
);

create index if not exists analytics_dac_rows_dataset_idx on public.analytics_dac_rows (dataset);

alter table public.analytics_dac_metrics enable row level security;
alter table public.analytics_dac_rows enable row level security;

create policy "analytics_dac_metrics read"
  on public.analytics_dac_metrics for select using (true);

create policy "analytics_dac_metrics write"
  on public.analytics_dac_metrics for all using (true) with check (true);

create policy "analytics_dac_rows read"
  on public.analytics_dac_rows for select using (true);

create policy "analytics_dac_rows write"
  on public.analytics_dac_rows for all using (true) with check (true);
