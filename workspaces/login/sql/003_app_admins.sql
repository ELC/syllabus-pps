-- App administrators (AuthZ). Any authenticated user may sign in; only rows here grant admin rights.
-- Replaces the sign-up allow list: disable the before-user-created hook after migrating (see README).

create extension if not exists citext with schema public;

create table if not exists public.app_admins (
  email citext primary key,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

revoke all on table public.app_admins from anon, public;
grant select, insert, delete on table public.app_admins to authenticated;

create or replace function public.jwt_email()
returns citext
language sql
stable
as $$
  select nullif(lower(trim(auth.jwt()->>'email')), '')::citext;
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where email = public.jwt_email()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

drop policy if exists "Admins can read app_admins" on public.app_admins;
create policy "Admins can read app_admins"
  on public.app_admins
  for select
  to authenticated
  using (public.is_app_admin());

drop policy if exists "Admins can insert app_admins" on public.app_admins;
create policy "Admins can insert app_admins"
  on public.app_admins
  for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "Admins can delete app_admins" on public.app_admins;
create policy "Admins can delete app_admins"
  on public.app_admins
  for delete
  to authenticated
  using (public.is_app_admin());

-- Optional: copy legacy allow-list rows into app_admins (does not block sign-up by itself).
do $$
begin
  if to_regclass('public.allowed_emails') is not null then
    insert into public.app_admins (email, display_name)
    select email, display_name
    from public.allowed_emails
    on conflict (email) do update
      set display_name = coalesce(excluded.display_name, public.app_admins.display_name);
  end if;
end $$;

-- Seed at least one admin before disabling the sign-up hook, for example:
-- insert into public.app_admins (email, display_name) values ('you@example.com', 'Your Name');

create or replace function public.apply_app_admin_display_name()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  approved_name text;
begin
  select display_name into approved_name
  from public.app_admins
  where email = lower(trim(new.email));

  if approved_name is not null and btrim(approved_name) <> '' then
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('full_name', btrim(approved_name))
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_apply_display_name on auth.users;
drop trigger if exists on_auth_user_apply_app_admin_display_name on auth.users;

create trigger on_auth_user_apply_app_admin_display_name
  after insert on auth.users
  for each row
  execute function public.apply_app_admin_display_name();
