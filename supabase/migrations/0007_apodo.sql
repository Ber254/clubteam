-- ClubTeam — Apodo del jugador ("Como te dicen en la cancha")
-- Se pide una sola vez, obligatorio, en el primer login (ver onboarding modal).

alter table public.jugadores
  add column if not exists apodo text;
