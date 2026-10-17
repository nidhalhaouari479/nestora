-- Nestora · Options 24 h & engagement (P14 → P24).
-- Règles :
--   • une option dure 24 h, n'est pas exclusive, 3 options actives maximum par logement ;
--   • libération volontaire possible jusqu'à 3 h avant l'échéance, sans pénalité ;
--   • option expirée sans décision → nouvelles options suspendues 48 h (à partir de l'expiration) ;
--   • Instant Booking dans les 3 dernières heures sans visite effectuée → suspension 7 jours ;
--   • logement loué par un autre étudiant → option fermée sans pénalité.
-- Il n'y a pas de tâche planifiée : holds_settle() applique les échéances à chaque lecture.

-- ---------------------------------------------------------------------------
-- 1. Schéma
-- ---------------------------------------------------------------------------
alter table public.holds
  add column if not exists closed_at timestamptz,
  add column if not exists closed_reason text check (closed_reason in ('released', 'expired', 'listing_rented', 'instant_booking'));

create unique index if not exists holds_one_active_per_student
on public.holds (listing_id, student_id) where status = 'active' and student_id is not null;

create index if not exists holds_listing_active_idx on public.holds (listing_id, expires_at) where status = 'active';

create table if not exists public.student_suspensions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('hold_expired', 'late_confirmation')),
  hold_id uuid references public.holds(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (hold_id, reason)
);

create index if not exists student_suspensions_student_idx on public.student_suspensions (student_id, ends_at desc);

alter table public.student_suspensions enable row level security;

drop policy if exists "Students read own suspensions" on public.student_suspensions;
create policy "Students read own suspensions" on public.student_suspensions
for select to authenticated using (auth.uid() = student_id or public.staff_has_permission('holds.view'));

alter table public.rental_cases
  add column if not exists hold_id uuid references public.holds(id) on delete set null;

alter table public.payments
  add column if not exists kind text not null default 'initial' check (kind in ('initial', 'balance')),
  add column if not exists student_id uuid references auth.users(id) on delete set null,
  add column if not exists listing_id uuid references public.listings(id) on delete set null,
  add column if not exists payer_name text,
  add column if not exists proof_path text;

-- ---------------------------------------------------------------------------
-- 2. Paramètres
-- ---------------------------------------------------------------------------
create or replace function public.instant_booking_minimum_tnd()
returns integer language sql immutable as $$ select 200 $$;

create or replace function public.hold_duration() returns interval language sql immutable as $$ select interval '24 hours' $$;
create or replace function public.hold_final_window() returns interval language sql immutable as $$ select interval '3 hours' $$;

-- ---------------------------------------------------------------------------
-- 3. Échéances (expiration, logement loué, compteur de places)
-- ---------------------------------------------------------------------------
create or replace function public.holds_settle()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Listing already rented: active holds close with no penalty.
  update public.holds h set status = 'released', closed_at = now(), closed_reason = 'listing_rented'
  from public.listings l
  where l.id = h.listing_id and h.status = 'active' and l.status = 'rented';

  -- Expired without a decision: 48 h suspension counted from the expiry.
  with expired as (
    update public.holds set status = 'expired', closed_at = expires_at, closed_reason = 'expired'
    where status = 'active' and expires_at <= now()
    returning id, student_id, expires_at
  )
  insert into public.student_suspensions (student_id, reason, hold_id, starts_at, ends_at)
  select student_id, 'hold_expired', id, expires_at, expires_at + interval '48 hours'
  from expired where student_id is not null
  on conflict (hold_id, reason) do nothing;

  -- Keep the "x options sur 3 disponibles" counter shown on listing cards in sync.
  with counts as (
    select l.id, greatest(l.hold_slots_total - (select count(*) from public.holds h where h.listing_id = l.id and h.status = 'active'), 0)::smallint as available
    from public.listings l
  )
  update public.listings l set hold_slots_available = c.available
  from counts c
  where c.id = l.id and l.hold_slots_available <> c.available;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Lecture : état des options d'un logement pour l'étudiant connecté (P14 / P17)
-- ---------------------------------------------------------------------------
create or replace function public.student_hold_overview(p_listing uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  perform public.holds_settle();
  return (
    select jsonb_build_object(
      'now', now(),
      'listing_status', l.status,
      'slots_total', l.hold_slots_total,
      'active_count', (select count(*) from public.holds h where h.listing_id = l.id and h.status = 'active'),
      'next_expiry', (select min(h.expires_at) from public.holds h where h.listing_id = l.id and h.status = 'active'),
      'my_hold_id', (select h.id from public.holds h where h.listing_id = l.id and h.student_id = v_user and h.status = 'active'),
      'suspended_until', (select max(s.ends_at) from public.student_suspensions s where s.student_id = v_user and s.ends_at > now())
    )
    from public.listings l where l.id = p_listing
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Poser une option (P14)
-- ---------------------------------------------------------------------------
create or replace function public.student_place_hold(p_listing uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_listing public.listings;
  v_existing uuid;
  v_active integer;
  v_name text;
  v_id uuid;
  v_until timestamptz;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.holds_settle();

  select * into v_listing from public.listings where id = p_listing for update;
  if not found or v_listing.status <> 'published' then
    raise exception 'Ce logement n''est plus disponible.' using errcode = 'check_violation';
  end if;

  select id into v_existing from public.holds where listing_id = p_listing and student_id = v_user and status = 'active';
  if v_existing is not null then
    return v_existing;
  end if;

  select max(ends_at) into v_until from public.student_suspensions where student_id = v_user and ends_at > now();
  if v_until is not null then
    raise exception 'suspended' using errcode = 'check_violation', detail = v_until::text;
  end if;

  select count(*) into v_active from public.holds where listing_id = p_listing and status = 'active';
  if v_active >= v_listing.hold_slots_total then
    raise exception 'slots_full' using errcode = 'check_violation';
  end if;

  select nullif(trim(coalesce(first_name, '') || ' ' || left(coalesce(last_name, ''), 1) || case when coalesce(last_name, '') <> '' then '.' else '' end), '')
  into v_name from public.student_profiles where user_id = v_user;

  insert into public.holds (listing_id, student_id, student_name, status, expires_at)
  values (p_listing, v_user, coalesce(v_name, 'Étudiant'), 'active', now() + public.hold_duration())
  returning id into v_id;

  update public.listings set hold_slots_available = greatest(hold_slots_total - v_active - 1, 0) where id = p_listing;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Lecture d'une option (P15 → P19, P23)
-- ---------------------------------------------------------------------------
create or replace function public.student_get_hold(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_hold public.holds;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.holds_settle();

  select * into v_hold from public.holds where id = p_id and student_id = v_user;
  if not found then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'now', now(),
      'id', v_hold.id,
      'status', v_hold.status,
      'closed_reason', v_hold.closed_reason,
      'created_at', v_hold.created_at,
      'expires_at', v_hold.expires_at,
      'closed_at', v_hold.closed_at,
      'release_deadline', v_hold.expires_at - public.hold_final_window(),
      'slots_total', l.hold_slots_total,
      'active_count', (select count(*) from public.holds h where h.listing_id = l.id and h.status = 'active'),
      'competing', exists (
        select 1 from public.rental_cases c
        where c.listing_id = l.id and c.student_id is distinct from v_user
          and c.status in ('open', 'payment_review', 'contract', 'move_in')),
      'has_completed_visit', exists (
        select 1 from public.visit_requests v where v.listing_id = l.id and v.student_id = v_user and v.status = 'completed'),
      'suspended_until', (select max(s.ends_at) from public.student_suspensions s where s.student_id = v_user and s.ends_at > now()),
      'instant_booking_min', public.instant_booking_minimum_tnd(),
      'case', (
        select jsonb_build_object('id', c.id, 'reference', c.reference, 'status', c.status,
          'payment_reference', p.reference, 'payment_status', p.status, 'amount_tnd', p.amount_tnd)
        from public.rental_cases c left join public.payments p on p.rental_case_id = c.id and p.kind = 'initial'
        where c.hold_id = v_hold.id order by c.created_at desc limit 1),
      'listing', jsonb_build_object(
        'id', l.id, 'slug', l.slug, 'title', l.title, 'neighborhood', l.neighborhood, 'city', l.city,
        'status', l.status, 'price_tnd', l.price_tnd, 'sale_price_tnd', l.sale_price_tnd,
        'walk_minutes', l.walk_minutes, 'verified_onsite', l.verified_onsite,
        'photo', (select jsonb_build_object('url', p.url, 'position', p.position)
                  from public.listing_photos p where p.listing_id = l.id order by p.sort_order limit 1))
    )
    from public.listings l where l.id = v_hold.listing_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Libérer (P20) — interdit dans les 3 dernières heures
-- ---------------------------------------------------------------------------
create or replace function public.student_release_hold(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold public.holds;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.holds_settle();

  select * into v_hold from public.holds where id = p_id and student_id = auth.uid() for update;
  if not found or v_hold.status <> 'active' then
    raise exception 'Cette option n''est plus active.' using errcode = 'check_violation';
  end if;
  if v_hold.expires_at - now() <= public.hold_final_window() then
    raise exception 'La libération n''est plus disponible à moins de 3 h de l''échéance.' using errcode = 'check_violation';
  end if;

  update public.holds set status = 'released', closed_at = now(), closed_reason = 'released' where id = p_id;
  update public.listings set hold_slots_available = least(hold_slots_available + 1, hold_slots_total) where id = v_hold.listing_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Instant Booking (P21B) : dossier + paiement à vérifier, option convertie
-- ---------------------------------------------------------------------------
create or replace function public.student_instant_booking(p_hold uuid, p_payer_name text, p_amount integer, p_proof_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_hold public.holds;
  v_listing public.listings;
  v_case_id uuid;
  v_case_ref text;
  v_payment_ref text;
  v_late boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.holds_settle();

  select * into v_hold from public.holds where id = p_hold and student_id = v_user for update;
  if not found or v_hold.status <> 'active' then
    raise exception 'Cette option n''est plus active.' using errcode = 'check_violation';
  end if;

  select * into v_listing from public.listings where id = v_hold.listing_id;
  if v_listing.status <> 'published' then
    raise exception 'Ce logement n''est plus disponible.' using errcode = 'check_violation';
  end if;

  if length(trim(coalesce(p_payer_name, ''))) < 3 then
    raise exception 'Indique le nom complet de la personne qui a effectué le virement.' using errcode = 'check_violation';
  end if;
  if p_amount is null or p_amount < public.instant_booking_minimum_tnd() then
    raise exception 'Le montant minimum est de % TND.', public.instant_booking_minimum_tnd() using errcode = 'check_violation';
  end if;
  if p_proof_path is null or split_part(p_proof_path, '/', 1) <> v_user::text then
    raise exception 'Ajoute la preuve de paiement.' using errcode = 'check_violation';
  end if;

  v_late := v_hold.expires_at - now() <= public.hold_final_window();
  v_case_ref := 'DOS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_payment_ref := 'PAY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.rental_cases (reference, listing_id, student_id, student_name, status, needs_action, is_complete, hold_id)
  values (v_case_ref, v_listing.id, v_user, v_hold.student_name, 'payment_review', true, false, v_hold.id)
  returning id into v_case_id;

  insert into public.payments (reference, rental_case_id, amount_tnd, status, kind, student_id, listing_id, payer_name, proof_path)
  values (v_payment_ref, v_case_id, p_amount, 'submitted', 'initial', v_user, v_listing.id, trim(p_payer_name), p_proof_path);

  update public.holds set status = 'converted', closed_at = now(), closed_reason = 'instant_booking' where id = v_hold.id;
  update public.listings set hold_slots_available = least(hold_slots_available + 1, hold_slots_total) where id = v_listing.id;

  -- Confirming in the final 3 hours without a completed visit: new holds suspended 7 days.
  if v_late and not exists (
    select 1 from public.visit_requests v where v.listing_id = v_listing.id and v.student_id = v_user and v.status = 'completed'
  ) then
    insert into public.student_suspensions (student_id, reason, hold_id, starts_at, ends_at)
    values (v_user, 'late_confirmation', v_hold.id, now(), now() + interval '7 days')
    on conflict (hold_id, reason) do nothing;
  end if;

  return jsonb_build_object('case_id', v_case_id, 'case_reference', v_case_ref, 'payment_reference', v_payment_ref);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Preuves de paiement : bucket privé, chaque étudiant dépose dans son dossier
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('payment-proofs', 'payment-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
    on conflict (id) do nothing;

    execute 'drop policy if exists "Students upload own payment proofs" on storage.objects';
    execute $p$create policy "Students upload own payment proofs" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text)$p$;

    execute 'drop policy if exists "Students read own payment proofs" on storage.objects';
    execute $p$create policy "Students read own payment proofs" on storage.objects
      for select to authenticated
      using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Droits
-- ---------------------------------------------------------------------------
revoke execute on function public.holds_settle() from public, anon;
revoke execute on function public.student_hold_overview(uuid) from public;
revoke execute on function public.student_place_hold(uuid) from public, anon;
revoke execute on function public.student_get_hold(uuid) from public, anon;
revoke execute on function public.student_release_hold(uuid) from public, anon;
revoke execute on function public.student_instant_booking(uuid, text, integer, text) from public, anon;

grant execute on function public.holds_settle() to authenticated;
grant execute on function public.student_hold_overview(uuid) to anon, authenticated;
grant execute on function public.student_place_hold(uuid) to authenticated;
grant execute on function public.student_get_hold(uuid) to authenticated;
grant execute on function public.student_release_hold(uuid) to authenticated;
grant execute on function public.student_instant_booking(uuid, text, integer, text) to authenticated;

notify pgrst, 'reload schema';
