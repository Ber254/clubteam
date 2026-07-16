import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { CargarResultadoForm, type EquipoConJugadores } from "./form";

type EquipoRow = {
  id: string;
  nombre_equipo: string;
  goles_totales: number | null;
};

type ParticipacionRow = {
  jugador_id: string;
  equipo_id: string;
  goles: number | null;
  asistencias: number | null;
  jugadores: { nombre: string } | null;
};

export default async function CargarResultadoPage({
  params,
}: {
  params: Promise<{ id: string; partidoId: string }>;
}) {
  const { id, partidoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partido } = await supabase
    .from("partidos")
    .select("id, grupo_id, fecha, estado")
    .eq("id", partidoId)
    .single();

  if (!partido || partido.grupo_id !== id) notFound();

  // El resultado solo se carga sobre un partido ya confirmado (o editando uno jugado).
  if (partido.estado === "armando") {
    redirect(`/grupos/${id}/partidos/${partidoId}`);
  }

  const [{ data: equipos }, { data: participaciones }] = await Promise.all([
    supabase
      .from("equipos_partido")
      .select("id, nombre_equipo, goles_totales")
      .eq("partido_id", partidoId)
      .order("nombre_equipo", { ascending: true })
      .returns<EquipoRow[]>(),
    supabase
      .from("participaciones")
      .select("jugador_id, equipo_id, goles, asistencias, jugadores(nombre)")
      .eq("partido_id", partidoId)
      .returns<ParticipacionRow[]>(),
  ]);

  const equiposConJugadores: EquipoConJugadores[] = (equipos ?? []).map(
    (e) => ({
      id: e.id,
      nombre: e.nombre_equipo,
      goles: e.goles_totales ?? 0,
      jugadores: (participaciones ?? [])
        .filter((p) => p.equipo_id === e.id)
        .map((p) => ({
          id: p.jugador_id,
          nombre: p.jugadores?.nombre ?? "Jugador",
          goles: p.goles ?? 0,
          asistencias: p.asistencias ?? 0,
        })),
    }),
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <Link
          href={`/grupos/${id}/partidos/${partidoId}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← Volver al partido
        </Link>
        <h1 className="text-2xl font-bold">Cargar resultado</h1>
        <p className="text-sm opacity-70">{formatFecha(partido.fecha)}</p>
      </header>

      <CargarResultadoForm
        grupoId={id}
        partidoId={partidoId}
        equipos={equiposConJugadores}
        yaJugado={partido.estado === "jugado"}
      />
    </main>
  );
}
