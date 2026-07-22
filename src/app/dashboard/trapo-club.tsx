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

  // Tela blanca un poco arrugada: pliegues suaves + sombras de esquina.
  const tela = {
    backgroundColor: "#f6f4ee",
    backgroundImage: [
      "radial-gradient(120% 85% at 18% 8%, rgba(255,255,255,.95), transparent 60%)",
      "radial-gradient(110% 75% at 88% 92%, rgba(0,0,0,.06), transparent 55%)",
      "linear-gradient(100deg, rgba(0,0,0,.05) 0 5%, transparent 12% 88%, rgba(0,0,0,.07) 100%)",
      "repeating-linear-gradient(112deg, rgba(0,0,0,.03) 0 2px, transparent 2px 26px)",
      "repeating-linear-gradient(26deg, rgba(0,0,0,.022) 0 2px, transparent 2px 34px)",
      "repeating-linear-gradient(70deg, rgba(0,0,0,.014) 0 1px, transparent 1px 18px)",
    ].join(","),
    // Bordes curvos y algo irregulares, como una tela colgada.
    borderRadius: "22px 16px 26px 14px / 16px 24px 14px 22px",
    boxShadow: "0 8px 22px rgba(0,0,0,.18)",
    transform: "rotate(-1.5deg)",
  } as const;

  if (editando) {
    return (
      <div
        className="mx-auto inline-block px-6 py-4"
        style={tela}
      >
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
          className="font-trapo w-[260px] max-w-full border-b-2 border-black/30 bg-transparent px-1 py-1 text-center text-2xl uppercase leading-tight text-[#1a1a1a] outline-none"
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
      className="font-trapo relative inline-block max-w-[320px] cursor-pointer px-10 py-6 text-3xl uppercase leading-[1.05] text-[#1a1a1a] transition-transform hover:scale-[1.02] disabled:opacity-70"
      style={{ ...tela, textShadow: "0 0 1px rgba(0,0,0,.22)" }}
    >
      {nombreInicial}
    </button>
  );
}
