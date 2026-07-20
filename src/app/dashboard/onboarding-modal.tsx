"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SelectorRol } from "@/app/selector-rol";

// Se pide UNA sola vez, obligatorio: apodo + rol preferido. Sin botón de
// cerrar ni click-afuera: solo se cierra completando y guardando.
export function OnboardingModal() {
  const supabase = createClient();
  const router = useRouter();
  const [apodo, setApodo] = useState("");
  const [rol, setRol] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!apodo.trim() || !rol) return;
    setEnviando(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Se venció tu sesión, recargá la página.");
        setEnviando(false);
        return;
      }

      const { error: e1 } = await supabase
        .from("jugadores")
        .update({ apodo: apodo.trim().slice(0, 30), posicion_preferida: rol })
        .eq("id", user.id);

      if (e1) {
        setError(e1.message);
        setEnviando(false);
        return;
      }
      router.refresh();
      setEnviando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal, probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-sm rounded-2xl bg-blanco-cancha p-6 shadow-xl">
        <p className="text-2xl">👋</p>
        <h2 className="mb-1 text-xl font-bold">¡Bienvenido a ClubTeam!</h2>
        <p className="mb-5 text-sm opacity-70">
          Dos datos rápidos y arrancamos.
        </p>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase opacity-60">
              ¿Cómo te dicen en la cancha?
            </p>
            <input
              autoFocus
              value={apodo}
              maxLength={30}
              onChange={(e) => setApodo(e.target.value)}
              placeholder="Tu apodo"
              className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-3 py-3 outline-none focus:border-verde-acento"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase opacity-60">
              ¿En qué te gusta jugar?
            </p>
            <SelectorRol value={rol} onChange={setRol} />
          </div>

          <button
            type="submit"
            disabled={enviando || !apodo.trim() || !rol}
            className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Guardando…" : "Listo, ¡a jugar!"}
          </button>

          {error && <p className="text-center text-sm text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}
