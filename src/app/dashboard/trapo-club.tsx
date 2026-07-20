"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// El nombre del club, editable con un click (sin prompt: se edita inline).
// Si todavía no existe club (nadie creó el primer partido), no hay nada
// que editar todavía: se explica y no se abre edición.
export function TrapoClub({
  clubId,
  nombreInicial,
}: {
  clubId: string | null;
  nombreInicial: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nombreInicial);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const nuevo = valor.trim().slice(0, 30);
    setEditando(false);
    if (!clubId || !nuevo || nuevo === nombreInicial) {
      setValor(nombreInicial);
      return;
    }
    setGuardando(true);
    const { error } = await supabase
      .from("grupos")
      .update({ nombre: nuevo })
      .eq("id", clubId);
    setGuardando(false);
    if (!error) router.refresh();
    else setValor(nombreInicial);
  }

  if (editando) {
    return (
      <div className="mx-auto flex max-w-[280px] items-center gap-2">
        <input
          autoFocus
          value={valor}
          maxLength={30}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") guardar();
            if (e.key === "Escape") {
              setValor(nombreInicial);
              setEditando(false);
            }
          }}
          onBlur={guardar}
          className="min-w-0 flex-1 rounded-lg border border-verde-acento px-3 py-2 text-center text-lg font-bold outline-none"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (clubId) setEditando(true);
      }}
      title={clubId ? "Tocá para cambiarle el nombre" : "Se define al crear tu primer partido"}
      disabled={guardando}
      className="relative inline-block cursor-pointer px-8 py-4 text-lg font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.03] disabled:opacity-70"
      style={{
        background: "var(--color-verde-acento)",
        transform: "rotate(-1.2deg)",
        boxShadow:
          "inset 0 0 0 2px rgba(255,255,255,.5), 0 5px 16px rgba(0,0,0,.18)",
      }}
    >
      {nombreInicial}
    </button>
  );
}
