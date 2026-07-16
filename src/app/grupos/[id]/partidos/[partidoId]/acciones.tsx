"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generarEquipos, type JugadorBalanceo } from "@/lib/equipos";

// Botones de la pantalla de resultado mientras el partido está "armando":
// re-generar (nuevo reparto aleatorio) y confirmar (deja todo definitivo).
export function AccionesPartido({
  partidoId,
  participantes,
}: {
  partidoId: string;
  participantes: JugadorBalanceo[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [ocupado, setOcupado] = useState<"regenerar" | "confirmar" | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function regenerar() {
    setOcupado("regenerar");
    setErrorMsg("");

    const { equipoA, equipoB } = generarEquipos(participantes);
    const { error } = await supabase.rpc("guardar_equipos", {
      p_partido_id: partidoId,
      p_equipo_a: equipoA.map((j) => j.id),
      p_equipo_b: equipoB.map((j) => j.id),
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.refresh();
    }
    setOcupado(null);
  }

  async function confirmar() {
    setOcupado("confirmar");
    setErrorMsg("");

    // Update simple protegido por RLS (cualquier miembro puede confirmar).
    const { error } = await supabase
      .from("partidos")
      .update({ estado: "confirmado" })
      .eq("id", partidoId);

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.refresh();
    }
    setOcupado(null);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={regenerar}
          disabled={ocupado !== null}
          className="rounded-lg border border-black/15 py-3 font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5"
        >
          {ocupado === "regenerar" ? "Mezclando…" : "🎲 Re-generar"}
        </button>
        <button
          onClick={confirmar}
          disabled={ocupado !== null}
          className="rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {ocupado === "confirmar" ? "Confirmando…" : "Confirmar equipos"}
        </button>
      </div>

      {errorMsg && (
        <p className="text-center text-sm text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}
