import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NuevoPartidoForm } from "./form";

type MiembroRow = {
  jugador_id: string;
  nivel_en_grupo: number | null;
  jugadores: {
    nombre: string;
    posicion_preferida: string | null;
  } | null;
};

export default async function NuevoPartidoPage({
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

  // RLS: solo miembros del grupo llegan hasta acá.
  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, nombre")
    .eq("id", id)
    .single();

  if (!grupo) notFound();

  const { data: miembros } = await supabase
    .from("membresias")
    .select("jugador_id, nivel_en_grupo, jugadores(nombre, posicion_preferida)")
    .eq("grupo_id", id)
    .order("fecha_ingreso", { ascending: true })
    .returns<MiembroRow[]>();

  // El nivel viaja al cliente solo para calcular el balanceo.
  const jugadores = (miembros ?? []).map((m) => ({
    id: m.jugador_id,
    nombre: m.jugadores?.nombre ?? "Jugador",
    posicion: m.jugadores?.posicion_preferida ?? null,
    nivel: Number(m.nivel_en_grupo ?? 5),
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <Link
          href={`/grupos/${grupo.id}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← {grupo.nombre}
        </Link>
        <h1 className="text-2xl font-bold">Armar partido</h1>
        <p className="text-sm opacity-70">
          Marcá quiénes juegan y generamos los equipos balanceados.
        </p>
      </header>

      <NuevoPartidoForm grupoId={grupo.id} jugadores={jugadores} />
    </main>
  );
}
