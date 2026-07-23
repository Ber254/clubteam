"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Club = { id: string; nombre: string };

// Selector de club: solo se muestra cuando el usuario pertenece a más de uno.
// Al elegir uno, el muro se recarga apuntando a ese club (?club=<id>).
export function SelectorClub({
  clubes,
  actualId,
}: {
  clubes: Club[];
  actualId: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const actual = clubes.find((c) => c.id === actualId);

  function elegir(id: string) {
    setAbierto(false);
    if (id === actualId) return;
    router.push(`/dashboard?club=${id}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
      >
        <span className="truncate">
          🏟️ {actual?.nombre ?? "Elegí el club"}
        </span>
        <span aria-hidden="true" className="shrink-0 opacity-60">
          {abierto ? "▲" : "▼"}
        </span>
      </button>

      {abierto && (
        <>
          {/* Capa para cerrar tocando afuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-black/15 bg-white shadow-lg">
            <p className="border-b border-black/10 px-3 py-2 text-xs font-semibold uppercase opacity-50">
              Elegí el club
            </p>
            {clubes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegir(c.id)}
                className={`flex w-full items-center justify-between gap-2 border-b border-black/5 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-black/5 ${
                  c.id === actualId ? "font-semibold text-verde-acento" : ""
                }`}
              >
                <span className="truncate">{c.nombre}</span>
                {c.id === actualId && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
