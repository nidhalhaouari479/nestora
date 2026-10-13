-- Match the conflict target to the existing partial unique index on user_id.
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
  on conflict (user_id) where user_id is not null do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;
