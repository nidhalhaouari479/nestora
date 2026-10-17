-- Nestora · Backoffice : tous les rôles de l'équipe ont le même accès que super_admin.
-- Les rôles restent affichés (libellé), mais les permissions sont identiques.

-- ---------------------------------------------------------------------------
-- 1. Copie de toutes les permissions super_admin vers chaque rôle
-- ---------------------------------------------------------------------------
insert into public.staff_role_permissions (role, permission)
select r.role, p.permission
from unnest(enum_range(null::public.staff_role)) as r(role)
cross join (select permission from public.staff_role_permissions where role = 'super_admin') as p
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Toute permission ajoutée plus tard à super_admin est donnée aux autres rôles
-- ---------------------------------------------------------------------------
create or replace function public.sync_super_admin_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.staff_role_permissions (role, permission)
  select r.role, new.permission
  from unnest(enum_range(null::public.staff_role)) as r(role)
  where r.role <> 'super_admin'
  on conflict do nothing;
  return new;
end;
$$;

create trigger staff_role_permissions_sync_super_admin
after insert on public.staff_role_permissions
for each row when (new.role = 'super_admin')
execute function public.sync_super_admin_permission();
