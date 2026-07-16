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
