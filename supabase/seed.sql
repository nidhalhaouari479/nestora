-- Nestora demo data (listings + operations). Safe to run once on an empty database.
-- `supabase db reset` runs it automatically; on a hosted project paste it in the SQL editor.

with next_september as (
  select make_date(
    extract(year from current_date)::int + case when extract(month from current_date) >= 9 then 1 else 0 end,
    9, 1) as d
)
insert into public.listings (
  slug, title, short_title, headline, tagline, description, listing_type, university_id, neighborhood,
  maps_url, price_tnd, walk_minutes, capacity, available_places, hold_slots_total, hold_slots_available,
  available_from, status, verified_onsite, address_verified, photos_verified, landlord_verified,
  confidence_score, is_furnished, in_residence, has_wifi, has_ac, has_heating, has_desk, collections,
  availability_confirmed_at, published_at)
select v.slug, v.title, v.short_title, v.headline, v.tagline, v.description, v.listing_type::public.listing_type,
  'tunis-el-manar', v.neighborhood, 'https://maps.google.com/?q=' || replace(v.neighborhood, ' ', '+') || ',+Tunis',
  v.price, v.walk, v.capacity, v.places, 3, v.holds,
  case when v.now_available then current_date else ns.d end,
  'published', true, true, true, true, v.score, v.furnished, v.residence, true, v.ac, true, v.desk,
  v.collections, now() - interval '1 day', now() - v.published_ago
from next_september ns, (values
  ('studio-lumineux-el-manar-2', 'Studio lumineux à El Manar 2', 'Studio lumineux · El Manar 2',
   'Studio lumineux à deux pas du campus.', 'Un coin calme et lumineux pour étudier après les cours.',
   'Un espace simple, chaleureux et pratique pour étudier au calme.', 's0', 'El Manar 2',
   760, 8, 1, 1, 2, 86, true, true, true, true, '{near_campus}'::text[], true, interval '2 days'),
  ('s0-lumineux-el-manar', 'S+0 lumineux à El Manar', 'S+0 lumineux · El Manar',
   'Un S+0 baigné de lumière près de la faculté.', 'Une pièce claire, meublée et prête à vivre.',
   'Un studio pensé pour les étudiants qui aiment travailler à la maison.', 's0', 'El Manar 1',
   680, 9, 1, 1, 3, 82, true, false, true, true, '{september}'::text[], false, interval '3 days'),
  ('chambre-privee-rommana', 'Chambre privée à Rommana', 'Chambre privée · Rommana',
   'Une chambre privée au cœur de Rommana.', 'Une colocation calme entre étudiantes.',
   'Une chambre meublée dans un appartement partagé, à quelques minutes du campus.', 'private_room', 'Rommana',
   430, 12, 1, 1, 3, 79, true, false, false, true, '{september}'::text[], false, interval '5 days'),
  ('foyer-prive-el-manar', 'Foyer privé à El Manar', 'Foyer privé · El Manar',
   'Un foyer privé vérifié, pensé pour la vie étudiante.', 'Une chambre meublée et des espaces communs.',
   'Une chambre meublée, des espaces communs et un accès simple au campus.', 'private_foyer', 'El Manar',
   390, 6, 40, 6, 3, 88, true, true, true, true, '{foyer}'::text[], true, interval '10 days'),
  ('s1-cite-olympique', 'S+1 lumineux à Cité Olympique', 'S+1 · Cité Olympique',
   'Un S+1 lumineux à deux pas du transport.', 'Un salon séparé pour recevoir et réviser.',
   'Un appartement S+1 meublé, proche du métro léger et des commerces.', 's1', 'Cité Olympique',
   820, 14, 2, 1, 3, 84, true, false, true, true, '{near_campus}'::text[], false, interval '20 days'),
  ('studio-calme-el-manar-3', 'Studio calme à El Manar 3', 'Studio calme · El Manar 3',
   'Un studio calme pour se concentrer.', 'Un coin calme et lumineux pour étudier après les cours.',
   'Un petit studio au dernier étage avec un bureau dédié.', 's0', 'El Manar 3',
   590, 11, 1, 1, 3, 80, true, false, false, true, '{near_campus,september}'::text[], true, interval '25 days')
) as v(slug, title, short_title, headline, tagline, description, listing_type, neighborhood,
       price, walk, capacity, places, holds, score, furnished, residence, ac, desk, collections, now_available, published_ago);

insert into public.listing_photos (listing_id, url, alt, position, sort_order)
select l.id, p.url, p.alt, p.position, p.sort_order
from public.listings l
join (values
  ('studio-lumineux-el-manar-2', '/images/listings/studio-el-manar.jpg', 'Salon lumineux avec balcon', 'center', 0),
  ('studio-lumineux-el-manar-2', '/images/listings/chambre-rommana.jpg', 'Chambre meublée', 'center', 1),
  ('s0-lumineux-el-manar', '/images/listings/chambre-rommana.jpg', 'Chambre lumineuse', 'left center', 0),
  ('chambre-privee-rommana', '/images/listings/chambre-rommana.jpg', 'Chambre privée meublée', 'center', 0),
  ('foyer-prive-el-manar', '/images/welcome.png', 'Étudiantes devant le foyer', 'center 70%', 0),
  ('s1-cite-olympique', '/images/listings/studio-el-manar.jpg', 'Séjour avec balcon', 'right center', 0),
  ('studio-calme-el-manar-3', '/images/listings/studio-thumb.jpg', 'Studio calme', 'center', 0)
) as p(slug, url, alt, position, sort_order) on p.slug = l.slug;

insert into public.listing_nearby (listing_id, kind, minutes)
select l.id, n.kind::public.nearby_kind, n.minutes
from public.listings l
cross join (values ('university', 8), ('transport', 4), ('cafe', 3), ('supermarket', 5)) as n(kind, minutes);

-- Caractéristiques (catalogue créé par la migration listing_features).
insert into public.listing_feature_values (listing_id, feature_id, value)
select l.id, f.id, case f.kind
    when 'nearby' then (select n.minutes::text from public.listing_nearby n where n.listing_id = l.id and n.kind::text = f.code)
    when 'condition' then case f.code when 'deposit' then l.deposit_label when 'charges' then l.charges_label else l.visits_label end
    else '' end
from public.listings l
join public.listing_features f on
  (f.kind = 'nearby' and exists (select 1 from public.listing_nearby n where n.listing_id = l.id and n.kind::text = f.code))
  or f.kind = 'condition'
  or (f.kind = 'highlight' and f.code = any(l.collections))
  or (f.kind = 'equipment' and (
    (f.code = 'furnished' and l.is_furnished) or (f.code = 'wifi' and l.has_wifi) or (f.code = 'ac' and l.has_ac)
    or (f.code = 'heating' and l.has_heating) or (f.code = 'residence' and l.in_residence) or (f.code = 'desk' and l.has_desk)))
on conflict do nothing;

update public.listings set gender = 'girls' where slug = 'chambre-privee-rommana';
update public.listings set sale_price_tnd = 720 where slug = 's1-cite-olympique';

-- Operations demo data for the Command Center ---------------------------------
insert into public.rental_cases (reference, listing_id, student_name, status, needs_action, is_complete)
select 'CAS-' || lpad(g::text, 4, '0'),
  (select id from public.listings order by random() limit 1),
  'Étudiant ' || g,
  (array['open', 'payment_review', 'contract', 'move_in']::public.rental_case_status[])[1 + g % 4],
  g % 6 = 0,
  g % 8 <> 0
from generate_series(1, 86) as g;

insert into public.payments (reference, amount_tnd, status, submitted_at, reconciled_at)
select 'PAY-' || (1040 + g), 760,
  case when g <= 5 then 'submitted' else 'reconciled' end::public.payment_status,
  now() - (g * 8 + 34) * interval '1 minute',
  case when g <= 5 then null else now() - interval '1 hour' end
from generate_series(1, 60) as g;

insert into public.holds (listing_id, student_name, status, expires_at)
select (select id from public.listings where slug = 'studio-lumineux-el-manar-2'), s.name, 'active', now() + s.left_time
from (values ('Youssef M.', interval '38 minutes'), ('Ines K.', interval '1 hour 38 minutes'),
             ('Amine B.', interval '2 hours 10 minutes'), ('Sana T.', interval '2 hours 50 minutes')) as s(name, left_time);

insert into public.ops_tasks (kind, title, detail, status_label, tone, action_label, is_approval, initials, priority, due_at, created_at)
values
  ('payment', 'Preuve de paiement · Mariem B.', '760 TND · envoyée il y a 42 min · Réf. PAY-1048', 'À vérifier', 'warning', 'Traiter', true, 'MB', 95, now() + interval '30 minutes', now() - interval '42 minutes'),
  ('visit', 'Visite · Ahmed N.', 'El Manar 2 · aujourd’hui 14:30 · propriétaire non reconfirmé', 'Confirmer', 'info', 'Ouvrir', false, 'AN', 85, now() + interval '2 hours', now() - interval '3 hours'),
  ('contract', 'Contrat · Sarra L.', 'Version finale prête · un champ obligatoire à valider', 'Approbation', 'success', 'Comparer', true, 'SL', 80, now() + interval '3 hours', now() - interval '1 hour'),
  ('hold', 'Option 24 h · Youssef M.', 'Expire dans 1 h 38 min · autre confirmation en cours', 'Urgent', 'danger', 'Ouvrir', false, 'YM', 90, now() + interval '98 minutes', now() - interval '22 hours'),
  ('availability', 'Disponibilité · S+1 Rommana', 'Confirmation expirée depuis 2 jours · bien automatiquement masqué', 'Actualiser', 'neutral', 'Ouvrir', false, 'HA', 60, now() - interval '2 days', now() - interval '3 days'),
  ('follow_up', 'Relancer un paiement mensuel en retard', 'Yasmine Ayari · 3 jours de retard', 'En retard', 'danger', 'Relancer', false, 'YA', 70, now() - interval '3 days', now() - interval '4 days');

insert into public.ops_schedule_events (starts_at, title, detail, tone)
select (current_date + e.at_time) at time zone 'Africa/Tunis', e.title, e.detail, e.tone::public.ops_tone
from (values
  (time '09:30', 'Vérification terrain', 'Studio · Rommana · Amal', 'success'),
  (time '11:00', 'Visite étudiante', 'S+1 · Cité Olympique · Yassine', 'info'),
  (time '14:30', 'Visite étudiante', 'Studio · El Manar 2 · Yassine', 'danger'),
  (time '17:00', 'Emménagement', 'Chambre privée · Denden · Sarra', 'warning')
) as e(at_time, title, detail, tone);

-- Completed history for SLA and "Mes indicateurs" (21 on time, 4 late).
insert into public.ops_tasks (kind, title, status_label, tone, initials, priority, created_at, due_at, completed_at, reopened_count)
select 'follow_up', 'Action traitée #' || g, 'Terminé', 'neutral', 'NS', 10,
  now() - (g || ' hours')::interval - interval '24 minutes',
  now() - (g || ' hours')::interval + interval '30 minutes',
  now() - (g || ' hours')::interval + case when g % 6 = 0 then interval '50 minutes' else interval '0 minutes' end,
  case when g in (3, 11) then 1 else 0 end
from generate_series(1, 25) as g;

-- Demo client (owner) and faculty links for the listings above.
insert into public.landlords (full_name, phone, email, address, notes)
values ('Karim Ben Ali', '+216 22 111 222', 'karim.benali@email.com', 'El Manar 2, Tunis', 'Client de démonstration');

update public.listings set landlord_id = (select id from public.landlords where email = 'karim.benali@email.com')
where landlord_id is null;

insert into public.listing_universities (listing_id, university_id)
select id, university_id from public.listings where university_id is not null
on conflict do nothing;
