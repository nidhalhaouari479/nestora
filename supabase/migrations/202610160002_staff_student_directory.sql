-- Nestora · Backoffice : annuaire des étudiants inscrits sur le site.
-- student_profiles reste invisible côté client (chaque étudiant ne lit que son profil) ;
-- l'équipe passe par ces deux fonctions, réservées à la permission students.view.
-- Elles ajoutent ce qui n'est pas lisible via l'API : dernière connexion (auth.users)
-- et l'activité de l'étudiant (favoris, visites, options, dossiers).

-- ---------------------------------------------------------------------------
-- 1. Liste
-- ---------------------------------------------------------------------------
create or replace function public.staff_list_students(
  p_search text default '',
  p_gender text default '',
  p_university text default '',
  p_verified text default ''
)
returns table (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone_country_code text,
  phone_number text,
  gender public.student_gender,
  university_id text,
  university_name text,
  is_email_verified boolean,
  is_phone_verified boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  favorites_count integer,
  visits_count integer,
  holds_count integer,
  cases_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_term text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not public.staff_has_permission('students.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    s.id, s.user_id, s.first_name, s.last_name, s.email, s.phone_country_code, s.phone_number, s.gender,
    s.university_id, u.name,
    s.is_email_verified or au.email_confirmed_at is not null,
    s.is_phone_verified,
    s.created_at, au.last_sign_in_at,
    (select count(*)::int from public.favorites f where f.user_id = s.user_id),
    (select count(*)::int from public.visit_requests v where v.student_id = s.user_id),
    (select count(*)::int from public.holds h where h.student_id = s.user_id),
    (select count(*)::int from public.rental_cases c where c.student_id = s.user_id)
  from public.student_profiles s
  left join auth.users au on au.id = s.user_id
  left join public.universities u on u.id = s.university_id
  where not exists (select 1 from public.staff_members m where m.user_id = s.user_id)
    and (v_term is null
      or (s.first_name || ' ' || s.last_name) ilike '%' || v_term || '%'
      or (s.last_name || ' ' || s.first_name) ilike '%' || v_term || '%'
      or s.email ilike '%' || v_term || '%'
      or coalesce(s.phone_number, '') ilike '%' || regexp_replace(v_term, '\D', '', 'g') || '%' and regexp_replace(v_term, '\D', '', 'g') <> '')
    and (coalesce(p_gender, '') = '' or s.gender::text = p_gender)
    and (coalesce(p_university, '') = '' or s.university_id = p_university)
    and (coalesce(p_verified, '') = ''
      or (p_verified = 'yes' and (s.is_email_verified or au.email_confirmed_at is not null))
      or (p_verified = 'no' and not (s.is_email_verified or au.email_confirmed_at is not null)))
  order by s.created_at desc
  limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Fiche étudiant
-- ---------------------------------------------------------------------------
create or replace function public.staff_get_student(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.student_profiles;
  v_user auth.users;
begin
  if not public.staff_has_permission('students.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_profile from public.student_profiles where id = p_id;
  if not found then
    return null;
  end if;
  select * into v_user from auth.users where id = v_profile.user_id;

  return jsonb_build_object(
    'profile', to_jsonb(v_profile) || jsonb_build_object(
      'university_name', (select name from public.universities where id = v_profile.university_id),
      'last_sign_in_at', v_user.last_sign_in_at,
      'email_confirmed_at', v_user.email_confirmed_at,
      'auth_created_at', v_user.created_at
    ),
    'favorites', coalesce((
      select jsonb_agg(jsonb_build_object('listing_id', l.id, 'title', l.title, 'neighborhood', l.neighborhood,
        'price_tnd', l.price_tnd, 'status', l.status, 'created_at', f.created_at) order by f.created_at desc)
      from public.favorites f join public.listings l on l.id = f.listing_id
      where f.user_id = v_profile.user_id), '[]'::jsonb),
    'visits', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'reference', v.reference, 'listing_id', l.id, 'title', l.title,
        'status', v.status, 'preferred_dates', v.preferred_dates, 'slot_start', v.slot_start, 'slot_end', v.slot_end,
        'confirmed_date', v.confirmed_date, 'created_at', v.created_at) order by v.created_at desc)
      from public.visit_requests v join public.listings l on l.id = v.listing_id
      where v.student_id = v_profile.user_id), '[]'::jsonb),
    'holds', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'listing_id', l.id, 'title', l.title, 'status', h.status,
        'expires_at', h.expires_at, 'created_at', h.created_at) order by h.created_at desc)
      from public.holds h join public.listings l on l.id = h.listing_id
      where h.student_id = v_profile.user_id), '[]'::jsonb),
    'cases', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'reference', c.reference, 'listing_id', l.id, 'title', l.title,
        'status', c.status, 'needs_action', c.needs_action, 'is_complete', c.is_complete, 'created_at', c.created_at) order by c.created_at desc)
      from public.rental_cases c left join public.listings l on l.id = c.listing_id
      where c.student_id = v_profile.user_id), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.staff_list_students(text, text, text, text) from public, anon;
revoke execute on function public.staff_get_student(uuid) from public, anon;
grant execute on function public.staff_list_students(text, text, text, text) to authenticated;
grant execute on function public.staff_get_student(uuid) to authenticated;
