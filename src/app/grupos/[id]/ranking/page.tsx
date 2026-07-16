import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type RankingRow = {
  jugador_id: string;
  nombre: string;
  partidos_jugados: number;
  goles: number;
  asistencias: number;
};

export default async function RankingPage({
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

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, nombre")
    .eq("id", id)
    .single();
  if (!grupo) notFound();

  // Vista con security_invoker: RLS filtra a los miembros del grupo.
  const { data: ranking } = await supabase
    .from("ranking_grupo")
    .select("jugador_id, nombre, partidos_jugados, goles, asistencias")
    .eq("grupo_id", id)
    .order("goles", { ascending: false })
    .order("asistencias", { ascending: false })
    .order("nombre", { ascending: true })
    .returns<RankingRow[]>();

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <Link
          href={`/grupos/${id}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← {grupo.nombre}
        </Link>
        <h1 className="text-2xl font-bold">Ranking</h1>
        <p className="text-sm opacity-70">Goles acumulados en el grupo</p>
      </header>

      <div className="overflow-hidden rounded-lg border border-black/10 bg-blanco-cancha dark:border-white/15">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide opacity-60 dark:border-white/15">
              <th className="px-3 py-2 font-semibold">Jugador</th>
              <th className="px-2 py-2 text-center font-semibold" title="Partidos jugados">
                PJ
              </th>
              <th className="px-2 py-2 text-center font-semibold">Goles</th>
              <th className="px-2 py-2 text-center font-semibold" title="Asistencias">
                Asist.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10 dark:divide-white/10">
            {(ranking ?? []).map((r, i) => (
              <tr key={r.jugador_id}>
                <td className="px-3 py-2">
                  <span className="mr-1 opacity-40 tabular-nums">{i + 1}.</span>
                  {r.nombre}
                </td>
                <td className="px-2 py-2 text-center tabular-nums opacity-70">
                  {r.partidos_jugados}
                </td>
                <td className="px-2 py-2 text-center font-semibold tabular-nums">
                  {r.goles}
                </td>
                <td className="px-2 py-2 text-center tabular-nums opacity-70">
                  {r.asistencias}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(ranking ?? []).length === 0 && (
        <p className="text-center text-sm opacity-60">
          Sin datos todavía.
        </p>
      )}
    </main>
  );
}
