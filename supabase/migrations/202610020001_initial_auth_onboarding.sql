create extension if not exists "pgcrypto";

create type public.auth_channel as enum ('whatsapp', 'sms');

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone_country_code text not null default '+216',
  phone_number text not null,
  preferred_channel public.auth_channel not null default 'whatsapp',
  is_phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone_country_code, phone_number)
);

create table public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone_country_code text not null default '+216',
  phone_number text not null,
  channel public.auth_channel not null default 'whatsapp',
  code text not null default '000000',
  consumed_at timestamptz,
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
alter table public.otp_verifications enable row level security;

create policy "Students can read own profile"
on public.student_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Students can update own profile"
on public.student_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Students can insert own profile"
on public.student_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Anonymous users can create onboarding otp"
on public.otp_verifications
for insert
to anon, authenticated
with check (code = '000000');

create policy "Anonymous users can read their onboarding otp"
on public.otp_verifications
for select
to anon, authenticated
using (code = '000000');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();
