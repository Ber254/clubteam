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
      {/* Botón rojo en el borde derecho del televisor */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Suspender esta fecha"
        className="absolute right-2 top-1/2 flex h-24 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wide text-white transition-transform active:translate-y-[calc(-50%+1px)]"
        style={{
          background: "linear-gradient(#e23b3b, #b5261f)",
          border: "1.5px solid #7d1712",
          boxShadow:
            "inset 0 1px 1px rgba(255,255,255,.35), 0 2px 4px rgba(0,0,0,.45)",
          writingMode: "vertical-rl",
        }}
      >
        Suspender fecha
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
