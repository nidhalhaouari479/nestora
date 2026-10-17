-- Nestora · Caractéristiques des maisons gérées depuis le backoffice.
-- Proximités, équipements, conditions et mises en avant sur l'accueil deviennent des listes
-- (icône + nom). Chaque maison active les éléments voulus et saisit une valeur.
-- Ajoute aussi le prix soldé et le public accueilli (filles / garçons / tous).

-- ---------------------------------------------------------------------------
-- 1. Catalogue des caractéristiques
-- ---------------------------------------------------------------------------
create type public.feature_kind as enum ('nearby', 'equipment', 'condition', 'highlight');

create table public.listing_features (
  id uuid primary key default gen_random_uuid(),
  kind public.feature_kind not null,
  -- Clé stable lue par l'application (filtres, sections de l'accueil). Ne change pas quand le nom change.
  code text not null check (code ~ '^[a-z0-9_-]{1,60}$'),
  name text not null check (length(trim(name)) >= 2),
  icon text not null default 'check',
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, code)
);

create trigger listing_features_set_updated_at
before update on public.listing_features
for each row execute function public.set_updated_at();

create table public.listing_feature_values (
  listing_id uuid not null references public.listings(id) on delete cascade,
  feature_id uuid not null references public.listing_features(id) on delete cascade,
  value text not null default '' check (length(value) <= 120),
  primary key (listing_id, feature_id)
);

create index listing_feature_values_feature_idx on public.listing_feature_values (feature_id);

insert into public.listing_features (kind, code, name, icon, sort_order) values
  ('nearby', 'university', 'Université', 'landmark', 1),
  ('nearby', 'transport', 'Transport', 'bus', 2),
  ('nearby', 'cafe', 'Café', 'coffee', 3),
  ('nearby', 'supermarket', 'Supermarché', 'cart', 4),
  ('equipment', 'furnished', 'Meublé', 'sofa', 1),
  ('equipment', 'wifi', 'Wi-Fi', 'wifi', 2),
  ('equipment', 'ac', 'Climatiseur', 'ac', 3),
  ('equipment', 'heating', 'Chauffage', 'heater', 4),
  ('equipment', 'residence', 'Résidence', 'building', 5),
  ('equipment', 'desk', 'Bureau', 'desk', 6),
  ('condition', 'deposit', 'Dépôt de garantie', 'wallet', 1),
  ('condition', 'charges', 'Charges', 'receipt', 2),
  ('condition', 'visits', 'Visites', 'calendar', 3),
  ('highlight', 'near_campus', 'À deux pas du campus', 'map-pin', 1),
  ('highlight', 'september', 'Disponibles en septembre', 'calendar', 2),
  ('highlight', 'foyer', 'Foyers privés vérifiés', 'shield', 3);

-- ---------------------------------------------------------------------------
-- 2. Reprise des données existantes
-- ---------------------------------------------------------------------------
insert into public.listing_feature_values (listing_id, feature_id, value)
select n.listing_id, f.id, n.minutes::text
from public.listing_nearby n
join public.listing_features f on f.kind = 'nearby' and f.code = n.kind::text
on conflict do nothing;

insert into public.listing_feature_values (listing_id, feature_id)
select l.id, f.id
from public.listings l
join public.listing_features f on f.kind = 'equipment' and (
  (f.code = 'furnished' and l.is_furnished) or (f.code = 'wifi' and l.has_wifi) or (f.code = 'ac' and l.has_ac)
  or (f.code = 'heating' and l.has_heating) or (f.code = 'residence' and l.in_residence) or (f.code = 'desk' and l.has_desk))
on conflict do nothing;

insert into public.listing_feature_values (listing_id, feature_id, value)
select l.id, f.id, case f.code when 'deposit' then l.deposit_label when 'charges' then l.charges_label else l.visits_label end
from public.listings l
join public.listing_features f on f.kind = 'condition'
on conflict do nothing;

insert into public.listing_feature_values (listing_id, feature_id)
select l.id, f.id
from public.listings l
join public.listing_features f on f.kind = 'highlight' and f.code = any(l.collections)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Prix soldé et public accueilli
-- ---------------------------------------------------------------------------
create type public.listing_gender as enum ('girls', 'boys', 'all');

alter table public.listings
  add column if not exists sale_price_tnd integer,
  add column if not exists gender public.listing_gender not null default 'all',
  add constraint listings_sale_price_check check (sale_price_tnd is null or (sale_price_tnd > 0 and sale_price_tnd < price_tnd));

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.listing_features enable row level security;
alter table public.listing_feature_values enable row level security;

create policy "Anyone can read active features" on public.listing_features
for select to anon, authenticated using (is_active or public.is_verified_staff());

create policy "Staff create features" on public.listing_features
for insert to authenticated with check (public.staff_has_permission('properties.manage'));

create policy "Staff update features" on public.listing_features
for update to authenticated using (public.staff_has_permission('properties.manage'))
with check (public.staff_has_permission('properties.manage'));

create policy "Staff delete features" on public.listing_features
for delete to authenticated using (public.staff_has_permission('properties.manage'));

create policy "Anyone can read features of published listings" on public.listing_feature_values
for select to anon, authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'published' or public.is_verified_staff())));

-- Les valeurs par maison sont écrites uniquement par admin_save_listing().

-- ---------------------------------------------------------------------------
-- 5. Enregistrement atomique d'une maison (remplace p_nearby par p_features)
-- ---------------------------------------------------------------------------
drop function if exists public.admin_save_listing(uuid, jsonb, text[], jsonb, jsonb);

create or replace function public.admin_save_listing(
  p_id uuid,
  p_data jsonb,
  p_university_ids text[],
  p_photos jsonb default null,
  p_features jsonb default '[]'::jsonb
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

  if coalesce(p_data ->> 'gender', '') not in ('girls', 'boys', 'all') then
    raise exception 'Choisis le public accueilli : filles, garçons ou tous.' using errcode = 'check_violation';
  end if;

  if nullif(p_data ->> 'sale_price_tnd', '') is not null
     and (p_data ->> 'sale_price_tnd')::integer >= (p_data ->> 'price_tnd')::integer then
    raise exception 'Le prix soldé doit être inférieur au prix.' using errcode = 'check_violation';
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
    sale_price_tnd = nullif(p_data ->> 'sale_price_tnd', '')::integer,
    gender = (p_data ->> 'gender')::public.listing_gender,
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

  delete from public.listing_feature_values where listing_id = v_id;
  insert into public.listing_feature_values (listing_id, feature_id, value)
  select v_id, f.id, left(coalesce(trim(item ->> 'value'), ''), 120)
  from jsonb_array_elements(coalesce(p_features, '[]'::jsonb)) as item
  join public.listing_features f on f.id::text = item ->> 'id'
  on conflict do nothing;

  return v_id;
end;
$$;

revoke execute on function public.admin_save_listing(uuid, jsonb, text[], jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_listing(uuid, jsonb, text[], jsonb, jsonb) to authenticated;
