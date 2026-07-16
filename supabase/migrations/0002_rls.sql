-- ClubTeam — Row Level Security
-- Regla general: un jugador solo ve/edita datos de los grupos donde tiene
-- una fila en "membresias". Ninguna tabla queda abierta.

-- =====================================================================
-- Helpers (SECURITY DEFINER para evitar recursión entre políticas RLS)
-- =====================================================================

-- ¿El usuario actual es miembro de este grupo?
create or replace function public.is_group_member(p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.membresias
    where grupo_id = p_grupo_id
      and jugador_id = auth.uid()
  );
$$;

-- ¿El usuario actual es admin de este grupo?
create or replace function public.is_group_admin(p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.membresias
    where grupo_id = p_grupo_id
      and jugador_id = auth.uid()
      and rol = 'admin'
  );
$$;

-- ¿El usuario actual comparte algún grupo con otro jugador?
-- (para poder ver los perfiles de sus compañeros)
create or replace function public.shares_group_with(p_jugador_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.membresias m1
    join public.membresias m2 on m1.grupo_id = m2.grupo_id
    where m1.jugador_id = auth.uid()
      and m2.jugador_id = p_jugador_id
  );
$$;

-- ¿El usuario actual puede acceder a este partido (es miembro de su grupo)?
create or replace function public.can_access_partido(p_partido_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.partidos p
    where p.id = p_partido_id
      and public.is_group_member(p.grupo_id)
  );
$$;

-- =====================================================================
-- Activar RLS en todas las tablas
-- =====================================================================

alter table public.jugadores        enable row level security;
alter table public.grupos           enable row level security;
alter table public.membresias       enable row level security;
alter table public.partidos         enable row level security;
alter table public.equipos_partido  enable row level security;
alter table public.participaciones  enable row level security;

-- =====================================================================
-- jugadores
-- =====================================================================

-- Ver: mi propio perfil o el de compañeros de grupo
create policy "jugadores_select" on public.jugadores
  for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

-- Insertar: solo mi propio perfil (normalmente lo crea el trigger)
create policy "jugadores_insert" on public.jugadores
  for insert to authenticated
  with check (id = auth.uid());

-- Editar: solo mi propio perfil
create policy "jugadores_update" on public.jugadores
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- =====================================================================
-- grupos
-- =====================================================================

create policy "grupos_select" on public.grupos
  for select to authenticated
  using (public.is_group_member(id) or creado_por = auth.uid());

create policy "grupos_insert" on public.grupos
  for insert to authenticated
  with check (creado_por = auth.uid());

create policy "grupos_update" on public.grupos
  for update to authenticated
  using (public.is_group_admin(id) or creado_por = auth.uid())
  with check (public.is_group_admin(id) or creado_por = auth.uid());

create policy "grupos_delete" on public.grupos
  for delete to authenticated
  using (creado_por = auth.uid());

-- =====================================================================
-- membresias
-- =====================================================================

-- Ver: mis propias membresías o las de grupos donde soy miembro
create policy "membresias_select" on public.membresias
  for select to authenticated
  using (jugador_id = auth.uid() or public.is_group_member(grupo_id));

-- Insertar: puedo sumarme yo mismo (vía invitación) o un admin suma gente
create policy "membresias_insert" on public.membresias
  for insert to authenticated
  with check (jugador_id = auth.uid() or public.is_group_admin(grupo_id));

-- Editar (rol, nivel_en_grupo): solo admins del grupo
create policy "membresias_update" on public.membresias
  for update to authenticated
  using (public.is_group_admin(grupo_id))
  with check (public.is_group_admin(grupo_id));

-- Borrar: un admin saca a alguien, o yo me voy del grupo
create policy "membresias_delete" on public.membresias
  for delete to authenticated
  using (public.is_group_admin(grupo_id) or jugador_id = auth.uid());

-- =====================================================================
-- partidos
-- =====================================================================

create policy "partidos_select" on public.partidos
  for select to authenticated
  using (public.is_group_member(grupo_id));

create policy "partidos_insert" on public.partidos
  for insert to authenticated
  with check (public.is_group_member(grupo_id));

create policy "partidos_update" on public.partidos
  for update to authenticated
  using (public.is_group_member(grupo_id))
  with check (public.is_group_member(grupo_id));

create policy "partidos_delete" on public.partidos
  for delete to authenticated
  using (public.is_group_admin(grupo_id) or public.is_group_member(grupo_id));

-- =====================================================================
-- equipos_partido (acceso derivado del partido -> grupo)
-- =====================================================================

create policy "equipos_partido_select" on public.equipos_partido
  for select to authenticated
  using (public.can_access_partido(partido_id));

create policy "equipos_partido_insert" on public.equipos_partido
  for insert to authenticated
  with check (public.can_access_partido(partido_id));

create policy "equipos_partido_update" on public.equipos_partido
  for update to authenticated
  using (public.can_access_partido(partido_id))
  with check (public.can_access_partido(partido_id));

create policy "equipos_partido_delete" on public.equipos_partido
  for delete to authenticated
  using (public.can_access_partido(partido_id));

-- =====================================================================
-- participaciones (acceso derivado del partido -> grupo)
-- =====================================================================

create policy "participaciones_select" on public.participaciones
  for select to authenticated
  using (public.can_access_partido(partido_id));

create policy "participaciones_insert" on public.participaciones
  for insert to authenticated
  with check (public.can_access_partido(partido_id));

create policy "participaciones_update" on public.participaciones
  for update to authenticated
  using (public.can_access_partido(partido_id))
  with check (public.can_access_partido(partido_id));

create policy "participaciones_delete" on public.participaciones
  for delete to authenticated
  using (public.can_access_partido(partido_id));
