import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";

// Convocatoria mínima: fecha, lugar y quiénes se anotaron.
// (El armador de equipos y el resto del flujo llegan en el próximo paso.)
export default async function PartidoPage({
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
    .select("id, fecha, cancha, minimo, grupo_id")
    .eq("id", id)
    .single();
  if (!partido) notFound();

  const { data: anotados } = await supabase
    .from("participaciones")
    .select("jugador_id, posicion_jugada, jugadores(nombre)")
    .eq("partido_id", id)
    .returns<{ jugador_id: string; posicion_jugada: string | null; jugadores: { nombre: string } | null }[]>();

  const cantidad = anotados?.length ?? 0;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <Link href="/dashboard" className="text-sm opacity-60 hover:opacity-100">
        ← Inicio
      </Link>

      <div className="rounded-xl border-2 border-verde-acento bg-verde-acento/10 p-4">
        <p className="font-bold text-verde-acento">📣 Invitación al partido</p>
        <p className="mb-2 text-xs uppercase opacity-70">Copiá este link y pegalo en el grupo</p>
        <code className="block truncate rounded-lg border border-black/15 bg-blanco-cancha px-3 py-2 text-sm">
          {`clubteam-two.vercel.app/partidos/${id}`}
        </code>
      </div>

      <div className="rounded-xl border border-black/10 bg-blanco-cancha p-4">
        <p className="text-lg font-semibold">{formatFecha(partido.fecha)}</p>
        {partido.cancha && <p className="text-sm opacity-60">{partido.cancha}</p>}
        <p className="mt-2 text-sm font-medium text-verde-acento">
          {cantidad}/{partido.minimo} anotados
        </p>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase opacity-60">Anotados</p>
        <div className="divide-y divide-black/10 rounded-xl border border-black/10 bg-blanco-cancha">
          {(anotados ?? []).map((a) => (
            <div key={a.jugador_id} className="px-4 py-3">
              <p className="font-medium">{a.jugadores?.nombre ?? "Jugador"}</p>
              <p className="text-sm opacity-60">{a.posicion_jugada ?? "Sin puesto"}</p>
            </div>
          ))}
          {cantidad === 0 && (
            <p className="px-4 py-6 text-center text-sm opacity-60">
              Todavía no se anotó nadie.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
