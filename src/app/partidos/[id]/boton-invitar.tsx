"use client";

import { useState } from "react";

// Botón destacado (estilo TV del muro) que copia el mensaje de invitación
// y confirma con un toast de 3s, en vez de solo "copiar link".
export function BotonInvitar({ mensaje }: { mensaje: string }) {
  const [toast, setToast] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje);
    } catch {
      // noop: si el navegador bloquea el clipboard, igual mostramos el link abajo
    }
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div>
      <button
        type="button"
        onClick={copiar}
        className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90"
      >
        📲 Invitá más gente !!
      </button>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-5">
          <div className="rounded-xl bg-[#1b1b1b] px-5 py-3 text-center text-sm font-medium text-white shadow-xl">
            ✅ Invitación copiada, ahora pegala en tu grupo de WhatsApp
          </div>
        </div>
      )}
    </div>
  );
}
