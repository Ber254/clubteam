import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { CopiarInvitacion } from "./copiar-invitacion";

type Miembro = {
  jugador_id: string;
  rol: string;
  jugadores: {
    nombre: string;
    posicion_preferida: string | null;
  } | null;
};

export default async function GrupoPage({
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

  // RLS: solo devuelve el grupo si el usuario es miembro.
  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, nombre, codigo_invitacion")
    .eq("id", id)
    .single();

  if (!grupo) notFound();

  const [{ data: miembros }, { data: partidos }] = await Promise.all([
    supabase
      .from("membresias")
      .select("jugador_id, rol, jugadores(nombre, posicion_preferida)")
      .eq("grupo_id", id)
      .order("fecha_ingreso", { ascending: true })
      .returns<Miembro[]>(),
    supabase
      .from("partidos")
      .select("id, fecha, cancha, estado")
      .eq("grupo_id", id)
      .order("fecha", { ascending: false })
      .limit(10),
  ]);

  const soyAdmin =
    miembros?.some((m) => m.jugador_id === user.id && m.rol === "admin") ??
    false;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <Link
          href="/dashboard"
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← Mis grupos
        </Link>
        <h1 className="text-3xl font-bold">{grupo.nombre}</h1>
        <p className="text-sm opacity-70">
          {miembros?.length ?? 0} {miembros?.length === 1 ? "miembro" : "miembros"}
        </p>
      </header>

      <Link
        href={`/grupos/${grupo.id}/partidos/nuevo`}
        className="block w-full rounded-lg bg-verde-acento py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
      >
        Armar partido
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/grupos/${grupo.id}/historial`}
          className="rounded-lg border border-black/15 py-2.5 text-center font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
        >
          Historial
        </Link>
        <Link
          href={`/grupos/${grupo.id}/ranking`}
          className="rounded-lg border border-black/15 py-2.5 text-center font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
        >
          Ranking
        </Link>
      </div>

      {soyAdmin && <CopiarInvitacion codigo={grupo.codigo_invitacion} />}

      {(partidos ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
            Partidos
          </h2>
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-blanco-cancha dark:divide-white/10 dark:border-white/15">
            {(partidos ?? []).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/grupos/${grupo.id}/partidos/${p.id}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {formatFecha(p.fecha)}
                    </span>
                    {p.cancha && (
                      <span className="block truncate text-sm opacity-60">
                        {p.cancha}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                      p.estado === "jugado"
                        ? "bg-verde-acento text-blanco-cancha"
                        : p.estado === "confirmado"
                          ? "bg-verde-acento/10 text-verde-acento"
                          : "bg-texto-principal/10 opacity-70"
                    }`}
                  >
                    {p.estado === "jugado"
                      ? "Jugado"
                      : p.estado === "confirmado"
                        ? "Confirmado"
                        : "Armando"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Miembros
        </h2>
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-blanco-cancha dark:divide-white/10 dark:border-white/15">
          {(miembros ?? []).map((m) => (
            <li
              key={m.jugador_id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="font-medium">
                  {m.jugadores?.nombre ?? "Jugador"}
                  {m.rol === "admin" && (
                    <span className="ml-2 rounded bg-verde-acento/10 px-1.5 py-0.5 text-xs opacity-70">
                      admin
                    </span>
                  )}
                </p>
                <p className="text-sm opacity-60">
                  {m.jugadores?.posicion_preferida ?? "Sin posición"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
