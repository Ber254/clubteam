import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { AccionesPartido } from "./acciones";

type ParticipacionRow = {
  jugador_id: string;
  equipo_id: string;
  posicion_jugada: string | null;
  goles: number | null;
  asistencias: number | null;
  jugadores: { nombre: string } | null;
};

type MembresiaRow = {
  jugador_id: string;
  nivel_en_grupo: number | null;
  jugadores: { nombre: string; posicion_preferida: string | null } | null;
};

type EquipoRow = {
  id: string;
  nombre_equipo: string;
  goles_totales: number | null;
};

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string; partidoId: string }>;
}) {
  const { id, partidoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partido } = await supabase
    .from("partidos")
    .select("id, grupo_id, fecha, cancha, estado")
    .eq("id", partidoId)
    .single();

  if (!partido || partido.grupo_id !== id) notFound();

  const [{ data: equipos }, { data: participaciones }, { data: membresias }] =
    await Promise.all([
      supabase
        .from("equipos_partido")
        .select("id, nombre_equipo, goles_totales")
        .eq("partido_id", partidoId)
        .order("nombre_equipo", { ascending: true })
        .returns<EquipoRow[]>(),
      supabase
        .from("participaciones")
        .select(
          "jugador_id, equipo_id, posicion_jugada, goles, asistencias, jugadores(nombre)",
        )
        .eq("partido_id", partidoId)
        .returns<ParticipacionRow[]>(),
      supabase
        .from("membresias")
        .select("jugador_id, nivel_en_grupo, jugadores(nombre, posicion_preferida)")
        .eq("grupo_id", id)
        .returns<MembresiaRow[]>(),
    ]);

  // Nivel por jugador (para mostrar el total por equipo y para re-generar)
  const nivelPorJugador = new Map(
    (membresias ?? []).map((m) => [m.jugador_id, Number(m.nivel_en_grupo ?? 5)]),
  );

  const equiposConJugadores = (equipos ?? []).map((equipo) => {
    const integrantes = (participaciones ?? []).filter(
      (p) => p.equipo_id === equipo.id,
    );
    return {
      ...equipo,
      integrantes,
      nivelTotal: integrantes.reduce(
        (suma, p) => suma + (nivelPorJugador.get(p.jugador_id) ?? 5),
        0,
      ),
    };
  });

  // Los que juegan este partido, con los datos que necesita re-generar
  const participantes = (participaciones ?? []).map((p) => {
    const membresia = (membresias ?? []).find(
      (m) => m.jugador_id === p.jugador_id,
    );
    return {
      id: p.jugador_id,
      nombre: p.jugadores?.nombre ?? "Jugador",
      posicion: membresia?.jugadores?.posicion_preferida ?? null,
      nivel: nivelPorJugador.get(p.jugador_id) ?? 5,
    };
  });

  const armando = partido.estado === "armando";
  const jugado = partido.estado === "jugado";
  const tieneEquipos = equiposConJugadores.length > 0;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <Link
          href={`/grupos/${id}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← Volver al grupo
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{formatFecha(partido.fecha)}</h1>
          {jugado && (
            <span className="rounded bg-verde-acento px-2 py-0.5 text-xs font-medium text-blanco-cancha">
              Jugado
            </span>
          )}
          {partido.estado === "confirmado" && (
            <span className="rounded bg-verde-acento/10 px-2 py-0.5 text-xs font-medium text-verde-acento">
              Confirmado
            </span>
          )}
        </div>
        {partido.cancha && (
          <p className="text-sm opacity-70">📍 {partido.cancha}</p>
        )}
      </header>

      {/* Marcador (solo cuando ya se jugó) */}
      {jugado && tieneEquipos && (
        <div className="flex items-center justify-center gap-4 rounded-lg border border-black/10 bg-blanco-cancha p-4 text-center dark:border-white/15">
          {equiposConJugadores.map((equipo, i) => (
            <div key={equipo.id} className="flex items-center gap-4">
              {i > 0 && <span className="text-2xl opacity-40">-</span>}
              <div>
                <p className="text-3xl font-bold">{equipo.goles_totales ?? 0}</p>
                <p className="text-xs opacity-60">{equipo.nombre_equipo}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!tieneEquipos ? (
        <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm opacity-70 dark:border-white/20">
          Este partido no tiene equipos armados.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {equiposConJugadores.map((equipo) => (
            <section
              key={equipo.id}
              className="space-y-2 rounded-lg border border-black/10 bg-blanco-cancha p-3 dark:border-white/15"
            >
              <header className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{equipo.nombre_equipo}</h2>
                {!jugado && (
                  <span
                    className="text-xs opacity-50"
                    title="Nivel total del equipo"
                  >
                    ⚖ {equipo.nivelTotal}
                  </span>
                )}
              </header>
              <ul className="space-y-2">
                {equipo.integrantes.map((p) => (
                  <li key={p.jugador_id} className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.jugadores?.nombre ?? "Jugador"}
                    </p>
                    <p className="truncate text-xs opacity-60">
                      {jugado
                        ? `⚽ ${p.goles ?? 0} · 🅰 ${p.asistencias ?? 0}`
                        : (p.posicion_jugada ?? "Sin posición")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Acciones según el estado del partido */}
      {armando && tieneEquipos && (
        <AccionesPartido partidoId={partido.id} participantes={participantes} />
      )}

      {!armando && tieneEquipos && (
        <Link
          href={`/grupos/${id}/partidos/${partidoId}/resultado`}
          className="block w-full rounded-lg bg-verde-acento py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
        >
          {jugado ? "Editar resultado" : "Cargar resultado"}
        </Link>
      )}
    </main>
  );
}
