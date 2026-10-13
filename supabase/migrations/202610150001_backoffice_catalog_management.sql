-- Nestora · Backoffice : gestion des clients, des facultés et des maisons.
-- Une maison appartient à UN client (le propriétaire qui la loue) et est liée à AU MOINS UNE faculté.

-- ---------------------------------------------------------------------------
-- 1. Clients (propriétaires / bailleurs)
-- ---------------------------------------------------------------------------
create table public.landlords (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default 'CLI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  full_name text not null check (length(trim(full_name)) >= 2),
  company_name text,
  phone text not null check (length(trim(phone)) >= 8),
  email text,
  national_id text,
  address text,
  notes text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index landlords_name_idx on public.landlords (lower(full_name));

create trigger landlords_set_updated_at
before update on public.landlords
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Facultés : nom court affiché dans l'application
-- ---------------------------------------------------------------------------
alter table public.universities
  add column if not exists short_name text,
  add column if not exists updated_at timestamptz not null default now();

update public.universities set short_name = case id
  when 'tunis-el-manar' then 'Tunis El Manar'
  when 'manouba' then 'Manouba'
  when 'ihec-carthage' then 'IHEC Carthage'
  when 'isitcom' then 'ISITCom'
  when 'carthage' then 'Carthage'
  when 'esprit' then 'ESPRIT'
  else name end
where short_name is null;

create trigger universities_set_updated_at
before update on public.universities
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Maisons : client + facultés (plusieurs)
-- ---------------------------------------------------------------------------
alter table public.listings
  add column if not exists landlord_id uuid references public.landlords(id) on delete restrict;

create index if not exists listings_landlord_idx on public.listings (landlord_id);

create table public.listing_universities (
  listing_id uuid not null references public.listings(id) on delete cascade,
  university_id text not null references public.universities(id) on delete restrict,
  primary key (listing_id, university_id)
);

create index listing_universities_university_idx on public.listing_universities (university_id);

-- Existing listings keep their faculty.
insert into public.listing_universities (listing_id, university_id)
select id, university_id from public.listings where university_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Permissions de gestion
-- ---------------------------------------------------------------------------
insert into public.staff_role_permissions (role, permission) values
  ('super_admin', 'landlords.view'), ('super_admin', 'landlords.manage'),
  ('super_admin', 'properties.manage'), ('super_admin', 'universities.manage'),
  ('operations_manager', 'landlords.view'), ('operations_manager', 'landlords.manage'), ('operations_manager', 'properties.manage'),
  ('operations_agent', 'landlords.view'),
  ('finance', 'landlords.view'),
  ('field_agent', 'landlords.view'),
  ('content_editor', 'universities.manage')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.landlords enable row level security;
alter table public.listing_universities enable row level security;

create policy "Staff read landlords" on public.landlords
for select to authenticated using (public.staff_has_permission('landlords.view'));

create policy "Staff create landlords" on public.landlords
for insert to authenticated with check (public.staff_has_permission('landlords.manage'));

create policy "Staff update landlords" on public.landlords
for update to authenticated using (public.staff_has_permission('landlords.manage'))
with check (public.staff_has_permission('landlords.manage'));

create policy "Staff create universities" on public.universities
for insert to authenticated with check (public.staff_has_permission('universities.manage'));

create policy "Staff update universities" on public.universities
for update to authenticated using (public.staff_has_permission('universities.manage'))
with check (public.staff_has_permission('universities.manage'));

create policy "Anyone can read faculties of published listings" on public.listing_universities
for select to anon, authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'published' or public.is_verified_staff())));

-- Listings, photos, surroundings and faculty links are written only through admin_save_listing().

-- ---------------------------------------------------------------------------
-- 6. Enregistrement atomique d'une maison
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_listing(
  p_id uuid,
  p_data jsonb,
  p_university_ids text[],
  p_photos jsonb default null,
  p_nearby jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_id;
  v_landlord uuid := nullif(p_data ->> 'landlord_id', '')::uuid;
  v_status public.listing_status := coalesce(nullif(p_data ->> 'status', ''), 'draft')::public.listing_status;
  v_universities text[] := array(select distinct u from unnest(coalesce(p_university_ids, '{}')) as u where u <> '');
  v_base text := coalesce(nullif(p_data ->> 'slug', ''), 'maison');
  v_slug text;
  v_suffix integer := 1;
  v_published_at timestamptz;
begin
  if not public.staff_has_permission('properties.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_landlord is null or not exists (select 1 from public.landlords where id = v_landlord and is_active) then
    raise exception 'Choisis un client actif pour cette maison.' using errcode = 'check_violation';
  end if;

  if cardinality(v_universities) = 0 then
    raise exception 'Choisis au moins une faculté.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from unnest(v_universities) as u where not exists (select 1 from public.universities where id = u)) then
    raise exception 'Une des facultés choisies n''existe plus.' using errcode = 'check_violation';
  end if;

  if coalesce(trim(p_data ->> 'title'), '') = '' then
    raise exception 'Le titre est obligatoire.' using errcode = 'check_violation';
  end if;

  -- Unique slug: maison, maison-2, maison-3…
  v_slug := v_base;
  while exists (select 1 from public.listings where slug = v_slug and id is distinct from v_id) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  if v_id is not null then
    select published_at into v_published_at from public.listings where id = v_id;
    if not found then
      raise exception 'Maison introuvable.' using errcode = 'no_data_found';
    end if;
  end if;
  if v_status = 'published' then
    v_published_at := coalesce(v_published_at, now());
  end if;

  if v_id is null then
    insert into public.listings (slug, title, short_title, headline, listing_type, neighborhood, price_tnd, available_from)
    values (v_slug, p_data ->> 'title', p_data ->> 'title', p_data ->> 'title', (p_data ->> 'listing_type')::public.listing_type,
            p_data ->> 'neighborhood', (p_data ->> 'price_tnd')::integer, (p_data ->> 'available_from')::date)
    returning id into v_id;
  end if;

  update public.listings set
    slug = v_slug,
    title = trim(p_data ->> 'title'),
    short_title = coalesce(nullif(trim(p_data ->> 'short_title'), ''), trim(p_data ->> 'title')),
    headline = coalesce(nullif(trim(p_data ->> 'headline'), ''), trim(p_data ->> 'title')),
    tagline = coalesce(p_data ->> 'tagline', ''),
    description = coalesce(p_data ->> 'description', ''),
    listing_type = (p_data ->> 'listing_type')::public.listing_type,
    landlord_id = v_landlord,
    university_id = v_universities[1],
    neighborhood = trim(p_data ->> 'neighborhood'),
    city = coalesce(nullif(trim(p_data ->> 'city'), ''), 'Tunis'),
    maps_url = nullif(trim(p_data ->> 'maps_url'), ''),
    price_tnd = (p_data ->> 'price_tnd')::integer,
    service_included = coalesce((p_data ->> 'service_included')::boolean, true),
    walk_minutes = coalesce((p_data ->> 'walk_minutes')::integer, 10),
    capacity = coalesce((p_data ->> 'capacity')::smallint, 1),
    available_places = coalesce((p_data ->> 'available_places')::smallint, 1),
    hold_slots_total = coalesce((p_data ->> 'hold_slots_total')::smallint, 3),
    hold_slots_available = least(coalesce((p_data ->> 'hold_slots_available')::smallint, 3), coalesce((p_data ->> 'hold_slots_total')::smallint, 3)),
    available_from = (p_data ->> 'available_from')::date,
    status = v_status,
    verified_onsite = coalesce((p_data ->> 'verified_onsite')::boolean, false),
    address_verified = coalesce((p_data ->> 'address_verified')::boolean, false),
    photos_verified = coalesce((p_data ->> 'photos_verified')::boolean, false),
    landlord_verified = coalesce((p_data ->> 'landlord_verified')::boolean, false),
    confidence_score = nullif(p_data ->> 'confidence_score', '')::smallint,
    is_furnished = coalesce((p_data ->> 'is_furnished')::boolean, false),
    in_residence = coalesce((p_data ->> 'in_residence')::boolean, false),
    has_wifi = coalesce((p_data ->> 'has_wifi')::boolean, false),
    has_ac = coalesce((p_data ->> 'has_ac')::boolean, false),
    has_heating = coalesce((p_data ->> 'has_heating')::boolean, false),
    has_desk = coalesce((p_data ->> 'has_desk')::boolean, false),
    deposit_label = coalesce(nullif(trim(p_data ->> 'deposit_label'), ''), '1 mois de loyer'),
    charges_label = coalesce(nullif(trim(p_data ->> 'charges_label'), ''), 'Eau et électricité non incluses'),
    visits_label = coalesce(nullif(trim(p_data ->> 'visits_label'), ''), 'Sur demande et confirmation'),
    collections = coalesce(array(select jsonb_array_elements_text(p_data -> 'collections')), '{}'),
    availability_confirmed_at = now(),
    published_at = v_published_at
  where id = v_id;

  delete from public.listing_universities where listing_id = v_id;
  insert into public.listing_universities (listing_id, university_id)
  select v_id, u from unnest(v_universities) as u;

  if p_photos is not null then
    delete from public.listing_photos where listing_id = v_id;
    insert into public.listing_photos (listing_id, url, alt, position, sort_order)
    select v_id, t.photo ->> 'url', coalesce(t.photo ->> 'alt', ''), coalesce(nullif(t.photo ->> 'position', ''), 'center'), (t.idx - 1)::smallint
    from jsonb_array_elements(p_photos) with ordinality as t(photo, idx)
    where coalesce(t.photo ->> 'url', '') <> '';
  end if;

  delete from public.listing_nearby where listing_id = v_id;
  insert into public.listing_nearby (listing_id, kind, minutes)
  select v_id, key::public.nearby_kind, value::smallint
  from jsonb_each_text(coalesce(p_nearby, '{}'::jsonb))
  where key in ('university', 'transport', 'cafe', 'supermarket') and value ~ '^\d{1,3}$';

  return v_id;
end;
$$;

revoke execute on function public.admin_save_listing(uuid, jsonb, text[], jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_listing(uuid, jsonb, text[], jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Stockage des photos (bucket public, upload par le serveur du backoffice)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('nestora-media', 'nestora-media', true)
    on conflict (id) do nothing;
  end if;
end;
$$;
