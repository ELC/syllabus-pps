-- Optional display name for pre-approved users. Copied into auth.users metadata on signup.

alter table public.allowed_emails
  add column if not exists display_name text;

create or replace function public.apply_allowed_email_display_name()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  approved_name text;
begin
  select display_name into approved_name
  from public.allowed_emails
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

create trigger on_auth_user_apply_display_name
  after insert on auth.users
  for each row
  execute function public.apply_allowed_email_display_name();
