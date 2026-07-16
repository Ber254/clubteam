-- ClubTeam — Carga de resultados, ajuste de nivel e historial/ranking
--
-- Cierra el ciclo del partido: 'confirmado' -> 'jugado' (con resultado).
-- La carga se hace vía RPC security definer para: (a) hacerlo atómico,
-- (b) ajustar el nivel_en_grupo de OTROS jugadores (que RLS no dejaría tocar
-- directamente), y (c) validar todo del lado del servidor.

-- =====================================================================
-- Nuevo estado 'jugado' (partido con resultado cargado)
-- =====================================================================

alter table public.partidos
  drop constraint if exists partidos_estado_check;

alter table public.partidos
  add constraint partidos_estado_check
    check (estado in ('armando', 'confirmado', 'jugado'));

-- =====================================================================
-- RPC: cargar/editar el resultado de un partido
--   p_equipos:  [{"equipo_id": uuid, "goles": int}, ...]
--   p_jugadores:[{"jugador_id": uuid, "goles": int, "asistencias": int}, ...]
-- =====================================================================

create or replace function public.cargar_resultado(
  p_partido_id uuid,
  p_equipos jsonb,
  p_jugadores jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_estado text;
  v_goles_max int;
  v_goles_min int;
  v_es_empate boolean;
  v_aplicar_nivel boolean;
  rec record;
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

  if v_estado not in ('confirmado', 'jugado') then
    raise exception 'Primero confirmá los equipos del partido';
  end if;

  -- El ajuste de nivel se aplica SOLO la primera vez (confirmado -> jugado).
  -- En re-ediciones (ya 'jugado') se actualizan goles/asistencias pero no se
  -- vuelve a mover el nivel, para no acumular +0.1 en cada guardada.
  v_aplicar_nivel := (v_estado <> 'jugado');

  -- 1) Goles totales por equipo
  update public.equipos_partido e
  set goles_totales = greatest(0, x.goles)
  from jsonb_to_recordset(p_equipos) as x(equipo_id uuid, goles int)
  where e.id = x.equipo_id
    and e.partido_id = p_partido_id;

  -- 2) Goles y asistencias por jugador
  update public.participaciones pa
  set goles = greatest(0, x.goles),
      asistencias = greatest(0, x.asistencias)
  from jsonb_to_recordset(p_jugadores)
    as x(jugador_id uuid, goles int, asistencias int)
  where pa.partido_id = p_partido_id
    and pa.jugador_id = x.jugador_id;

  -- 3) Ajuste de nivel según resultado (asume 2 equipos)
  select max(goles_totales), min(goles_totales)
  into v_goles_max, v_goles_min
  from public.equipos_partido
  where partido_id = p_partido_id;

  v_es_empate := (v_goles_max = v_goles_min);

  if v_aplicar_nivel and not v_es_empate then
    for rec in
      select pa.jugador_id, e.goles_totales
      from public.participaciones pa
      join public.equipos_partido e on e.id = pa.equipo_id
      where pa.partido_id = p_partido_id
    loop
      update public.membresias m
      set nivel_en_grupo = least(10, greatest(1,
        m.nivel_en_grupo
        + case when rec.goles_totales = v_goles_max then 0.1 else -0.1 end
      ))
      where m.grupo_id = v_grupo_id
        and m.jugador_id = rec.jugador_id;
    end loop;
  end if;

  -- 4) Marcar el partido como jugado
  update public.partidos
  set estado = 'jugado'
  where id = p_partido_id;
end;
$$;

revoke execute on function public.cargar_resultado(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.cargar_resultado(uuid, jsonb, jsonb) to authenticated;

-- =====================================================================
-- Vista: ranking del grupo (goles/asistencias/partidos por jugador)
--
-- security_invoker = true: la vista respeta las políticas RLS de las tablas
-- base según el usuario que consulta (no el dueño de la vista). Sin esto,
-- expondría datos de todos los grupos. Requiere Postgres 15+ (Supabase OK).
-- =====================================================================

create or replace view public.ranking_grupo
with (security_invoker = true) as
select
  m.grupo_id,
  m.jugador_id,
  j.nombre,
  count(pa.partido_id) as partidos_jugados,
  coalesce(sum(pa.goles), 0)::int as goles,
  coalesce(sum(pa.asistencias), 0)::int as asistencias
from public.membresias m
join public.jugadores j on j.id = m.jugador_id
left join public.partidos p
  on p.grupo_id = m.grupo_id
  and p.estado = 'jugado'
left join public.participaciones pa
  on pa.partido_id = p.id
  and pa.jugador_id = m.jugador_id
group by m.grupo_id, m.jugador_id, j.nombre;

grant select on public.ranking_grupo to authenticated;
