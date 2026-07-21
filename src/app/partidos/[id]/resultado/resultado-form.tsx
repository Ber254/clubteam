"use client";

import { useState } from "react";
import { ICONOS_ROL } from "@/app/selector-rol";

type Jugador = { id: string; nombre: string; rol: string };
type Stat = { goles: number; lesion: boolean; tarjeta: boolean };

const nuevo = (): Stat => ({ goles: 0, lesion: false, tarjeta: false });

export function ResultadoForm({
  equipoA,
  equipoB,
  cuando,
}: {
  equipoA: Jugador[];
  equipoB: Jugador[];
  cuando: string;
}) {
  const [nombres] = useState({ A: "Primera", B: "Reserva" });
  const [sinAutor, setSinAutor] = useState({ A: 0, B: 0 });
  const [stats, setStats] = useState<Record<string, Stat>>(() => {
    const s: Record<string, Stat> = {};
    [...equipoA, ...equipoB].forEach((j) => (s[j.id] = nuevo()));
    return s;
  });
  const [toast, setToast] = useState(false);

  const clamp = (n: number) => Math.max(0, n);

  function setStat(id: string, patch: Partial<Stat>) {
    setStats((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  // Marcador calculado: goles por jugador de cada equipo + goles sin autor.
  const golesEquipo = (js: Jugador[], eq: "A" | "B") =>
    js.reduce((acc, j) => acc + stats[j.id].goles, 0) + sinAutor[eq];
  const marcador = {
    A: golesEquipo(equipoA, "A"),
    B: golesEquipo(equipoB, "B"),
  };

  const resultado =
    marcador.A === marcador.B
      ? `🤝 Empate ${marcador.A} - ${marcador.B}`
      : marcador.A > marcador.B
        ? `🔵 Gana ${nombres.A} ${marcador.A} - ${marcador.B}`
        : `🔴 Gana ${nombres.B} ${marcador.B} - ${marcador.A}`;

  // Marcador de solo lectura: refleja la suma de goles cargados abajo.
  function Tanteador({ eq, label }: { eq: "A" | "B"; label: string }) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-black/15 bg-white text-4xl font-bold tabular-nums shadow-inner">
          {marcador[eq]}
        </div>
        <span className="mt-1 text-xs font-medium opacity-60">{label}</span>
      </div>
    );
  }

  // Contador de goles por jugador: − n +
  function Goles({ id }: { id: string }) {
    const n = stats[id].goles;
    return (
      <div className="flex items-center overflow-hidden rounded-md border border-black/15 bg-white">
        <button
          type="button"
          onClick={() => setStat(id, { goles: clamp(n - 1) })}
          className="flex h-7 w-6 items-center justify-center text-sm hover:bg-black/5 disabled:opacity-30"
          disabled={n === 0}
          aria-label="Quitar gol"
        >
          −
        </button>
        <span className="flex h-7 min-w-[2.1rem] items-center justify-center gap-0.5 border-x border-black/10 text-sm font-semibold tabular-nums">
          ⚽ {n}
        </span>
        <button
          type="button"
          onClick={() => setStat(id, { goles: n + 1 })}
          className="flex h-7 w-6 items-center justify-center text-sm hover:bg-black/5"
          aria-label="Sumar gol"
        >
          +
        </button>
      </div>
    );
  }

  function Toggle({
    on,
    onClick,
    children,
    activo,
  }: {
    on: boolean;
    onClick: () => void;
    children: React.ReactNode;
    activo: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex h-7 w-7 items-center justify-center rounded-md border text-sm transition-colors ${
          on ? activo : "border-black/15 bg-white opacity-45 hover:opacity-80"
        }`}
      >
        {children}
      </button>
    );
  }

  function Fila({ j }: { j: Jugador }) {
    return (
      <div className="border-t border-black/10 px-2 py-2 first:border-t-0">
        <p className="mb-1.5 flex items-center gap-1 text-sm font-semibold">
          <span>{ICONOS_ROL[j.rol] ?? "⚽"}</span>
          <span className="truncate">{j.nombre}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <Goles id={j.id} />
          <Toggle
            on={stats[j.id].lesion}
            onClick={() => setStat(j.id, { lesion: !stats[j.id].lesion })}
            activo="border-orange-400 bg-orange-100"
          >
            🤕
          </Toggle>
          <Toggle
            on={stats[j.id].tarjeta}
            onClick={() => setStat(j.id, { tarjeta: !stats[j.id].tarjeta })}
            activo="border-sky-400 bg-sky-100"
          >
            🟦
          </Toggle>
        </div>
      </div>
    );
  }

  function SinAutor({ eq }: { eq: "A" | "B" }) {
    const n = sinAutor[eq];
    const frase =
      eq === "A" ? "Entró de rebote, cuenta igual" : "La empujó alguien, quién sabe quién";
    return (
      <div className="border-t border-black/10 px-2 py-2">
        <p className="mb-1.5 text-xs italic opacity-55">{frase}</p>
        <div className="flex items-center overflow-hidden rounded-md border border-dashed border-black/25 bg-white">
          <button
            type="button"
            onClick={() => setSinAutor((s) => ({ ...s, [eq]: clamp(s[eq] - 1) }))}
            className="flex h-7 w-6 items-center justify-center text-sm hover:bg-black/5 disabled:opacity-30"
            disabled={n === 0}
            aria-label="Quitar gol sin autor"
          >
            −
          </button>
          <span className="flex h-7 min-w-[2.1rem] items-center justify-center border-x border-black/10 text-sm font-semibold tabular-nums">
            ⚽ {n}
          </span>
          <button
            type="button"
            onClick={() => setSinAutor((s) => ({ ...s, [eq]: s[eq] + 1 }))}
            className="flex h-7 w-6 items-center justify-center text-sm hover:bg-black/5"
            aria-label="Sumar gol sin autor"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  function Columna({
    eq,
    dot,
    jugadores,
  }: {
    eq: "A" | "B";
    dot: string;
    jugadores: Jugador[];
  }) {
    return (
      <div className="rounded-xl border border-black/10 bg-white/60">
        <p className="border-b border-black/10 px-2 py-1.5 text-xs font-bold uppercase tracking-wide opacity-70">
          {dot} {nombres[eq]}
        </p>
        {jugadores.map((j) => (
          <Fila key={j.id} j={j} />
        ))}
        <SinAutor eq={eq} />
      </div>
    );
  }

  function copiar() {
    const linea = (js: Jugador[], eq: "A" | "B") => {
      const conGol = js
        .filter((j) => stats[j.id].goles > 0)
        .map((j) => `${j.nombre} ${"⚽".repeat(stats[j.id].goles)}`);
      if (sinAutor[eq] > 0) conGol.push(`sin autor ${"⚽".repeat(sinAutor[eq])}`);
      return conGol.length ? `\n   ${conGol.join(", ")}` : "";
    };
    const texto =
      `⚽ Resultado — ${cuando}\n` +
      `${resultado}\n\n` +
      `🔵 ${nombres.A} (${marcador.A})${linea(equipoA, "A")}\n` +
      `🔴 ${nombres.B} (${marcador.B})${linea(equipoB, "B")}`;
    navigator.clipboard.writeText(texto).catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="space-y-4">
      {/* Marcador (calculado a partir de los goles cargados abajo) */}
      <div className="flex items-start justify-center gap-4">
        <Tanteador eq="A" label={nombres.A} />
        <span className="mt-5 text-3xl font-bold opacity-40">-</span>
        <Tanteador eq="B" label={nombres.B} />
      </div>
      <p className="text-center text-sm font-semibold">{resultado}</p>

      {/* Equipos */}
      <div className="grid grid-cols-2 gap-2">
        <Columna eq="A" dot="🔵" jugadores={equipoA} />
        <Columna eq="B" dot="🔴" jugadores={equipoB} />
      </div>

      <button
        type="button"
        onClick={copiar}
        className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90"
      >
        📋 Copiar resumen del partido
      </button>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-5">
          <div className="rounded-xl bg-[#1b1b1b] px-5 py-3 text-center text-sm font-medium text-white shadow-xl">
            ✅ Resumen copiado, pegalo en el grupo
          </div>
        </div>
      )}
    </div>
  );
}
