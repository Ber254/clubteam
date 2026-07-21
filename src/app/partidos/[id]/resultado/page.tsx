import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";

// Placeholder de la carga de resultado ("¿Cómo salió?").
// La pantalla completa (marcador + goleadores + frases) se arma como próximo paso.
export default async function ResultadoPage({
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
    .select("id, fecha, cancha")
    .eq("id", id)
    .single();
  if (!partido) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 p-5">
      <Link href="/dashboard" className="text-sm opacity-60 hover:opacity-100">
        ← Inicio
      </Link>

      <div className="rounded-2xl border border-black/10 bg-[#fffdf5] p-6 text-center shadow-sm">
        <p className="text-4xl">🏁</p>
        <h1 className="mt-2 text-2xl font-bold">¿Cómo salió?</h1>
        <p className="mt-1 text-sm opacity-60">
          {formatFecha(partido.fecha)}
          {partido.cancha ? ` · ${partido.cancha}` : ""}
        </p>
        <p className="mt-4 rounded-lg border border-dashed border-black/15 py-6 text-sm opacity-70">
          Pronto vas a poder cargar el marcador y los goleadores acá.
        </p>
      </div>
    </main>
  );
}
