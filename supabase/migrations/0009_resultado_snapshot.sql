-- ClubTeam — Snapshot del resultado en el propio partido
--
-- Los equipos todavía no se persisten (se arman en el cliente) y no hay
-- columnas para tarjetas/lesiones, así que guardamos el resultado cargado
-- ("¿Cómo salió?") como un JSON en el partido. Alcanza para pintar el
-- historial del muro (marcador, goleadores, anécdota) sin tocar el resto
-- del modelo. Cuando persistamos equipos, migramos a equipos_partido +
-- participaciones + RPC cargar_resultado.

alter table public.partidos
  add column if not exists resultado jsonb;
