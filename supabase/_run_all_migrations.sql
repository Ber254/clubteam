-- ClubTeam — TODAS las migraciones en orden (0001 -> 0006)
-- Pegá TODO esto en el SQL Editor de Supabase y tocá RUN. Se corre una sola vez.


-- ============================================================
-- migrations/0001_schema.sql
-- ============================================================

-- ClubTeam — Schema inicial
-- Modelo multi-tenant: los jugadores son independientes de los grupos y se
-- vinculan vía "membresias" (relación muchos-a-muchos). Un jugador puede
-- pertenecer a varios grupos.

-- =====================================================================
-- Tablas
-- =====================================================================

create table public.jugadores (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  avatar_url text,
  posicion_preferida text,
  posicion_secundaria text,
  nivel_global numeric default 5.0,
  created_at timestamptz default now()
);

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  foto_url text,
  creado_por uuid references public.jugadores(id),
  created_at timestamptz default now()
);

create table public.membresias (
  grupo_id uuid references public.grupos(id) on delete cascade,
  jugador_id uuid references public.jugadores(id) on delete cascade,
  rol text default 'miembro',
  nivel_en_grupo numeric default 5.0,
  fecha_ingreso timestamptz default now(),
  primary key (grupo_id, jugador_id)
);

create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid references public.grupos(id) on delete cascade,
  fecha timestamptz not null,
  cancha text,
  created_at timestamptz default now()
);

create table public.equipos_partido (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid references public.partidos(id) on delete cascade,
  nombre_equipo text not null,
  goles_totales int default 0
);

create table public.participaciones (
  partido_id uuid references public.partidos(id) on delete cascade,
  jugador_id uuid references public.jugadores(id) on delete cascade,
  equipo_id uuid references public.equipos_partido(id) on delete cascade,
  goles int default 0,
  asistencias int default 0,
  posicion_jugada text,
  votos_mvp int default 0,
  primary key (partido_id, jugador_id)
);

-- Índices útiles para las consultas más frecuentes
create index idx_membresias_jugador on public.membresias (jugador_id);
create index idx_partidos_grupo on public.partidos (grupo_id);
create index idx_equipos_partido on public.equipos_partido (partido_id);
create index idx_participaciones_jugador on public.participaciones (jugador_id);
create index idx_participaciones_equipo on public.participaciones (equipo_id);

-- =====================================================================
-- Trigger: crear fila en "jugadores" cuando se registra un usuario nuevo
-- Así siempre existe un perfil con "nombre" tras el primer login.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.jugadores (id, nombre, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- migrations/0002_rls.sql
-- ============================================================

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


-- ============================================================
-- migrations/0003_invitaciones.sql
-- ============================================================

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


-- ============================================================
-- migrations/0004_partidos_equipos.sql
-- ============================================================

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


-- ============================================================
-- migrations/0005_resultados.sql
-- ============================================================

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


-- ============================================================
-- migrations/0006_partido_first.sql
-- ============================================================

-- ClubTeam — Pivot a PARTIDO-FIRST + features del flujo nuevo
--
-- El punto de entrada pasa a ser el PARTIDO (con su propio link). El "grupo"
-- (banda) se crea solo por debajo y persiste para reconvocar. Roles simples,
-- titulares/suplentes gestionables, lesiones e infracciones, y el muro del
-- partido. Reusa helpers de migrations previas: generate_invite_code() (0003)
-- y can_access_partido() (0002).

-- =====================================================================
-- partidos: link propio, mínimo de jugadores, creador, estado 'convocando'
-- =====================================================================

alter table public.partidos
  add column if not exists codigo_invitacion text unique default public.generate_invite_code(),
  add column if not exists minimo int not null default 10
    check (minimo >= 4 and minimo <= 30 and minimo % 2 = 0),
  add column if not exists creado_por uuid references public.jugadores(id);

-- grupo_id pasa a nullable (por si algún día hay "fecha libre" sin banda)
alter table public.partidos alter column grupo_id drop not null;

-- Flujo de estados: convocando -> confirmado (equipos armados) -> jugado
alter table public.partidos drop constraint if exists partidos_estado_check;
alter table public.partidos alter column estado set default 'convocando';
alter table public.partidos
  add constraint partidos_estado_check
    check (estado in ('convocando', 'confirmado', 'jugado'));

-- =====================================================================
-- jugadores: teléfono opcional (dato de perfil, no se usa para login)
-- =====================================================================

alter table public.jugadores
  add column if not exists telefono text;

-- =====================================================================
-- grupos (bandas): nombres de equipo por defecto, persisten entre partidos
-- =====================================================================

alter table public.grupos
  add column if not exists nombre_equipo_a text default 'Claros',
  add column if not exists nombre_equipo_b text default 'Oscuros';

-- =====================================================================
-- participaciones: titular/suplente, lesión, tarjeta, orden de anotación
-- (equipo_id ya es nullable en 0001: "anotado sin equipo" hasta el armado)
-- =====================================================================

alter table public.participaciones
  add column if not exists es_titular boolean not null default true,
  add column if not exists lesionado boolean not null default false,
  add column if not exists tarjeta text check (tarjeta in ('amarilla', 'roja')),
  add column if not exists anotado_en timestamptz default now();

-- =====================================================================
-- equipos_partido: goles "sin autor / en contra" del equipo
-- =====================================================================

alter table public.equipos_partido
  add column if not exists goles_sin_autor int not null default 0;

-- =====================================================================
-- comentarios: el muro del partido
-- "Lo que pasa en el partido, queda en el partido."
-- =====================================================================

create table if not exists public.comentarios (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id) on delete cascade,
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 200),
  created_at timestamptz default now()
);

create index if not exists idx_comentarios_partido
  on public.comentarios (partido_id, created_at);

alter table public.comentarios enable row level security;

-- Ver/comentar: cualquiera que pueda acceder al partido (miembro de su banda)
create policy "comentarios_select" on public.comentarios
  for select to authenticated
  using (public.can_access_partido(partido_id));

create policy "comentarios_insert" on public.comentarios
  for insert to authenticated
  with check (public.can_access_partido(partido_id) and jugador_id = auth.uid());

create policy "comentarios_delete" on public.comentarios
  for delete to authenticated
  using (jugador_id = auth.uid());

-- =====================================================================
-- Trigger de perfil: soportar usuarios ANÓNIMOS (invitados, sin email)
-- El nombre real lo setea la RPC de anotarse; acá solo garantizamos la fila.
-- (Reemplaza la función de 0001 para no romper con is_anonymous.)
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.jugadores (id, nombre, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Jugador'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

