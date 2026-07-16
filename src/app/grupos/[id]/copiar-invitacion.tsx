"use client";

import { useState } from "react";

// Botón para ver/copiar el link de invitación (solo lo ve el admin).
// Se arma en el cliente para usar window.location.origin.
export function CopiarInvitacion({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  const [visible, setVisible] = useState(false);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${codigo}`
      : `/join/${codigo}`;

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setVisible(!visible)}
        className="w-full rounded-lg border border-black/15 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
      >
        {visible ? "Ocultar link de invitación" : "Link de invitación"}
      </button>

      {visible && (
        <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-blanco-cancha p-2 dark:border-white/15">
          <code className="min-w-0 flex-1 truncate text-xs opacity-80">
            {link}
          </code>
          <button
            onClick={copiar}
            className="shrink-0 rounded-md bg-verde-acento px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}
