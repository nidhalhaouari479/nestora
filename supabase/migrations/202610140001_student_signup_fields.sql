-- Nestora · Inscription complète étudiant
-- P03 : nom, prénom, téléphone, genre, email, mot de passe.
-- Connexion : email OU téléphone + mot de passe (le téléphone est résolu côté serveur).

create type public.student_gender as enum ('female', 'male');

alter table public.student_profiles
  add column if not exists gender public.student_gender;

-- One account per email in the profile table as well (auth.users already enforces it).
create unique index if not exists student_profiles_email_key
on public.student_profiles (lower(email))
where email is not null;

-- The phone number is already unique: unique (phone_country_code, phone_number)
-- from 202610020001, which also serves the "connexion par téléphone" lookup.

-- The sign-up metadata now carries phone and gender.
create or replace function public.create_student_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  phone text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone_number', ''), '\D', '', 'g'), '');
  gender_value text := new.raw_user_meta_data ->> 'gender';
begin
  -- Staff accounts are created by an administrator and never get a student profile.
  if coalesce(new.raw_app_meta_data ->> 'account_type', '') = 'staff' then
    return new;
  end if;

  insert into public.student_profiles (
    user_id, email, first_name, last_name, phone_country_code, phone_number, gender,
    preferred_channel, is_phone_verified, is_email_verified
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_country_code', '+216'),
    phone,
    case when gender_value in ('female', 'male') then gender_value::public.student_gender end,
    'sms',
    false,
    new.email_confirmed_at is not null
  )
  on conflict (user_id) where user_id is not null do update
  set email = excluded.email,
      is_email_verified = excluded.is_email_verified,
      updated_at = now();

  return new;
end;
$$;
