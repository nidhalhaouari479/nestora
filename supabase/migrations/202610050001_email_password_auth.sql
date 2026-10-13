alter table public.student_profiles
add column if not exists email text;

alter table public.student_profiles
alter column first_name set default '',
alter column last_name set default '',
alter column phone_number drop not null;

create unique index if not exists student_profiles_user_id_key
on public.student_profiles (user_id)
where user_id is not null;

create or replace function public.create_student_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_profiles (
    user_id,
    email,
    first_name,
    last_name,
    phone_country_code,
    phone_number,
    preferred_channel,
    is_phone_verified
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    '+216',
    null,
    'sms',
    false
  )
  on conflict (user_id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists create_student_profile_after_auth_signup on auth.users;

create trigger create_student_profile_after_auth_signup
after insert on auth.users
for each row execute function public.create_student_profile_for_auth_user();
