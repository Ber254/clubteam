import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { AnotarseForm } from "./anotarse-form";

type PartidoInvitacion = {
  partido_id: string;
  grupo_id: string;
  grupo_nombre: string;
  fecha: string;
  cancha: string | null;
  ya_anotado: boolean;
};

// Invitación a nivel PARTIDO: el invitado elige rol + apodo y queda anotado
// a ese partido (y sumado al club). Si ya estaba anotado, va directo al partido.
export default async function AnotarsePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/anotarse/${codigo}`);
  }

  const { data: partido } = await supabase
    .rpc("get_partido_by_invite", { p_codigo: codigo })
    .single<PartidoInvitacion>();

  if (!partido) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Link inválido</h1>
          <p className="text-sm opacity-70">
            Este link de partido no existe o fue dado de baja. Pedile al
            organizador que te pase uno nuevo.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg border border-black/15 px-5 py-2.5 font-medium transition-colors hover:bg-black/5"
          >
            Ir al muro
          </Link>
        </div>
      </main>
    );
  }

  // Ya anotado: directo a la convocatoria del partido.
  if (partido.ya_anotado) {
    redirect(`/partidos/${partido.partido_id}`);
  }

  // Prellenamos con lo que ya tenga el perfil (apodo/nombre y posición).
  const { data: jugador } = await supabase
    .from("jugadores")
    .select("nombre, apodo, posicion_preferida")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm opacity-70">Te invitaron a jugar con</p>
          <h1 className="text-3xl font-bold">{partido.grupo_nombre}</h1>
          <p className="text-sm font-medium">
            {formatFecha(partido.fecha)}
            {partido.cancha ? ` · ${partido.cancha}` : ""}
          </p>
        </div>

        <AnotarseForm
          codigo={codigo}
          nombreInicial={jugador?.apodo || jugador?.nombre || ""}
          posicionInicial={jugador?.posicion_preferida ?? ""}
        />
      </div>
    </main>
  );
}
