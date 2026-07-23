"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Da de baja a un jugador del partido (borra su participación). Cualquier
// miembro del club puede hacerlo (DT organizando el plantel).
export function BajarJugador({
  partidoId,
  jugadorId,
}: {
  partidoId: string;
  jugadorId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [bajando, setBajando] = useState(false);

  async function bajar() {
    setBajando(true);
    const { error } = await supabase
      .from("participaciones")
      .delete()
      .eq("partido_id", partidoId)
      .eq("jugador_id", jugadorId);
    if (error) {
      setBajando(false);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={bajar}
      disabled={bajando}
      className="shrink-0 rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium opacity-70 transition-colors hover:bg-black/5 hover:opacity-100 disabled:opacity-40"
    >
      {bajando ? "…" : "↓ Bajar"}
    </button>
  );
}
