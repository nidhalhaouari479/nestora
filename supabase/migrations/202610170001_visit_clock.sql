-- Nestora · Horloge de référence pour la demande de visite.
-- Le site affiche les 7 jours et masque les créneaux passés à partir de cette heure (Tunis),
-- la même que celle utilisée par validate_visit_request(). Un appareil à l'heure fausse
-- ne propose donc plus de jours refusés par la base.

create or replace function public.visit_clock()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'today', (now() at time zone 'Africa/Tunis')::date,
    'minutes', extract(hour from now() at time zone 'Africa/Tunis')::int * 60
             + extract(minute from now() at time zone 'Africa/Tunis')::int
  );
$$;

grant execute on function public.visit_clock() to anon, authenticated;

notify pgrst, 'reload schema';
