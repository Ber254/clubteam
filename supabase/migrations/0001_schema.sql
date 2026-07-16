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
