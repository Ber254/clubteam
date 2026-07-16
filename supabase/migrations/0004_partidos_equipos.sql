-- ClubTeam — Armado de partidos y equipos balanceados
--
-- El balanceo se calcula en el cliente (src/lib/equipos.ts); estas RPCs
-- validan y persisten el resultado de forma atómica. La validación server-side
-- importa: la política RLS de "participaciones" permite insertar a cualquier
-- miembro del grupo, pero no verifica que los jugadores insertados sean
-- miembros — estas funciones sí.

-- =====================================================================
-- Estado del partido: 'armando' (se pueden regenerar equipos) o
-- 'confirmado' (definitivo)
-- =====================================================================

alter table public.partidos
  add column estado text not null default 'armando'
    check (estado in ('armando', 'confirmado'));

-- =====================================================================
-- RPC: guardar equipos de un partido (atómico, re-ejecutable)
-- Borra el armado anterior y crea Equipo A / Equipo B + participaciones.
-- =====================================================================

create or replace function public.guardar_equipos(
  p_partido_id uuid,
  p_equipo_a uuid[],
  p_equipo_b uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_estado text;
  v_len_a int := coalesce(array_length(p_equipo_a, 1), 0);
  v_len_b int := coalesce(array_length(p_equipo_b, 1), 0);
  v_total int;
  v_miembros int;
  v_equipo_a_id uuid;
  v_equipo_b_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select p.grupo_id, p.estado into v_grupo_id, v_estado
  from public.partidos p
  where p.id = p_partido_id;

  if v_grupo_id is null then
    raise exception 'El partido no existe';
  end if;

  if not public.is_group_member(v_grupo_id) then
    raise exception 'No sos miembro de este grupo';
  end if;

  if v_estado = 'confirmado' then
    raise exception 'El partido ya fue confirmado, no se pueden regenerar los equipos';
  end if;

  v_total := v_len_a + v_len_b;

  if v_total < 4 then
    raise exception 'Se necesitan al menos 4 jugadores confirmados';
  end if;

  if abs(v_len_a - v_len_b) > 1 then
    raise exception 'Los equipos deben quedar parejos en cantidad';
  end if;

  if p_equipo_a && p_equipo_b then
    raise exception 'Un jugador no puede estar en los dos equipos';
  end if;

  if (select count(distinct x) from unnest(p_equipo_a || p_equipo_b) x) <> v_total then
    raise exception 'Hay jugadores repetidos';
  end if;

  select count(*) into v_miembros
  from public.membresias m
  where m.grupo_id = v_grupo_id
    and m.jugador_id = any (p_equipo_a || p_equipo_b);

  if v_miembros <> v_total then
    raise exception 'Todos los jugadores deben ser miembros del grupo';
  end if;

  -- Re-generar: el armado anterior se reemplaza dentro de esta transacción
  delete from public.participaciones where partido_id = p_partido_id;
  delete from public.equipos_partido where partido_id = p_partido_id;

  insert into public.equipos_partido (partido_id, nombre_equipo)
  values (p_partido_id, 'Equipo A')
  returning id into v_equipo_a_id;

  insert into public.equipos_partido (partido_id, nombre_equipo)
  values (p_partido_id, 'Equipo B')
  returning id into v_equipo_b_id;

  -- posicion_jugada: la posición preferida del jugador al momento del armado
  insert into public.participaciones (partido_id, jugador_id, equipo_id, posicion_jugada)
  select p_partido_id, j.id, v_equipo_a_id, j.posicion_preferida
  from public.jugadores j
  where j.id = any (p_equipo_a);

  insert into public.participaciones (partido_id, jugador_id, equipo_id, posicion_jugada)
  select p_partido_id, j.id, v_equipo_b_id, j.posicion_preferida
  from public.jugadores j
  where j.id = any (p_equipo_b);
end;
$$;

-- =====================================================================
-- RPC: crear partido + equipos en una sola transacción
-- =====================================================================

create or replace function public.crear_partido_con_equipos(
  p_grupo_id uuid,
  p_fecha timestamptz,
  p_cancha text,
  p_equipo_a uuid[],
  p_equipo_b uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partido_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not public.is_group_member(p_grupo_id) then
    raise exception 'No sos miembro de este grupo';
  end if;

  if p_fecha is null then
    raise exception 'La fecha del partido es obligatoria';
  end if;

  insert into public.partidos (grupo_id, fecha, cancha)
  values (p_grupo_id, p_fecha, nullif(trim(coalesce(p_cancha, '')), ''))
  returning id into v_partido_id;

  perform public.guardar_equipos(v_partido_id, p_equipo_a, p_equipo_b);

  return v_partido_id;
end;
$$;

-- =====================================================================
-- Permisos
-- =====================================================================

revoke execute on function public.guardar_equipos(uuid, uuid[], uuid[]) from public, anon;
revoke execute on function public.crear_partido_con_equipos(uuid, timestamptz, text, uuid[], uuid[]) from public, anon;

grant execute on function public.guardar_equipos(uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.crear_partido_con_equipos(uuid, timestamptz, text, uuid[], uuid[]) to authenticated;
