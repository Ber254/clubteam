"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PartidoItem = { id: string; etiqueta: string };

// Perilla estilo TV de los 80 sobre el borde derecho del televisor.
// Solo la ve el creador (si no tiene partidos suspendibles, no se renderiza).
// Al accionarla, un diálogo lista las fechas planificadas para elegir cuál
// suspender. Suspender = estado 'suspendido' (sale del muro).
export function SuspenderFecha({ partidos }: { partidos: PartidoItem[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [suspendiendo, setSuspendiendo] = useState<string | null>(null);

  if (partidos.length === 0) return null;

  async function suspender(id: string) {
    setSuspendiendo(id);
    const { error } = await supabase
      .from("partidos")
      .update({ estado: "suspendido" })
      .eq("id", id);
    setSuspendiendo(null);
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
        title="Suspender una fecha"
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

      {/* Diálogo para elegir qué fecha suspender */}
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">¿Qué fecha suspendés?</h2>
            <p className="mt-1 text-sm opacity-60">
              El partido se saca del muro. Después podés armar otra fecha.
            </p>
            <div className="mt-3 space-y-2">
              {partidos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => suspender(p.id)}
                  disabled={suspendiendo !== null}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-black/15 px-3 py-3 text-left transition-colors hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
                >
                  <span className="font-medium">{p.etiqueta}</span>
                  <span className="shrink-0 text-sm font-medium text-red-500">
                    {suspendiendo === p.id ? "Suspendiendo…" : "Suspender"}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="mt-4 w-full rounded-lg border border-black/15 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
