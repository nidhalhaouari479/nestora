-- Nestora · Demande de visite : l'étudiant voit les 7 prochains jours (aujourd'hui compris),
-- en choisit de 1 à 7 et un créneau pour chacun. L'équipe choisit ensuite la date finale
-- parmi ces propositions depuis le backoffice.

-- ---------------------------------------------------------------------------
-- 1. Propositions date + créneau
-- ---------------------------------------------------------------------------
-- proposed_slots : [{"date": "2026-10-01", "start": "14:00", "end": "15:00"}, …] trié par date.
-- preferred_dates est dérivé de proposed_slots ; slot_start / slot_end = créneau retenu
-- (première proposition tant que la visite n'est pas confirmée).
alter table public.visit_requests
  add column if not exists proposed_slots jsonb not null default '[]'::jsonb;

update public.visit_requests
set proposed_slots = (
  select jsonb_agg(jsonb_build_object('date', d, 'start', to_char(slot_start, 'HH24:MI'), 'end', to_char(slot_end, 'HH24:MI')) order by d)
  from unnest(preferred_dates) as d)
where proposed_slots = '[]'::jsonb;

alter table public.visit_requests drop constraint if exists visit_three_dates;
alter table public.visit_requests add constraint visit_dates_count check (cardinality(preferred_dates) between 1 and 7);

create or replace function public.validate_visit_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz constant text := 'Africa/Tunis';
  v_today date := (now() at time zone tz)::date;
  v_now time := (now() at time zone tz)::time;
  v_count integer;
  active_count integer;
begin
  if jsonb_typeof(new.proposed_slots) is distinct from 'array' then
    raise exception 'Choisis au moins un jour pour la visite.' using errcode = 'check_violation';
  end if;

  v_count := jsonb_array_length(new.proposed_slots);
  if v_count < 1 or v_count > 7 then
    raise exception 'Choisis entre 1 et 7 jours.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from jsonb_to_recordset(new.proposed_slots) as p("date" date, "start" time, "end" time) where p."date" is null or p."start" is null or p."end" is null) then
    raise exception 'Choisis un créneau pour chaque jour.' using errcode = 'check_violation';
  end if;

  if (select count(distinct p."date") from jsonb_to_recordset(new.proposed_slots) as p("date" date, "start" time, "end" time)) <> v_count then
    raise exception 'Un seul créneau par jour.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from jsonb_to_recordset(new.proposed_slots) as p("date" date, "start" time, "end" time) where p."date" < v_today or p."date" > v_today + 6) then
    raise exception 'Les dates doivent être dans les 7 prochains jours.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from jsonb_to_recordset(new.proposed_slots) as p("date" date, "start" time, "end" time) where p."end" <= p."start") then
    raise exception 'Créneau invalide.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from jsonb_to_recordset(new.proposed_slots) as p("date" date, "start" time, "end" time) where p."date" = v_today and p."start" <= v_now) then
    raise exception 'Un créneau d''aujourd''hui est déjà passé. Choisis-en un autre.' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.listings where id = new.listing_id and status = 'published') then
    raise exception 'Ce logement n''est plus disponible.' using errcode = 'check_violation';
  end if;

  -- Normalised copy, sorted by date, plus the derived columns.
  select jsonb_agg(jsonb_build_object('date', p."date", 'start', to_char(p."start", 'HH24:MI'), 'end', to_char(p."end", 'HH24:MI')) order by p."date"),
         array_agg(p."date" order by p."date")
  into new.proposed_slots, new.preferred_dates
  from jsonb_to_recordset(new.proposed_slots) as p("date" date, "start" time, "end" time);

  if tg_op = 'INSERT' then
    select p."start", p."end" into new.slot_start, new.slot_end
    from jsonb_to_recordset(new.proposed_slots) as p("date" date, "start" time, "end" time) order by p."date" limit 1;

    select count(*) into active_count
    from public.visit_requests
    where student_id = new.student_id
      and status in ('requested', 'slot_confirmation', 'confirmed');

    if active_count >= 3 then
      raise exception 'Tu as déjà trois visites actives.' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists visit_requests_validate on public.visit_requests;
create trigger visit_requests_validate
before insert or update of proposed_slots, listing_id on public.visit_requests
for each row execute function public.validate_visit_request();

-- ---------------------------------------------------------------------------
-- 2. Backoffice : liste des demandes avec l'étudiant
-- ---------------------------------------------------------------------------
create or replace function public.staff_list_visits(p_status text default 'pending')
returns table (
  id uuid,
  reference text,
  status public.visit_status,
  proposed_slots jsonb,
  confirmed_date date,
  slot_start time,
  slot_end time,
  confirmed_at timestamptz,
  created_at timestamptz,
  listing_id uuid,
  listing_title text,
  listing_neighborhood text,
  student_profile_id uuid,
  student_name text,
  student_email text,
  student_phone text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.staff_has_permission('visits.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select v.id, v.reference, v.status, v.proposed_slots, v.confirmed_date, v.slot_start, v.slot_end, v.confirmed_at, v.created_at,
    l.id, l.title, l.neighborhood,
    s.id, nullif(trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), ''), s.email,
    case when s.phone_number is not null then s.phone_country_code || ' ' || s.phone_number end
  from public.visit_requests v
  join public.listings l on l.id = v.listing_id
  left join public.student_profiles s on s.user_id = v.student_id
  where case coalesce(p_status, 'pending')
    when 'pending' then v.status in ('requested', 'slot_confirmation')
    when 'all' then true
    else v.status::text = p_status
  end
  order by case when v.status in ('requested', 'slot_confirmation') then 0 else 1 end, v.created_at desc
  limit 300;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Backoffice : l'admin retient une des dates proposées
-- ---------------------------------------------------------------------------
create or replace function public.staff_confirm_visit(p_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visit public.visit_requests;
  v_slot jsonb;
begin
  if not public.staff_has_permission('visits.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_visit from public.visit_requests where id = p_id for update;
  if not found then
    raise exception 'Demande de visite introuvable.' using errcode = 'no_data_found';
  end if;
  if v_visit.status not in ('requested', 'slot_confirmation') then
    raise exception 'Cette demande n''est plus en attente.' using errcode = 'check_violation';
  end if;

  select item into v_slot from jsonb_array_elements(v_visit.proposed_slots) as item where (item ->> 'date')::date = p_date;
  if v_slot is null then
    raise exception 'Choisis une des dates proposées par l''étudiant.' using errcode = 'check_violation';
  end if;

  update public.visit_requests set
    status = 'confirmed',
    confirmed_date = p_date,
    confirmed_at = now(),
    slot_start = (v_slot ->> 'start')::time,
    slot_end = (v_slot ->> 'end')::time
  where id = p_id;
end;
$$;

create or replace function public.staff_cancel_visit(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.staff_has_permission('visits.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.visit_requests set status = 'cancelled'
  where id = p_id and status in ('requested', 'slot_confirmation', 'confirmed');
  if not found then
    raise exception 'Cette demande ne peut plus être annulée.' using errcode = 'check_violation';
  end if;
end;
$$;

revoke execute on function public.staff_list_visits(text) from public, anon;
revoke execute on function public.staff_confirm_visit(uuid, date) from public, anon;
revoke execute on function public.staff_cancel_visit(uuid) from public, anon;
grant execute on function public.staff_list_visits(text) to authenticated;
grant execute on function public.staff_confirm_visit(uuid, date) to authenticated;
grant execute on function public.staff_cancel_visit(uuid) to authenticated;

notify pgrst, 'reload schema';
