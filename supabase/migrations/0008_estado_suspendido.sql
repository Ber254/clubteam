-- Permitir suspender una fecha: nuevo estado 'suspendido'.
-- Flujo: convocando -> confirmado -> jugado ; cualquier fecha puede pasar
-- a 'suspendido' (el creador la saca del muro).
alter table public.partidos drop constraint if exists partidos_estado_check;
alter table public.partidos
  add constraint partidos_estado_check
    check (estado in ('convocando', 'confirmado', 'jugado', 'suspendido'));
