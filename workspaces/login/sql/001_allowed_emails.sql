-- Allow-list for email OTP sign-in. Apply in the Supabase SQL editor, then register
-- public.hook_restrict_signup_by_allowed_email as the "before-user-created" Auth Hook
-- in Dashboard → Authentication → Hooks.

create extension if not exists citext with schema public;

create table if not exists public.allowed_emails (
  email citext primary key,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

revoke all on table public.allowed_emails from anon, authenticated, public;
grant select on table public.allowed_emails to supabase_auth_admin;

create or replace function public.hook_restrict_signup_by_allowed_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_email citext;
  is_allowed int;
begin
  signup_email := lower(trim(event->'user'->>'email'));

  if signup_email is null or signup_email = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'A valid email address is required.',
        'http_code', 400
      )
    );
  end if;

  select count(*) into is_allowed
  from public.allowed_emails
  where email = signup_email;

  if is_allowed = 0 then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Sign-in is not available for this email address.',
        'http_code', 403
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_restrict_signup_by_allowed_email(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_by_allowed_email(jsonb) from anon, authenticated, public;
