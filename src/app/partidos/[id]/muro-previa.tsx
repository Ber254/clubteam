"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Comentario = {
  id: string;
  texto: string;
  jugador_id: string;
  autor: string;
  esOrg: boolean;
};

export function MuroPrevia({
  partidoId,
  creadoPor,
  inicial,
}: {
  partidoId: string;
  creadoPor: string;
  inicial: Comentario[];
}) {
  const supabase = createClient();
  const [comentarios, setComentarios] = useState<Comentario[]>(inicial);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function comentar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEnviando(false);
      return;
    }

    const { data, error } = await supabase
      .from("comentarios")
      .insert({ partido_id: partidoId, jugador_id: user.id, texto: t })
      .select("id, texto, jugador_id, jugadores(nombre, apodo)")
      .single<{
        id: string;
        texto: string;
        jugador_id: string;
        jugadores: { nombre: string; apodo: string | null } | null;
      }>();

    if (!error && data) {
      setComentarios((c) => [
        ...c,
        {
          id: data.id,
          texto: data.texto,
          jugador_id: data.jugador_id,
          autor: data.jugadores?.apodo || data.jugadores?.nombre || "Vos",
          esOrg: data.jugador_id === creadoPor,
        },
      ]);
      setTexto("");
    }
    setEnviando(false);
  }

  return (
    <div className="mt-4">
      <p className="mb-1 text-xs font-semibold uppercase opacity-60">
        🔥 Calentando la previa
      </p>
      <div className="rounded-lg border border-black/10 bg-white">
        {comentarios.length === 0 && (
          <p className="px-3 py-4 text-center text-sm opacity-50">
            Todavía nadie tiró una previa. Arrancá vos 😏
          </p>
        )}
        {comentarios.map((c) => (
          <div key={c.id} className="border-b border-black/5 px-3 py-2 last:border-0">
            <p className="text-sm">
              <strong>{c.autor}</strong>
              {c.esOrg && (
                <span className="ml-2 rounded bg-verde-acento/10 px-1.5 py-0.5 text-xs text-verde-acento">
                  organizador
                </span>
              )}
            </p>
            <p className="text-sm opacity-90">{c.texto}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={texto}
          maxLength={200}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              comentar();
            }
          }}
          placeholder="Tirá una gastada para la previa…"
          className="min-w-0 flex-1 rounded-lg border border-black/15 bg-blanco-cancha px-3 py-2.5 text-sm outline-none focus:border-verde-acento"
        />
        <button
          onClick={comentar}
          disabled={enviando || !texto.trim()}
          className="shrink-0 rounded-lg bg-verde-acento px-4 font-medium text-white disabled:opacity-50"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
