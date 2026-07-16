"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NuevoGrupoPage() {
  const supabase = createClient();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg("");

    // RPC atómica: crea el grupo + membresía admin en una transacción.
    const { data, error } = await supabase
      .rpc("create_group", { p_nombre: nombre })
      .single<{ id: string; codigo: string }>();

    if (error || !data) {
      setErrorMsg(error?.message ?? "No se pudo crear el grupo.");
      setEnviando(false);
      return;
    }

    router.push(`/grupos/${data.id}`);
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Crear grupo</h1>
          <p className="text-sm opacity-70">
            Armá tu grupo y después compartí el link de invitación.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            maxLength={60}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del grupo (ej: Los Miércoles FC)"
            className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-4 py-3 text-base outline-none focus:border-verde-acento dark:border-white/20 dark:focus:border-white/50"
          />
          <button
            type="submit"
            disabled={enviando || nombre.trim() === ""}
            className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Creando…" : "Crear grupo"}
          </button>
        </form>

        {errorMsg && (
          <p className="text-center text-sm text-red-500">{errorMsg}</p>
        )}

        <p className="text-center text-sm">
          <Link href="/dashboard" className="underline opacity-70 hover:opacity-100">
            Volver
          </Link>
        </p>
      </div>
    </main>
  );
}
