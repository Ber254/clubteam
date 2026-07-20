"use client";

import { useMemo } from "react";
import { POSICIONES, fraseDondeSea } from "@/lib/posiciones";

export const ICONOS_ROL: Record<string, string> = {
  Arquero: "🧤",
  Defensa: "🛡️",
  Ataque: "⚽",
  "Donde sea": "🔄",
};

// Cards de rol con ícono. "Donde sea" rota su etiqueta (frase futbolera)
// pero siempre guarda el valor canónico "Donde sea".
export function SelectorRol({
  value,
  onChange,
}: {
  value: string;
  onChange: (rol: string) => void;
}) {
  const etiquetaDondeSea = useMemo(() => fraseDondeSea(), []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {POSICIONES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`rounded-lg border py-3 text-center text-sm font-medium transition-colors ${
            value === p
              ? "border-verde-acento bg-verde-acento/10 text-verde-acento"
              : "border-black/15 hover:bg-black/5"
          }`}
        >
          <span className="mb-1 block text-xl">{ICONOS_ROL[p]}</span>
          {p === "Donde sea" ? etiquetaDondeSea : p}
        </button>
      ))}
    </div>
  );
}
