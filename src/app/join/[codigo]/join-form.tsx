"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { POSICIONES } from "@/lib/posiciones";
import { SelectorRol } from "@/app/selector-rol";

const selectClases =
  "w-full rounded-lg border border-black/15 bg-blanco-cancha px-4 py-3 text-base outline-none focus:border-verde-acento dark:border-white/20 dark:focus:border-white/50 dark:[&>option]:bg-neutral-900";

export function JoinForm({
  codigo,
  nombreInicial,
  posicionInicial,
  posicionSecundariaInicial,
}: {
  codigo: string;
  nombreInicial: string;
  posicionInicial: string;
  posicionSecundariaInicial: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [nombre, setNombre] = useState(nombreInicial);
  const [posicion, setPosicion] = useState(posicionInicial);
  const [posicionSecundaria, setPosicionSecundaria] = useState(
    posicionSecundariaInicial,
  );
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg("");

    const { data: grupoId, error } = await supabase.rpc(
      "join_group_by_invite",
      {
        p_codigo: codigo,
        p_nombre: nombre,
        p_posicion: posicion,
        p_posicion_secundaria: posicionSecundaria || null,
      },
    );

    if (error || !grupoId) {
      setErrorMsg(error?.message ?? "No se pudo completar la unión al grupo.");
      setEnviando(false);
      return;
    }

    // Al muro nuevo (TV del club), no a la UI vieja de grupo.
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="nombre" className="text-sm font-medium">
          Tu nombre en el grupo
        </label>
        <input
          id="nombre"
          type="text"
          required
          maxLength={40}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="¿Cómo te dicen?"
          className="w-full rounded-lg border border-black/15 bg-blanco-cancha px-4 py-3 text-base outline-none focus:border-verde-acento dark:border-white/20 dark:focus:border-white/50"
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Elegí tu posición</p>
        <SelectorRol
          value={posicion}
          onChange={(rol) => {
            setPosicion(rol);
            // Si la secundaria queda igual a la nueva preferida, se limpia.
            if (posicionSecundaria === rol) setPosicionSecundaria("");
          }}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="posicion-secundaria" className="text-sm font-medium">
          Posición secundaria <span className="opacity-50">(opcional)</span>
        </label>
        <select
          id="posicion-secundaria"
          value={posicionSecundaria}
          onChange={(e) => setPosicionSecundaria(e.target.value)}
          className={selectClases}
        >
          <option value="">Ninguna</option>
          {POSICIONES.filter((p) => p !== posicion).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={enviando || nombre.trim() === "" || posicion === ""}
        className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? "Uniéndote…" : "Unirme al grupo"}
      </button>

      {errorMsg && (
        <p className="text-center text-sm text-red-500">{errorMsg}</p>
      )}
    </form>
  );
}
