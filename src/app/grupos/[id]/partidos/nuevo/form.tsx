"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generarEquipos, type JugadorBalanceo } from "@/lib/equipos";

const MINIMO_CONFIRMADOS = 4;

export function NuevoPartidoForm({
  grupoId,
  jugadores,
}: {
  grupoId: string;
  jugadores: JugadorBalanceo[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [fecha, setFecha] = useState("");
  const [cancha, setCancha] = useState("");
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function toggle(id: string) {
    setConfirmados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  }

  const puedeGenerar =
    fecha !== "" && confirmados.size >= MINIMO_CONFIRMADOS && !enviando;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg("");

    // Balanceo en el cliente; la RPC valida y guarda todo en una transacción.
    const { equipoA, equipoB } = generarEquipos(
      jugadores.filter((j) => confirmados.has(j.id)),
    );

    const { data: partidoId, error } = await supabase.rpc(
      "crear_partido_con_equipos",
      {
        p_grupo_id: grupoId,
        p_fecha: new Date(fecha).toISOString(),
        p_cancha: cancha || null,
        p_equipo_a: equipoA.map((j) => j.id),
        p_equipo_b: equipoB.map((j) => j.id),
      },
    );

    if (error || !partidoId) {
      setErrorMsg(error?.message ?? "No se pudo crear el partido.");
      setEnviando(false);
      return;
    }

    router.push(`/grupos/${grupoId}/partidos/${partidoId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="fecha" className="text-sm font-medium">
          Fecha y hora
        </label>
        <input
          id="fecha"
          type="datetime-local"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-4 py-3 text-base outline-none focus:border-verde-acento dark:border-white/20 dark:focus:border-white/50 dark:[color-scheme:dark]"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="cancha" className="text-sm font-medium">
          Cancha <span className="opacity-50">(opcional)</span>
        </label>
        <input
          id="cancha"
          type="text"
          maxLength={80}
          value={cancha}
          onChange={(e) => setCancha(e.target.value)}
          placeholder="Ej: El Templo, calle 12 y 60"
          className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-4 py-3 text-base outline-none focus:border-verde-acento dark:border-white/20 dark:focus:border-white/50"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Confirmados ({confirmados.size})
        </legend>
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-blanco-cancha dark:divide-white/10 dark:border-white/15">
          {jugadores.map((j) => (
            <li key={j.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={confirmados.has(j.id)}
                  onChange={() => toggle(j.id)}
                  className="size-5 accent-current"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{j.nombre}</span>
                  <span className="block text-sm opacity-60">
                    {j.posicion ?? "Sin posición"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <button
        type="submit"
        disabled={!puedeGenerar}
        className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enviando
          ? "Generando…"
          : confirmados.size < MINIMO_CONFIRMADOS
            ? `Generar equipos (mínimo ${MINIMO_CONFIRMADOS})`
            : "Generar equipos"}
      </button>

      {errorMsg && (
        <p className="text-center text-sm text-red-500">{errorMsg}</p>
      )}
    </form>
  );
}
