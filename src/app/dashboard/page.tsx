import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type MembresiaConGrupo = {
  rol: string;
  grupos: {
    id: string;
    nombre: string;
  } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: jugador } = await supabase
    .from("jugadores")
    .select("nombre")
    .eq("id", user.id)
    .single();

  const { data: membresias } = await supabase
    .from("membresias")
    .select("rol, grupos(id, nombre)")
    .eq("jugador_id", user.id)
    .order("fecha_ingreso", { ascending: false })
    .returns<MembresiaConGrupo[]>();

  const nombre = jugador?.nombre ?? user.email;
  const grupos = (membresias ?? []).filter((m) => m.grupos !== null);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hola, {nombre} 👋</h1>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
          >
            Salir
          </button>
        </form>
      </header>

      <Link
        href="/grupos/nuevo"
        className="block w-full rounded-lg bg-verde-acento py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
      >
        + Crear grupo
      </Link>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Mis grupos
        </h2>

        {grupos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm opacity-70 dark:border-white/20">
            Todavía no estás en ningún grupo. Creá uno o pedile el link de
            invitación a un amigo.
          </p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-blanco-cancha dark:divide-white/10 dark:border-white/15">
            {grupos.map((m) => (
              <li key={m.grupos!.id}>
                <Link
                  href={`/grupos/${m.grupos!.id}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="font-medium">{m.grupos!.nombre}</span>
                  {m.rol === "admin" && (
                    <span className="rounded bg-verde-acento/10 px-1.5 py-0.5 text-xs opacity-70">
                      admin
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
