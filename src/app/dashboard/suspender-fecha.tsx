"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Perilla estilo TV de los 80 sobre el borde derecho del televisor.
// Suspende ESTA fecha (la de su propio TV). Solo se renderiza para el creador.
export function SuspenderFecha({
  partidoId,
  etiqueta,
}: {
  partidoId: string;
  etiqueta: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [suspendiendo, setSuspendiendo] = useState(false);

  async function suspender() {
    setSuspendiendo(true);
    const { error } = await supabase
      .from("partidos")
      .update({ estado: "suspendido" })
      .eq("id", partidoId);
    setSuspendiendo(false);
    if (!error) {
      setAbierto(false);
      router.refresh();
    }
  }

  return (
    <>
      {/* Perilla en el borde derecho del televisor */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Suspender esta fecha"
        className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5"
      >
        <span
          className="size-7 rounded-full active:translate-y-px"
          style={{
            background: "radial-gradient(circle at 35% 30%, #e8e2d6, #b9ad99 60%, #8f8471)",
            border: "2px solid #2e2114",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,.6), 0 2px 3px rgba(0,0,0,.45)",
          }}
        />
        <span
          className="text-[9px] font-bold uppercase leading-none tracking-wide text-white/85"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Suspender fecha
        </span>
      </button>

      {/* Confirmación */}
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">¿Suspender esta fecha?</h2>
            <p className="mt-1 text-sm opacity-70">{etiqueta}</p>
            <p className="mt-2 text-sm opacity-60">
              El partido se saca del muro. Después podés armar otra fecha.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setAbierto(false)}
                disabled={suspendiendo}
                className="rounded-lg border border-black/15 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={suspender}
                disabled={suspendiendo}
                className="rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {suspendiendo ? "Suspendiendo…" : "Suspender"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
