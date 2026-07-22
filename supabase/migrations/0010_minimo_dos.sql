-- ClubTeam — Permitir partidos de 1 vs 1 (mínimo 2) para pruebas
-- El check original exigía minimo >= 4; lo bajamos a 2 (sigue siendo par).

alter table public.partidos
  drop constraint if exists partidos_minimo_check;

alter table public.partidos
  add constraint partidos_minimo_check
    check (minimo >= 2 and minimo <= 30 and minimo % 2 = 0);
