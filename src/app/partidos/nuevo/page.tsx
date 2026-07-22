"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SelectorRol } from "@/app/selector-rol";

// Crear partido = crear club. El club nace con este partido; los que se
// anoten por el link quedan asignados a él. El usuario no crea "grupos".
export default function NuevoPartidoPage() {
  return (
    <Suspense fallback={null}>
      <NuevoPartidoForm />
    </Suspense>
  );
}

function NuevoPartidoForm() {
  const supabase = createClient();
  const router = useRouter();
  // Si viene ?club=<id>, el partido se arma en ese club existente.
  // Si no, se crea un club nuevo (arranca desde cero).
  const clubExistente = useSearchParams().get("club");

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("20:00");
  const [lugar, setLugar] = useState("");
  const [minimo, setMinimo] = useState(2);
  const [juega, setJuega] = useState(true);
  const [rol, setRol] = useState("Donde sea");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // 1) Club: reusar el existente (armar otro partido) o crear uno nuevo.
    let clubId = clubExistente;
    if (!clubId) {
      const nombreClub = lugar.trim() ? `Los de ${lugar.split(",")[0].trim()}` : "Mi club";
      const { data: club, error: eClub } = await supabase
        .from("grupos")
        .insert({ nombre: nombreClub, creado_por: user.id })
        .select("id")
        .single();
      if (eClub || !club) {
        setError(eClub?.message ?? "No se pudo crear el club.");
        setEnviando(false);
        return;
      }
      clubId = club.id;

      // 2) Membresía admin del creador (solo si el club es nuevo)
      await supabase
        .from("membresias")
        .insert({ grupo_id: clubId, jugador_id: user.id, rol: "admin" });
    }

    // 3) Partido
    const cuando = new Date(`${fecha}T${hora}`).toISOString();
    const { data: partido, error: eP } = await supabase
      .from("partidos")
      .insert({
        grupo_id: clubId,
        fecha: cuando,
        cancha: lugar.trim() || null,
        minimo,
        creado_por: user.id,
        estado: "convocando",
      })
      .select("id")
      .single();
    if (eP || !partido) {
      setError(eP?.message ?? "No se pudo crear el partido.");
      setEnviando(false);
      return;
    }

    // 4) Si el creador juega, se anota
    if (juega) {
      await supabase.from("participaciones").insert({
        partido_id: partido.id,
        jugador_id: user.id,
        posicion_jugada: rol,
        es_titular: true,
      });
    }

    router.push(`/partidos/${partido.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <Link href="/dashboard" className="text-sm opacity-60 hover:opacity-100">
        ← Volver
      </Link>
      <h1 className="text-2xl font-bold">Nuevo partido</h1>

      <form onSubmit={crear} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase opacity-60">Fecha</p>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-3 py-3 outline-none focus:border-verde-acento"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase opacity-60">Hora</p>
            <input
              type="time"
              required
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-3 py-3 outline-none focus:border-verde-acento"
            />
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase opacity-60">Lugar</p>
          <input
            type="text"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Ej: El Templo, 12 y 60"
            className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-3 py-3 outline-none focus:border-verde-acento"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase opacity-60">
            ¿Cuántos para que se juegue?
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMinimo((m) => Math.max(2, m - 2))}
              className="size-11 rounded-lg border border-black/15 text-xl font-semibold"
            >
              −
            </button>
            <div className="flex-1 rounded-lg border border-black/15 py-2 text-center">
              <div className="text-2xl font-bold">{minimo}</div>
              <div className="text-xs opacity-60">
                {minimo / 2} vs {minimo / 2}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMinimo((m) => Math.min(30, m + 2))}
              className="size-11 rounded-lg border border-black/15 text-xl font-semibold"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase opacity-60">¿Vos jugás?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setJuega(true)}
              className={`rounded-lg border py-3 font-medium ${juega ? "border-verde-acento bg-verde-acento/10 text-verde-acento" : "border-black/15"}`}
            >
              ⚽ Sí, juego
            </button>
            <button
              type="button"
              onClick={() => setJuega(false)}
              className={`rounded-lg border py-3 font-medium ${!juega ? "border-verde-acento bg-verde-acento/10 text-verde-acento" : "border-black/15"}`}
            >
              📋 Solo organizo
            </button>
          </div>
        </div>

        {juega && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase opacity-60">Tu puesto</p>
            <SelectorRol value={rol} onChange={setRol} />
          </div>
        )}

        <button
          type="submit"
          disabled={enviando || !fecha}
          className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? "Creando…" : "Crear partido y generar link"}
        </button>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}
      </form>
    </main>
  );
}
