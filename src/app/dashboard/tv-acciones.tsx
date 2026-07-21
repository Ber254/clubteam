"use client";

import Link from "next/link";
import { useState } from "react";

const ARENGAS = [
  "No te cagues, vení al partido 😤",
  "Faltás vos. Sí, vos.",
  "Dejá el sillón, se juega ⚽",
  "Nos falta uno. Ese uno sos vos.",
  "Movete que hay partido 🔥",
  "El pasto te extraña 🌱",
  "Dale que se llena 🔥",
];

export function TvAcciones({
  partidoId,
  codigo,
  cuando,
  lugar,
}: {
  partidoId: string;
  codigo: string;
  cuando: string;
  lugar: string | null;
}) {
  const [toast, setToast] = useState(false);

  function invitar() {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${codigo}`
        : `/p/${codigo}`;
    const arenga = ARENGAS[Math.floor(Math.random() * ARENGAS.length)];
    const txt = `${arenga}\nJugamos ${cuando}${lugar ? " en " + lugar : ""}.\nAnotate y elegí tu puesto 👉 ${link}`;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={invitar}
          className="rounded-lg bg-verde-acento px-2 py-2.5 text-sm font-medium leading-tight text-white"
        >
          📲 Invitá más gente !!
        </button>
        <Link
          href={`/partidos/${partidoId}`}
          className="flex items-center justify-center gap-1 rounded-lg border border-black/15 bg-white px-2 py-2.5 text-center text-sm font-medium leading-tight transition-colors hover:bg-black/5"
        >
          ¿Cómo viene? <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>
        ✅ Invitación copiada, ahora pegala en tu grupo de WhatsApp
      </div>
    </>
  );
}
