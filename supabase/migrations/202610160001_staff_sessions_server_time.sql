-- Nestora · Backoffice : les horodatages de session staff viennent toujours de l'horloge Postgres.
-- Avant, le serveur Next.js écrivait last_seen_at avec sa propre horloge ; un PC décalé
-- faisait échouer is_verified_staff() (session vue comme inactive) → RPC « forbidden ».

-- ---------------------------------------------------------------------------
-- 1. last_seen_at / mfa_verified_at / revoked_at forcés à now() à l'écriture
-- ---------------------------------------------------------------------------
create or replace function public.staff_sessions_server_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.mfa_verified_at := now();
    new.last_seen_at := now();
  else
    if new.mfa_verified_at is distinct from old.mfa_verified_at then
      new.mfa_verified_at := now();
    end if;
    if new.last_seen_at is distinct from old.last_seen_at then
      new.last_seen_at := now();
    end if;
  end if;
  if new.revoked_at is not null and (tg_op = 'INSERT' or old.revoked_at is null) then
    new.revoked_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists staff_sessions_server_time on public.staff_sessions;
create trigger staff_sessions_server_time
before insert or update on public.staff_sessions
for each row execute function public.staff_sessions_server_time();

-- ---------------------------------------------------------------------------
-- 2. Inactivité calculée côté base (même horloge que is_verified_staff)
-- ---------------------------------------------------------------------------
create or replace function public.staff_session_idle_seconds(session_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select floor(extract(epoch from now() - last_seen_at))::int
  from public.staff_sessions
  where auth_session_id = session_id;
$$;

revoke execute on function public.staff_session_idle_seconds(uuid) from public, anon, authenticated;
grant execute on function public.staff_session_idle_seconds(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Réaligne les sessions ouvertes faussées par une horloge locale décalée
-- ---------------------------------------------------------------------------
update public.staff_sessions
set last_seen_at = now()
where revoked_at is null and last_seen_at < created_at;
