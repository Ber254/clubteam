import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { TrapoClub } from "./trapo-club";
import { OnboardingModal } from "./onboarding-modal";

type ClubRow = { id: string; nombre: string } | null;

// El muro del club: lo primero que ve el usuario al entrar.
// Sin club todavía => TV sin partido + "Crear partido" (el club nace solo
// con los que se anoten a ese primer partido).
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jugador } = await supabase
    .from("jugadores")
    .select("nombre, apodo")
    .eq("id", user.id)
    .single();

  // ¿Ya pertenece a algún club?
  const { data: membresias } = await supabase
    .from("membresias")
    .select("grupo_id, grupos(id, nombre)")
    .eq("jugador_id", user.id)
    .order("fecha_ingreso", { ascending: false })
    .limit(1)
    .returns<{ grupo_id: string; grupos: ClubRow }[]>();

  const club = membresias?.[0]?.grupos ?? null;

  // Próximo partido del club (si hay)
  const { data: partidos } = club
    ? await supabase
        .from("partidos")
        .select("id, fecha, cancha, estado")
        .eq("grupo_id", club.id)
        .neq("estado", "jugado")
        .order("fecha", { ascending: true })
        .limit(1)
    : { data: null };

  const proximo = partidos?.[0] ?? null;
  const nombre = jugador?.apodo || jugador?.nombre || user.email;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      {!jugador?.apodo && <OnboardingModal />}

      <div className="flex items-center justify-between">
        <p className="text-sm opacity-70">Hola, {nombre} 👋</p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm transition-colors hover:bg-black/5"
          >
            Salir
          </button>
        </form>
      </div>

      {/* Trapo con el nombre del club (editable si ya existe) */}
      <div className="text-center">
        <TrapoClub clubId={club?.id ?? null} nombreInicial={club?.nombre ?? "Tu club"} />
      </div>

      {/* TV */}
      <div
        className="relative mt-12 rounded-2xl p-4 pb-5"
        style={{
          background: "linear-gradient(#6a4a33, #4e3722)",
          boxShadow:
            "inset 0 0 0 3px rgba(255,255,255,.08), 0 10px 24px rgba(0,0,0,.3)",
        }}
      >
        {/* Antena */}
        <svg
          viewBox="0 0 120 60"
          className="absolute -top-10 left-1/2 h-14 w-28 -translate-x-1/2"
          fill="none"
          stroke="#7a7a7a"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="60" y1="52" x2="26" y2="8" />
          <line x1="60" y1="52" x2="98" y2="6" />
          <circle cx="26" cy="8" r="3.5" fill="#7a7a7a" />
          <circle cx="98" cy="6" r="3.5" fill="#7a7a7a" />
          <ellipse cx="60" cy="54" rx="10" ry="5" fill="#4a4a4a" stroke="none" />
        </svg>

        <div
          className="rounded-lg p-4"
          style={{
            background: "#fbfdf7",
            boxShadow:
              "inset 0 0 22px rgba(0,0,0,.14), inset 0 0 0 2px rgba(0,0,0,.25)",
          }}
        >
          {proximo ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold">
                {formatFecha(proximo.fecha)}
              </p>
              {proximo.cancha && (
                <p className="text-sm opacity-60">{proximo.cancha}</p>
              )}
              <Link
                href={`/partidos/${proximo.id}`}
                className="mt-2 block font-medium text-verde-acento"
              >
                👥 Ver la convocatoria →
              </Link>
            </div>
          ) : (
            <div className="space-y-2 py-4 text-center">
              <p className="text-3xl">📺</p>
              <p className="font-semibold">Todavía no hay partido</p>
              <p className="text-sm opacity-70">
                Creá el primero y compartí el link. Los que se anoten van a
                formar tu club automáticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      <Link
        href="/partidos/nuevo"
        className="block w-full rounded-lg bg-verde-acento py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
      >
        + Crear partido
      </Link>
    </main>
  );
}
