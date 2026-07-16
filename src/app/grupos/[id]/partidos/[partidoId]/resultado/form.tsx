"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type EquipoConJugadores = {
  id: string;
  nombre: string;
  goles: number;
  jugadores: {
    id: string;
    nombre: string;
    goles: number;
    asistencias: number;
  }[];
};

// Estado editable: goles por equipo + goles/asistencias por jugador.
type EstadoEquipos = Record<string, number>;
type EstadoJugadores = Record<string, { goles: number; asistencias: number }>;

const inputNumero =
  "w-14 rounded-md border border-black/15 bg-blanco-cancha px-2 py-1.5 text-center text-base outline-none focus:border-verde-acento dark:border-white/20 dark:focus:border-white/50";

function parseNoNegativo(valor: string): number {
  const n = Math.floor(Number(valor));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function CargarResultadoForm({
  grupoId,
  partidoId,
  equipos,
  yaJugado,
}: {
  grupoId: string;
  partidoId: string;
  equipos: EquipoConJugadores[];
  yaJugado: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [golesEquipo, setGolesEquipo] = useState<EstadoEquipos>(() =>
    Object.fromEntries(equipos.map((e) => [e.id, e.goles])),
  );
  const [statsJugador, setStatsJugador] = useState<EstadoJugadores>(() =>
    Object.fromEntries(
      equipos.flatMap((e) =>
        e.jugadores.map((j) => [
          j.id,
          { goles: j.goles, asistencias: j.asistencias },
        ]),
      ),
    ),
  );
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function setGoles(equipoId: string, valor: string) {
    setGolesEquipo((prev) => ({ ...prev, [equipoId]: parseNoNegativo(valor) }));
  }

  function setStat(
    jugadorId: string,
    campo: "goles" | "asistencias",
    valor: string,
  ) {
    setStatsJugador((prev) => ({
      ...prev,
      [jugadorId]: { ...prev[jugadorId], [campo]: parseNoNegativo(valor) },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg("");

    const { error } = await supabase.rpc("cargar_resultado", {
      p_partido_id: partidoId,
      p_equipos: equipos.map((eq) => ({
        equipo_id: eq.id,
        goles: golesEquipo[eq.id] ?? 0,
      })),
      p_jugadores: Object.entries(statsJugador).map(([jugador_id, s]) => ({
        jugador_id,
        goles: s.goles,
        asistencias: s.asistencias,
      })),
    });

    if (error) {
      setErrorMsg(error.message);
      setEnviando(false);
      return;
    }

    router.push(`/grupos/${grupoId}/partidos/${partidoId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Marcador por equipo */}
      <section className="flex items-center justify-center gap-4 rounded-lg border border-black/10 bg-blanco-cancha p-4 dark:border-white/15">
        {equipos.map((eq, i) => (
          <div key={eq.id} className="flex items-center gap-4">
            {i > 0 && <span className="text-2xl opacity-40">-</span>}
            <div className="space-y-1 text-center">
              <label
                htmlFor={`goles-${eq.id}`}
                className="block text-xs font-medium opacity-70"
              >
                {eq.nombre}
              </label>
              <input
                id={`goles-${eq.id}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={golesEquipo[eq.id] ?? 0}
                onChange={(ev) => setGoles(eq.id, ev.target.value)}
                className={`${inputNumero} w-16 text-xl font-bold`}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Goles y asistencias por jugador */}
      {equipos.map((eq) => (
        <section key={eq.id} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
            {eq.nombre}
          </h2>
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-blanco-cancha dark:divide-white/10 dark:border-white/15">
            <li className="flex items-center gap-2 px-4 py-2 text-xs opacity-50">
              <span className="flex-1">Jugador</span>
              <span className="w-14 text-center">Goles</span>
              <span className="w-14 text-center">Asist.</span>
            </li>
            {eq.jugadores.map((j) => (
              <li key={j.id} className="flex items-center gap-2 px-4 py-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {j.nombre}
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`Goles de ${j.nombre}`}
                  value={statsJugador[j.id]?.goles ?? 0}
                  onChange={(ev) => setStat(j.id, "goles", ev.target.value)}
                  className={inputNumero}
                />
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`Asistencias de ${j.nombre}`}
                  value={statsJugador[j.id]?.asistencias ?? 0}
                  onChange={(ev) =>
                    setStat(j.id, "asistencias", ev.target.value)
                  }
                  className={inputNumero}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {yaJugado && (
        <p className="text-center text-xs opacity-60">
          Estás editando un resultado ya cargado. Los goles y asistencias se
          actualizan; el nivel de los jugadores no se vuelve a ajustar.
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? "Guardando…" : "Guardar resultado"}
      </button>

      {errorMsg && (
        <p className="text-center text-sm text-red-500">{errorMsg}</p>
      )}
    </form>
  );
}
