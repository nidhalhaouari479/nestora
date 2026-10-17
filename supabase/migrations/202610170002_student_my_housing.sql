-- Nestora · Onglet « Mon logement » côté étudiant : ses visites, options 24 h et dossiers.
-- holds et rental_cases ne sont lisibles que par l'équipe (RLS) ; cette fonction renvoie
-- uniquement les lignes de l'étudiant connecté (auth.uid()), avec le logement associé.
-- L'adresse précise (lien Maps) n'est donnée qu'une fois la visite confirmée.

create or replace function public.student_my_housing()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'visits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'reference', v.reference, 'status', v.status,
        'proposed_slots', v.proposed_slots, 'confirmed_date', v.confirmed_date,
        'slot_start', to_char(v.slot_start, 'HH24:MI'), 'slot_end', to_char(v.slot_end, 'HH24:MI'),
        'created_at', v.created_at,
        'listing', jsonb_build_object(
          'slug', l.slug, 'title', l.title, 'neighborhood', l.neighborhood, 'city', l.city,
          'is_published', l.status = 'published',
          'maps_url', case when v.status in ('confirmed', 'completed') then l.maps_url end,
          'photo', (select jsonb_build_object('url', p.url, 'position', p.position)
                    from public.listing_photos p where p.listing_id = l.id order by p.sort_order limit 1))
      ) order by case when v.status in ('requested', 'slot_confirmation', 'confirmed') then 0 else 1 end, v.created_at desc)
      from public.visit_requests v
      join public.listings l on l.id = v.listing_id
      where v.student_id = v_user), '[]'::jsonb),

    'holds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'status', h.status, 'expires_at', h.expires_at, 'created_at', h.created_at,
        'listing', jsonb_build_object('slug', l.slug, 'title', l.title, 'neighborhood', l.neighborhood,
          'is_published', l.status = 'published',
          'photo', (select jsonb_build_object('url', p.url, 'position', p.position)
                    from public.listing_photos p where p.listing_id = l.id order by p.sort_order limit 1))
      ) order by h.created_at desc)
      from public.holds h
      join public.listings l on l.id = h.listing_id
      where h.student_id = v_user), '[]'::jsonb),

    'cases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'reference', c.reference, 'status', c.status, 'is_complete', c.is_complete,
        'created_at', c.created_at,
        'listing', case when l.id is null then null else jsonb_build_object('slug', l.slug, 'title', l.title,
          'neighborhood', l.neighborhood, 'is_published', l.status = 'published',
          'photo', (select jsonb_build_object('url', p.url, 'position', p.position)
                    from public.listing_photos p where p.listing_id = l.id order by p.sort_order limit 1)) end
      ) order by c.created_at desc)
      from public.rental_cases c
      left join public.listings l on l.id = c.listing_id
      where c.student_id = v_user), '[]'::jsonb)
  );
end;
$$;

-- The student can withdraw a visit request that is still pending or confirmed.
create or replace function public.student_cancel_visit(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.visit_requests set status = 'cancelled'
  where id = p_id and student_id = auth.uid() and status in ('requested', 'slot_confirmation', 'confirmed');
  if not found then
    raise exception 'Cette visite ne peut plus être annulée.' using errcode = 'check_violation';
  end if;
end;
$$;

revoke execute on function public.student_my_housing() from public, anon;
revoke execute on function public.student_cancel_visit(uuid) from public, anon;
grant execute on function public.student_my_housing() to authenticated;
grant execute on function public.student_cancel_visit(uuid) to authenticated;

notify pgrst, 'reload schema';
