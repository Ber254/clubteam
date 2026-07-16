-- ClubTeam — Códigos de invitación y flujo de alta a grupos
--
-- Los que llegan por link de invitación todavía NO son miembros, así que las
-- políticas RLS no les permiten leer "grupos". Resolvemos con funciones RPC
-- SECURITY DEFINER de alcance mínimo, sin abrir las tablas.

-- =====================================================================
-- Código de invitación corto en grupos
-- =====================================================================

-- Alfabeto sin caracteres ambiguos (sin 0/O, 1/l/I) para compartir por chat.
create or replace function public.generate_invite_code()
returns text
language sql
volatile
as $$
  select string_agg(
    substr('abcdefghijkmnpqrstuvwxyz23456789', (floor(random() * 32) + 1)::int, 1),
    ''
  )
  from generate_series(1, 8);
$$;

alter table public.grupos
  add column codigo_invitacion text not null
    unique
    default public.generate_invite_code();

-- =====================================================================
-- RPC: crear grupo (grupo + membresía admin en una sola transacción)
-- =====================================================================

create or replace function public.create_group(p_nombre text)
returns table (id uuid, codigo text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_codigo text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if trim(coalesce(p_nombre, '')) = '' then
    raise exception 'El nombre del grupo no puede estar vacío';
  end if;

  insert into public.grupos (nombre, creado_por)
  values (trim(p_nombre), auth.uid())
  returning grupos.id, grupos.codigo_invitacion into v_grupo_id, v_codigo;

  insert into public.membresias (grupo_id, jugador_id, rol)
  values (v_grupo_id, auth.uid(), 'admin');

  return query select v_grupo_id, v_codigo;
end;
$$;

-- =====================================================================
-- RPC: consultar un grupo por código de invitación (previo a unirse)
-- Devuelve solo lo mínimo para la pantalla de "unirse".
-- =====================================================================

create or replace function public.get_group_by_invite(p_codigo text)
returns table (id uuid, nombre text, foto_url text, cantidad_miembros bigint, ya_es_miembro boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    g.id,
    g.nombre,
    g.foto_url,
    (select count(*) from public.membresias m where m.grupo_id = g.id),
    exists (
      select 1 from public.membresias m
      where m.grupo_id = g.id and m.jugador_id = auth.uid()
    )
  from public.grupos g
  where g.codigo_invitacion = p_codigo;
$$;

-- =====================================================================
-- RPC: unirse a un grupo por código
-- Actualiza el perfil del jugador y crea la membresía (rol 'miembro',
-- nivel_en_grupo default 5.0). Idempotente si ya era miembro.
-- =====================================================================

create or replace function public.join_group_by_invite(
  p_codigo text,
  p_nombre text,
  p_posicion text,
  p_posicion_secundaria text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select g.id into v_grupo_id
  from public.grupos g
  where g.codigo_invitacion = p_codigo;

  if v_grupo_id is null then
    raise exception 'Código de invitación inválido';
  end if;

  if trim(coalesce(p_nombre, '')) = '' then
    raise exception 'El nombre no puede estar vacío';
  end if;

  update public.jugadores
  set nombre = trim(p_nombre),
      posicion_preferida = p_posicion,
      posicion_secundaria = nullif(trim(coalesce(p_posicion_secundaria, '')), '')
  where id = auth.uid();

  insert into public.membresias (grupo_id, jugador_id, rol)
  values (v_grupo_id, auth.uid(), 'miembro')
  on conflict (grupo_id, jugador_id) do nothing;

  return v_grupo_id;
end;
$$;

-- =====================================================================
-- Permisos: solo usuarios autenticados pueden ejecutar estas RPCs
-- (por defecto Postgres otorga EXECUTE a public; lo restringimos)
-- =====================================================================

revoke execute on function public.generate_invite_code() from public, anon;
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.get_group_by_invite(text) from public, anon;
revoke execute on function public.join_group_by_invite(text, text, text, text) from public, anon;

grant execute on function public.create_group(text) to authenticated;
grant execute on function public.get_group_by_invite(text) to authenticated;
grant execute on function public.join_group_by_invite(text, text, text, text) to authenticated;
