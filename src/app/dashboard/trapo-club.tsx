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

  // Tela ondeando: bandas verticales de luz y sombra (las "ondas") + una
  // caída de luz general (más iluminado arriba, como la foto de referencia).
  const telaBg = {
    backgroundColor: "#f3f1ea",
    backgroundImage: [
      "linear-gradient(99deg, rgba(0,0,0,.14) 0%, rgba(0,0,0,0) 7%, rgba(255,255,255,.65) 14%, rgba(0,0,0,0) 22%, rgba(0,0,0,.12) 31%, rgba(0,0,0,0) 40%, rgba(255,255,255,.6) 50%, rgba(0,0,0,0) 59%, rgba(0,0,0,.13) 69%, rgba(0,0,0,0) 78%, rgba(255,255,255,.55) 88%, rgba(0,0,0,.10) 100%)",
      "radial-gradient(150% 110% at 32% -10%, rgba(255,255,255,.75), transparent 55%)",
      "radial-gradient(130% 100% at 92% 110%, rgba(0,0,0,.14), transparent 55%)",
      "repeating-linear-gradient(99deg, rgba(0,0,0,.018) 0 2px, transparent 2px 20px)",
    ].join(","),
  } as const;

  // Silueta de bandera colgada: el borde superior hace panza entre las dos
  // puntas y el inferior queda ondulado, como género al viento.
  const siluetaColgada =
    "polygon(0% 4%, 12% 7%, 25% 9%, 38% 10%, 50% 11%, 62% 10%, 75% 9%, 88% 7%, 100% 4%, 100% 86%, 89% 94%, 78% 88%, 66% 96%, 55% 89%, 44% 97%, 33% 89%, 22% 95%, 11% 89%, 0% 86%)";

  if (editando) {
    return (
      <div
        className="mx-auto inline-block px-7 py-5"
        style={{
          ...telaBg,
          clipPath: siluetaColgada,
          transform: "rotate(-1.5deg)",
        }}
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

  // Sujeción (nudo) que aguanta cada punta superior de la bandera.
  const nudo = {
    position: "absolute" as const,
    top: -5,
    width: 13,
    height: 13,
    borderRadius: "50%",
    background: "radial-gradient(circle at 34% 30%, #9a9a9a, #4a4a4a 70%)",
    boxShadow: "0 1px 2px rgba(0,0,0,.45)",
    zIndex: 1,
  };

  return (
    <div
      className="relative inline-block"
      style={{ transform: "rotate(-1.5deg)" }}
    >
      {/* Dos sujeciones en las puntas superiores */}
      <span style={{ ...nudo, left: 4 }} aria-hidden="true" />
      <span style={{ ...nudo, right: 4 }} aria-hidden="true" />

      <button
        type="button"
        onClick={() => {
          if (clubId) setEditando(true);
        }}
        title={clubId ? "Tocá para cambiarle el nombre" : "Se define al crear tu primer partido"}
        disabled={guardando}
        className="font-trapo block max-w-[320px] cursor-pointer px-11 pb-9 pt-8 text-3xl uppercase leading-[1.05] text-[#1a1a1a] transition-transform hover:scale-[1.015] disabled:opacity-70"
        style={{
          ...telaBg,
          clipPath: siluetaColgada,
          filter: "drop-shadow(0 9px 12px rgba(0,0,0,.22))",
          textShadow: "0 0 1px rgba(0,0,0,.22)",
        }}
      >
        {nombreInicial}
      </button>
    </div>
  );
}
