-- Fifteen-week concept plan for each course.

create table if not exists public.planning_plans (
  course_slug text primary key check (course_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  plan jsonb not null check (
    jsonb_typeof(plan) = 'object'
    and jsonb_typeof(plan -> 'weeks') = 'array'
    and jsonb_array_length(plan -> 'weeks') = 15
  ),
  updated_at timestamptz not null default now()
);

create or replace function public.planning_plans_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planning_plans_set_updated_at on public.planning_plans;
create trigger planning_plans_set_updated_at
before update on public.planning_plans
for each row
execute function public.planning_plans_set_updated_at();

alter table public.planning_plans enable row level security;

drop policy if exists "Anyone can read planning plans" on public.planning_plans;
create policy "Anyone can read planning plans"
  on public.planning_plans
  for select
  using (true);

drop policy if exists "App admins can insert planning plans" on public.planning_plans;
create policy "App admins can insert planning plans"
  on public.planning_plans
  for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "App admins can update planning plans" on public.planning_plans;
create policy "App admins can update planning plans"
  on public.planning_plans
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "App admins can delete planning plans" on public.planning_plans;
create policy "App admins can delete planning plans"
  on public.planning_plans
  for delete
  to authenticated
  using (public.is_app_admin());
