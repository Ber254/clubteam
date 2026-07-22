-- ClubTeam — Invitación a nivel PARTIDO
--
-- El link de un partido usa partidos.codigo_invitacion y anota al invitado
-- directamente a ESE partido (además de sumarlo al club). Como el invitado
-- todavía no es miembro, RLS no lo deja leer partido/grupo ni insertarse:
-- se resuelve con RPCs security definer de alcance mínimo.

-- =====================================================================
-- RPC: datos mínimos del partido por su código de invitación
-- =====================================================================
create or replace function public.get_partido_by_invite(p_codigo text)
returns table (
  partido_id uuid,
  grupo_id uuid,
  grupo_nombre text,
  fecha timestamptz,
  cancha text,
  ya_anotado boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    p.grupo_id,
    g.nombre,
    p.fecha,
    p.cancha,
    exists (
      select 1 from public.participaciones pa
      where pa.partido_id = p.id and pa.jugador_id = auth.uid()
    )
  from public.partidos p
  join public.grupos g on g.id = p.grupo_id
  where p.codigo_invitacion = p_codigo;
$$;

-- =====================================================================
-- RPC: anotarse a un partido por su código
--   - Suma al club (membresía 'miembro') si no lo era.
--   - Actualiza nombre y, si estaba vacía, la posición preferida del perfil.
--   - Crea/actualiza la participación con la posición elegida para el partido.
--   Idempotente.
-- =====================================================================
create or replace function public.anotarse_por_invite(
  p_codigo text,
  p_nombre text,
  p_posicion text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partido_id uuid;
  v_grupo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select p.id, p.grupo_id into v_partido_id, v_grupo_id
  from public.partidos p
  where p.codigo_invitacion = p_codigo;

  if v_partido_id is null then
    raise exception 'Código de partido inválido';
  end if;

  if trim(coalesce(p_nombre, '')) = '' then
    raise exception 'El nombre no puede estar vacío';
  end if;

  update public.jugadores
  set nombre = trim(p_nombre),
      posicion_preferida = coalesce(nullif(posicion_preferida, ''), p_posicion)
  where id = auth.uid();

  insert into public.membresias (grupo_id, jugador_id, rol)
  values (v_grupo_id, auth.uid(), 'miembro')
  on conflict (grupo_id, jugador_id) do nothing;

  insert into public.participaciones (partido_id, jugador_id, posicion_jugada)
  values (v_partido_id, auth.uid(), p_posicion)
  on conflict (partido_id, jugador_id)
  do update set posicion_jugada = excluded.posicion_jugada;

  return v_partido_id;
end;
$$;

revoke execute on function public.get_partido_by_invite(text) from public, anon;
revoke execute on function public.anotarse_por_invite(text, text, text) from public, anon;
grant execute on function public.get_partido_by_invite(text) to authenticated;
grant execute on function public.anotarse_por_invite(text, text, text) to authenticated;
