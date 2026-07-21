import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { TrapoClub } from "./trapo-club";
import { OnboardingModal } from "./onboarding-modal";
import { TvAcciones } from "./tv-acciones";
import { SuspenderFecha } from "./suspender-fecha";
import { MuroPrevia } from "@/app/partidos/[id]/muro-previa";

type ClubRow = { id: string; nombre: string } | null;
type ComentarioRow = {
  id: string;
  texto: string;
  jugador_id: string;
  jugadores: { nombre: string; apodo: string | null } | null;
};

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

  // Partidos planificados del club (sin jugados ni suspendidos)
  const { data: partidos } = club
    ? await supabase
        .from("partidos")
        .select("id, fecha, cancha, estado, codigo_invitacion, minimo, creado_por")
        .eq("grupo_id", club.id)
        .neq("estado", "jugado")
        .neq("estado", "suspendido")
        .order("fecha", { ascending: true })
    : { data: null };

  const proximo = partidos?.[0] ?? null;

  // Fechas que el usuario (creador) puede suspender
  const suspendibles = (partidos ?? [])
    .filter((p) => p.creado_por === user.id)
    .map((p) => ({
      id: p.id,
      etiqueta: formatFecha(p.fecha) + (p.cancha ? ` · ${p.cancha}` : ""),
    }));

  // Cuántos se anotaron al próximo partido
  const { count: anotados } = proximo
    ? await supabase
        .from("participaciones")
        .select("*", { count: "exact", head: true })
        .eq("partido_id", proximo.id)
    : { count: 0 };

  const cantidad = anotados ?? 0;
  const faltan = proximo ? Math.max(0, proximo.minimo - cantidad) : 0;
  const seJuega = proximo ? cantidad >= proximo.minimo : false;

  // Comentarios de la previa del próximo partido
  const { data: comentarios } = proximo
    ? await supabase
        .from("comentarios")
        .select("id, texto, jugador_id, jugadores(nombre, apodo)")
        .eq("partido_id", proximo.id)
        .order("created_at", { ascending: true })
        .returns<ComentarioRow[]>()
    : { data: null };

  const previaInicial = (comentarios ?? []).map((c) => ({
    id: c.id,
    texto: c.texto,
    jugador_id: c.jugador_id,
    autor: c.jugadores?.apodo || c.jugadores?.nombre || "Jugador",
    esOrg: c.jugador_id === (proximo?.creado_por ?? ""),
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      {!jugador?.apodo && <OnboardingModal />}

      <div className="flex items-center justify-end">
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

      {/* TV — borde derecho ensanchado para la perilla de suspender */}
      <div
        className="relative mt-12 rounded-2xl pb-5 pl-4 pr-14 pt-4"
        style={{
          background: "linear-gradient(#6a4a33, #4e3722)",
          boxShadow:
            "inset 0 0 0 3px rgba(255,255,255,.08), 0 10px 24px rgba(0,0,0,.3)",
        }}
      >
        {/* Perilla de suspender fecha (solo la ve el creador) */}
        <SuspenderFecha partidos={suspendibles} />

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
            <div>
              {/* Zona clickeable: lleva a la organización del partido */}
              <Link
                href={`/partidos/${proximo.id}`}
                className="-m-1 block rounded-lg p-1 transition-colors hover:bg-verde-acento/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">
                      {formatFecha(proximo.fecha)}
                    </p>
                    {proximo.cancha && (
                      <p className="text-sm opacity-60">{proximo.cancha}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-black/5 px-2 py-1 text-xs font-medium">
                    {seJuega ? "✅ ¡Se juega!" : `Faltan ${faltan}`}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-verde-acento">
                  👥 Ver los {cantidad} anotados y armar equipos →
                </p>
              </Link>

              <TvAcciones
                partidoId={proximo.id}
                codigo={proximo.codigo_invitacion}
                cuando={formatFecha(proximo.fecha)}
                lugar={proximo.cancha}
              />

              <MuroPrevia
                partidoId={proximo.id}
                creadoPor={proximo.creado_por}
                inicial={previaInicial}
              />
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

      {club ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: "3fr 1fr" }}>
          <Link
            href={`/partidos/nuevo?club=${club.id}`}
            className="rounded-lg bg-verde-acento py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
          >
            + Armar otro partido
          </Link>
          <Link
            href="/partidos/nuevo"
            className="flex items-center justify-center rounded-lg border border-black/15 px-1 py-2 text-center text-xs font-medium leading-tight transition-colors hover:bg-black/5"
          >
            ➕ Crear otro Club
          </Link>
        </div>
      ) : (
        <Link
          href="/partidos/nuevo"
          className="block w-full rounded-lg bg-verde-acento py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
        >
          + Crear partido
        </Link>
      )}
    </main>
  );
}
