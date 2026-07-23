"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Crear un CLUB nuevo (un muro nuevo). Solo pide el nombre: es el que se ve
// en el trapo del muro. No crea ningún partido: eso se hace después desde el TV.
export default function NuevoClubPage() {
  const supabase = createClient();
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");

    // create_group: crea el grupo + la membresía admin en una transacción.
    const { data, error: e1 } = await supabase
      .rpc("create_group", { p_nombre: nombre.trim() })
      .single<{ id: string; codigo: string }>();

    if (e1 || !data) {
      setError(e1?.message ?? "No se pudo crear el club.");
      setEnviando(false);
      return;
    }

    router.push(`/dashboard?club=${data.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <Link href="/dashboard" className="text-sm opacity-60 hover:opacity-100">
        ← Volver al muro
      </Link>
      <h1 className="text-2xl font-bold">Nuevo club</h1>
      <p className="text-sm opacity-70">
        Un club es un muro aparte, con sus propias fechas y su gente. Después
        armás el primer partido desde el TV.
      </p>

      <form onSubmit={crear} className="space-y-4">
        <div>
          <label
            htmlFor="nombre"
            className="mb-1 block text-xs font-semibold uppercase opacity-60"
          >
            Nombre del club
          </label>
          <input
            id="nombre"
            type="text"
            required
            autoFocus
            maxLength={30}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Los del martes 21hs"
            className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-3 py-3 outline-none focus:border-verde-acento"
          />
          <p className="mt-1 text-xs opacity-50">
            Es el nombre que va en el trapo del muro. Después lo podés cambiar.
          </p>
        </div>

        <button
          type="submit"
          disabled={enviando || nombre.trim() === ""}
          className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? "Creando…" : "Crear club"}
        </button>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}
      </form>
    </main>
  );
}
