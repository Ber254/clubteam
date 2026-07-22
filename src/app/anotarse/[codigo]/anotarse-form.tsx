"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SelectorRol } from "@/app/selector-rol";

// Form de anotarse a un partido: apodo + rol para ESA fecha. Viene prellenado
// con lo que el jugador ya tenga en su perfil, así solo confirma.
export function AnotarseForm({
  codigo,
  nombreInicial,
  posicionInicial,
}: {
  codigo: string;
  nombreInicial: string;
  posicionInicial: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [nombre, setNombre] = useState(nombreInicial);
  const [posicion, setPosicion] = useState(posicionInicial);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg("");

    const { data: partidoId, error } = await supabase.rpc(
      "anotarse_por_invite",
      { p_codigo: codigo, p_nombre: nombre, p_posicion: posicion }
    );

    if (error || !partidoId) {
      setErrorMsg(error?.message ?? "No se pudo anotar al partido.");
      setEnviando(false);
      return;
    }

    router.push(`/partidos/${partidoId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="nombre" className="text-sm font-medium">
          ¿Cómo te dicen?
        </label>
        <input
          id="nombre"
          type="text"
          required
          maxLength={40}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu apodo"
          className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-4 py-3 text-base outline-none focus:border-verde-acento"
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">¿En qué puesto vas?</p>
        <SelectorRol value={posicion} onChange={setPosicion} />
      </div>

      <button
        type="submit"
        disabled={enviando || nombre.trim() === "" || posicion === ""}
        className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? "Anotándote…" : "⚽ Anotarme al partido"}
      </button>

      {errorMsg && (
        <p className="text-center text-sm text-red-500">{errorMsg}</p>
      )}
    </form>
  );
}
