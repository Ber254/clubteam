"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ICONOS_ROL } from "@/app/selector-rol";

type Jugador = { id: string; nombre: string; rol: string };
// tarjeta: 0 = sin tarjeta, 1 = amarilla, 2 = roja (ciclo con cada click)
type Stat = { goles: number; lesion: boolean; tarjeta: number };

const nuevo = (): Stat => ({ goles: 0, lesion: false, tarjeta: 0 });

export function ResultadoForm({
  partidoId,
  equipoA,
  equipoB,
  cuando,
}: {
  partidoId: string;
  equipoA: Jugador[];
  equipoB: Jugador[];
  cuando: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nombres] = useState({ A: "Primera", B: "Reserva" });
  const [sinAutor, setSinAutor] = useState({ A: 0, B: 0 });
  const [stats, setStats] = useState<Record<string, Stat>>(() => {
    const s: Record<string, Stat> = {};
    [...equipoA, ...equipoB].forEach((j) => (s[j.id] = nuevo()));
    return s;
  });
  const [anecdota, setAnecdota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
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

  // Tarjeta: cicla sin tarjeta (grisado) → amarilla → roja → sin tarjeta
  function Tarjeta({ id }: { id: string }) {
    const t = stats[id].tarjeta;
    const estilo =
      t === 1
        ? "border-yellow-400 bg-yellow-100"
        : t === 2
          ? "border-red-400 bg-red-100"
          : "border-black/15 bg-white opacity-45 hover:opacity-80";
    return (
      <button
        type="button"
        onClick={() => setStat(id, { tarjeta: (t + 1) % 3 })}
        title={t === 1 ? "Amarilla" : t === 2 ? "Roja" : "Sin tarjeta"}
        className={`flex h-7 w-7 items-center justify-center rounded-md border text-sm transition-colors ${estilo}`}
      >
        {t === 2 ? "🟥" : "🟨"}
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
          <Tarjeta id={j.id} />
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

  // Snapshot del resultado que se guarda en partidos.resultado (jsonb) y que
  // el muro usa para pintar el historial.
  function snapshot() {
    const goleadores = [...equipoA, ...equipoB]
      .filter((j) => stats[j.id].goles > 0)
      .map((j) => ({
        nombre: j.nombre,
        goles: stats[j.id].goles,
        equipo: equipoA.includes(j) ? "A" : "B",
      }));
    const tarjetas = [...equipoA, ...equipoB]
      .filter((j) => stats[j.id].tarjeta > 0)
      .map((j) => ({ nombre: j.nombre, tarjeta: stats[j.id].tarjeta }));
    const lesionados = [...equipoA, ...equipoB]
      .filter((j) => stats[j.id].lesion)
      .map((j) => j.nombre);
    // Rosters completos por equipo (con su detalle) para el resumen del partido.
    const roster = (js: Jugador[]) =>
      js.map((j) => ({
        nombre: j.nombre,
        goles: stats[j.id].goles,
        tarjeta: stats[j.id].tarjeta,
        lesion: stats[j.id].lesion,
      }));
    return {
      marcador,
      nombres,
      equipos: { A: roster(equipoA), B: roster(equipoB) },
      goleadores,
      sinAutor,
      tarjetas,
      lesionados,
      anecdota: anecdota.trim() || null,
    };
  }

  async function guardar() {
    setGuardando(true);
    setError("");
    const { data, error } = await supabase
      .from("partidos")
      .update({ estado: "jugado", resultado: snapshot() })
      .eq("id", partidoId)
      .select("id");
    if (error) {
      setGuardando(false);
      setError(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setGuardando(false);
      setError("No se pudo guardar (permisos). Fijate que seas del club.");
      return;
    }
    // Al muro: el partido pasa al historial con el resultado cargado.
    router.push("/dashboard");
    router.refresh();
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

      {/* Anécdota opcional: la frase que aparece en el historial del muro */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase opacity-60">
          ¿Qué pasó en la cancha? (opcional)
        </label>
        <input
          type="text"
          value={anecdota}
          onChange={(e) => setAnecdota(e.target.value)}
          maxLength={120}
          placeholder="El Colo atajó un penal con la cara 🧤"
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-verde-acento"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="w-full rounded-lg bg-verde-acento py-3 font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "💾 Guardar el resultado"}
      </button>

      <button
        type="button"
        onClick={copiar}
        className="w-full rounded-lg border border-black/15 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
      >
        📋 Copiar resumen
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
