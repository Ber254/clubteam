import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";

type PartidoRow = { id: string; fecha: string; cancha: string | null };
type EquipoRow = {
  id: string;
  partido_id: string;
  nombre_equipo: string;
  goles_totales: number | null;
};
type GoleadorRow = {
  partido_id: string;
  goles: number | null;
  jugadores: { nombre: string } | null;
};

export default async function HistorialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, nombre")
    .eq("id", id)
    .single();
  if (!grupo) notFound();

  const { data: partidos } = await supabase
    .from("partidos")
    .select("id, fecha, cancha")
    .eq("grupo_id", id)
    .eq("estado", "jugado")
    .order("fecha", { ascending: false })
    .returns<PartidoRow[]>();

  const partidoIds = (partidos ?? []).map((p) => p.id);

  // Equipos y goleadores de todos los partidos jugados, en dos consultas.
  const [{ data: equipos }, { data: goleadores }] =
    partidoIds.length > 0
      ? await Promise.all([
          supabase
            .from("equipos_partido")
            .select("id, partido_id, nombre_equipo, goles_totales")
            .in("partido_id", partidoIds)
            .order("nombre_equipo", { ascending: true })
            .returns<EquipoRow[]>(),
          supabase
            .from("participaciones")
            .select("partido_id, goles, jugadores(nombre)")
            .in("partido_id", partidoIds)
            .gt("goles", 0)
            .returns<GoleadorRow[]>(),
        ])
      : [{ data: [] as EquipoRow[] }, { data: [] as GoleadorRow[] }];

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <Link
          href={`/grupos/${id}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← {grupo.nombre}
        </Link>
        <h1 className="text-2xl font-bold">Historial</h1>
      </header>

      {(partidos ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm opacity-70 dark:border-white/20">
          Todavía no hay partidos jugados. Cuando cargues el resultado de un
          partido, va a aparecer acá.
        </p>
      ) : (
        <ul className="space-y-3">
          {(partidos ?? []).map((p) => {
            const eqs = (equipos ?? []).filter((e) => e.partido_id === p.id);
            const gols = (goleadores ?? [])
              .filter((g) => g.partido_id === p.id)
              .map(
                (g) => `${g.jugadores?.nombre ?? "Jugador"} (${g.goles})`,
              );

            return (
              <li key={p.id}>
                <Link
                  href={`/grupos/${id}/partidos/${p.id}`}
                  className="block space-y-2 rounded-lg border border-black/10 bg-blanco-cancha p-4 transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs opacity-60">
                      {formatFecha(p.fecha)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-lg font-semibold">
                    {eqs.map((e, i) => (
                      <span key={e.id} className="flex items-center gap-3">
                        {i > 0 && <span className="opacity-40">-</span>}
                        <span>
                          {e.nombre_equipo}{" "}
                          <span className="tabular-nums">
                            {e.goles_totales ?? 0}
                          </span>
                        </span>
                      </span>
                    ))}
                  </div>
                  {gols.length > 0 && (
                    <p className="text-center text-xs opacity-60">
                      ⚽ {gols.join(" · ")}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
