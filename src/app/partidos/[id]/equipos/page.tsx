import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { ArmarEquipos } from "./armar-equipos";

type Anotado = {
  jugador_id: string;
  posicion_jugada: string | null;
  jugadores: { nombre: string; nivel_global: number | null } | null;
};

export default async function EquiposPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partido } = await supabase
    .from("partidos")
    .select("id, fecha, cancha, minimo")
    .eq("id", id)
    .single();
  if (!partido) notFound();

  const { data: anotados } = await supabase
    .from("participaciones")
    .select("jugador_id, posicion_jugada, jugadores(nombre, nivel_global)")
    .eq("partido_id", id)
    .returns<Anotado[]>();

  const jugadores = (anotados ?? []).map((a, i) => ({
    id: a.jugador_id,
    nombre: a.jugadores?.nombre ?? `Jugador ${i + 1}`,
    nivel: a.jugadores?.nivel_global ?? 5,
    rol: a.posicion_jugada ?? "Donde sea",
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 p-5">
      <Link
        href={`/partidos/${id}`}
        className="text-sm opacity-60 hover:opacity-100"
      >
        ← Volver a la convocatoria
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Armar equipos</h1>
        <p className="text-sm opacity-60">
          {formatFecha(partido.fecha)}
          {partido.cancha ? ` · ${partido.cancha}` : ""} · {jugadores.length} jugadores
        </p>
      </div>

      {jugadores.length < 2 ? (
        <p className="rounded-lg border border-dashed border-black/15 py-8 text-center text-sm opacity-60">
          Todavía no hay jugadores suficientes para armar equipos.
        </p>
      ) : (
        <ArmarEquipos
          jugadores={jugadores}
          cuando={formatFecha(partido.fecha)}
          lugar={partido.cancha}
        />
      )}
    </main>
  );
}
