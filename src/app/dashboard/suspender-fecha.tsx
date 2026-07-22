"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
  const [error, setError] = useState("");

  async function suspender() {
    setSuspendiendo(true);
    setError("");
    const { data, error } = await supabase
      .from("partidos")
      .update({ estado: "suspendido" })
      .eq("id", partidoId)
      .select("id");
    setSuspendiendo(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data || data.length === 0) {
      // Update sin filas afectadas: casi siempre RLS bloqueando el update.
      setError("No se pudo suspender (permisos). Fijate que seas el creador.");
      return;
    }
    setAbierto(false);
    router.refresh();
  }

  return (
    <>
      {/* Botón rojo tipo etiqueta lateral del televisor */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Suspender esta fecha"
        className="flex h-14 w-14 items-center justify-center rounded-md p-1 text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-white transition-transform active:translate-y-[1px]"
        style={{
          background: "linear-gradient(#e23b3b, #b5261f)",
          border: "1.5px solid #7d1712",
          boxShadow:
            "inset 0 1px 1px rgba(255,255,255,.35), 0 2px 4px rgba(0,0,0,.45)",
        }}
      >
        Suspender fecha
      </button>

      {/* Confirmación: se renderiza en document.body (portal) para escapar
          del stack con transform del TV, que si no atrapa el position:fixed
          y deja el modal apretado en la franja de la derecha. */}
      {abierto &&
        createPortal(
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
              {error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}
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
          </div>,
          document.body
        )}
    </>
  );
}
