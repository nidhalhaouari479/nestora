-- Nestora · Backoffice : plus d'expiration des sessions staff après 20 minutes d'inactivité.
-- Une session reste valide tant qu'elle passe la 2FA et n'est pas révoquée (déconnexion).

create or replace function public.is_verified_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_members m
    join public.staff_sessions s on s.user_id = m.user_id
    where m.user_id = auth.uid()
      and m.is_active
      and s.auth_session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.revoked_at is null
  );
$$;

drop function if exists public.staff_session_idle_seconds(uuid);
drop function if exists public.staff_idle_minutes();
