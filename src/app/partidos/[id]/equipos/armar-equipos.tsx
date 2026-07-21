"use client";

import { useState } from "react";

type J = { id: string; nombre: string; nivel: number; rol: string };

const ICON: Record<string, string> = {
  Arquero: "🧤",
  Defensa: "🛡️",
  Ataque: "⚽",
  "Donde sea": "🔄",
};

// Balanceador simple: reparte arqueros uno a cada equipo y el resto de forma
// que queden parejos en cantidad y en nivel. Cada "mezclar" baraja distinto.
function armar(players: J[]) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const arqueros = shuffled.filter((p) => p.rol === "Arquero");
  const resto = shuffled.filter((p) => p.rol !== "Arquero");
  const A: J[] = [];
  const B: J[] = [];
  const suma = (t: J[]) => t.reduce((s, p) => s + p.nivel, 0);

  arqueros.forEach((p, i) => (i % 2 === 0 ? A : B).push(p));
  for (const p of resto) {
    if (A.length < B.length) A.push(p);
    else if (B.length < A.length) B.push(p);
    else (suma(A) <= suma(B) ? A : B).push(p);
  }
  return { A, B };
}

function Equipo({
  titulo,
  emoji,
  jugadores,
  oscuro,
}: {
  titulo: string;
  emoji: string;
  jugadores: J[];
  oscuro?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        oscuro ? "border-black/20 bg-[#1b1b1b] text-white" : "border-black/10 bg-white"
      }`}
    >
      <p className="mb-2 text-center text-sm font-bold">
        {emoji} {titulo}
        <span className="ml-1 opacity-60">({jugadores.length})</span>
      </p>
      <div className="space-y-1">
        {jugadores.map((p) => (
          <p
            key={p.id}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm ${
              oscuro ? "bg-white/10" : "bg-black/[0.03]"
            }`}
          >
            <span aria-hidden="true">{ICON[p.rol] ?? "🔄"}</span>
            <span className="truncate font-medium">{p.nombre}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function ArmarEquipos({
  jugadores,
  cuando,
  lugar,
}: {
  jugadores: J[];
  cuando: string;
  lugar: string | null;
}) {
  const [equipos, setEquipos] = useState(() => armar(jugadores));
  const [toast, setToast] = useState(false);

  function copiar() {
    const linea = (t: J[]) => t.map((p) => `• ${p.nombre}`).join("\n");
    const txt = `⚽ Equipos para ${cuando}${lugar ? " en " + lugar : ""}\n\n🎽 CON PECHERA\n${linea(
      equipos.A
    )}\n\n👕 SIN PECHERA\n${linea(equipos.B)}`;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Equipo titulo="Con pechera" emoji="🎽" jugadores={equipos.A} />
        <Equipo titulo="Sin pechera" emoji="👕" jugadores={equipos.B} oscuro />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setEquipos(armar(jugadores))}
          className="rounded-lg border border-black/15 bg-white py-3 font-medium transition-colors hover:bg-black/5"
        >
          🔀 Volver a mezclar
        </button>
        <button
          onClick={copiar}
          className="rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90"
        >
          📋 Copiar equipos
        </button>
      </div>

      <p className="mt-3 text-center text-xs opacity-50">
        Se reparten los arqueros y quedan parejos. Mezclá hasta que convenza a todos 😏
      </p>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-5">
          <div className="rounded-xl bg-[#1b1b1b] px-5 py-3 text-center text-sm font-medium text-white shadow-xl">
            ✅ Equipos copiados, pegalos en el grupo
          </div>
        </div>
      )}
    </div>
  );
}
