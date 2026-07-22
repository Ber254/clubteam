import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { TrapoClub } from "./trapo-club";
import { OnboardingModal } from "./onboarding-modal";
import { TvMuro } from "./tv-muro";

type ClubRow = { id: string; nombre: string } | null;
type Resultado = {
  marcador: { A: number; B: number };
  nombres: { A: string; B: string };
  goleadores: { nombre: string; goles: number; equipo: string }[];
  anecdota: string | null;
} | null;
type HistorialRow = {
  id: string;
  fecha: string;
  cancha: string | null;
  estado: string;
  resultado: Resultado;
};
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

  const planificados = partidos ?? [];

  // El muro admite como mucho 2 fechas (los TVs). Un partido ocupa lugar
  // hasta que se RESUELVE: se le carga el resultado (pasa a 'jugado') o se
  // suspende. Que la fecha ya haya vencido NO libera el cupo: un partido
  // jugado sin resultado cargado sigue ocupando su TV.
  const puedeCrear = planificados.length < 2;

  // Datos de cada TV: anotados + previa (comentarios) por partido.
  const tvs = await Promise.all(
    planificados.map(async (p) => {
      const [{ count }, { data: coments }] = await Promise.all([
        supabase
          .from("participaciones")
          .select("*", { count: "exact", head: true })
          .eq("partido_id", p.id),
        supabase
          .from("comentarios")
          .select("id, texto, jugador_id, jugadores(nombre, apodo)")
          .eq("partido_id", p.id)
          .order("created_at", { ascending: true })
          .returns<ComentarioRow[]>(),
      ]);
      return {
        partido: p,
        cantidad: count ?? 0,
        puedeSuspender: p.creado_por === user.id,
        previaInicial: (coments ?? []).map((c) => ({
          id: c.id,
          texto: c.texto,
          jugador_id: c.jugador_id,
          autor: c.jugadores?.apodo || c.jugadores?.nombre || "Jugador",
          esOrg: c.jugador_id === p.creado_por,
        })),
      };
    })
  );

  // Historial: fechas suspendidas o ya jugadas (van debajo de los TVs)
  const { data: historialRaw } = club
    ? await supabase
        .from("partidos")
        .select("id, fecha, cancha, estado, resultado")
        .eq("grupo_id", club.id)
        .in("estado", ["suspendido", "jugado"])
        .order("fecha", { ascending: false })
        .returns<HistorialRow[]>()
    : { data: null };

  const historialBase = historialRaw ?? [];

  // Conteo de comentarios ("lo que pasó en la cancha") por partido del historial
  const historial = await Promise.all(
    historialBase.map(async (h) => {
      const { count } = await supabase
        .from("comentarios")
        .select("*", { count: "exact", head: true })
        .eq("partido_id", h.id);
      return { ...h, comentarios: count ?? 0 };
    })
  );

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

      {/* Un televisor por partido planificado (el de arriba es el próximo) */}
      {tvs.length > 0 ? (
        tvs.map((tv) => (
          <TvMuro
            key={tv.partido.id}
            partido={tv.partido}
            cantidad={tv.cantidad}
            previaInicial={tv.previaInicial}
            puedeSuspender={tv.puedeSuspender}
          />
        ))
      ) : (
        <div
          className="relative mt-12 rounded-2xl p-4 pb-5"
          style={{
            background: "linear-gradient(#6a4a33, #4e3722)",
            boxShadow:
              "inset 0 0 0 3px rgba(255,255,255,.08), 0 10px 24px rgba(0,0,0,.3)",
          }}
        >
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
            className="space-y-2 rounded-lg p-4 py-8 text-center"
            style={{
              background: "#fbfdf7",
              boxShadow:
                "inset 0 0 22px rgba(0,0,0,.14), inset 0 0 0 2px rgba(0,0,0,.25)",
            }}
          >
            <p className="text-3xl">📺</p>
            <p className="font-semibold">Todavía no hay partido</p>
            <p className="text-sm opacity-70">
              Creá el primero y compartí el link. Los que se anoten van a
              formar tu club automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* Crear/armar partido: justo debajo de los TVs, antes del historial */}
      {!club ? (
        <Link
          href="/partidos/nuevo"
          className="block w-full rounded-lg bg-verde-acento py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
        >
          + Crear partido
        </Link>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "3fr 1fr" }}>
          {puedeCrear ? (
            <Link
              href={`/partidos/nuevo?club=${club.id}`}
              className="rounded-lg bg-verde-acento py-3 text-center font-medium text-background transition-opacity hover:opacity-90"
            >
              + Armar otro partido
            </Link>
          ) : (
            <div className="rounded-lg border border-dashed border-black/20 px-3 py-2.5 text-center text-xs leading-tight opacity-70">
              Ya tenés 2 fechas en el muro. Cargá el resultado de una que ya se
              jugó (o suspendela) para armar otra.
            </div>
          )}
          <Link
            href="/partidos/nuevo"
            className="flex items-center justify-center rounded-lg border border-black/15 px-1 py-2 text-center text-xs font-medium leading-tight transition-colors hover:bg-black/5"
          >
            ➕ Crear otro Club
          </Link>
        </div>
      )}

      {/* Historial: fechas suspendidas o ya jugadas */}
      {historial.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase opacity-50">
            🏁 Ya jugados
          </p>
          {historial.map((h) => {
            const suspendido = h.estado === "suspendido";
            const r = h.resultado;

            // Card rica para partidos jugados con resultado cargado
            if (!suspendido && r) {
              const { A, B } = r.marcador;
              const empate = A === B;
              const titulo = empate
                ? `Empataron ${A}-${B}`
                : `Ganó ${A > B ? r.nombres.A : r.nombres.B} ${Math.max(A, B)}-${Math.min(A, B)}`;
              const topGoleador = [...r.goleadores].sort(
                (a, b) => b.goles - a.goles
              )[0];
              return (
                <Link
                  key={h.id}
                  href={`/partidos/${h.id}`}
                  className="block rounded-lg border border-black/10 bg-white px-3 py-2.5 shadow-sm transition-colors hover:bg-black/[0.02]"
                >
                  <p className="text-sm font-bold">{titulo}</p>
                  <p className="mt-0.5 text-xs opacity-60">
                    {formatFecha(h.fecha)}
                    {topGoleador
                      ? ` · ⚽ ${topGoleador.nombre} (${topGoleador.goles})`
                      : ""}
                  </p>
                  {r.anecdota && (
                    <p className="mt-1 truncate text-xs italic opacity-70">
                      “{r.anecdota}”
                    </p>
                  )}
                  <p className="mt-1 text-[11px] opacity-45">
                    💬 {h.comentarios} comentario{h.comentarios === 1 ? "" : "s"} · lo
                    que pasó en la cancha, quedó ahí
                  </p>
                </Link>
              );
            }

            // Fila simple: suspendido, o jugado sin resultado cargado
            return (
              <Link
                key={h.id}
                href={`/partidos/${h.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2.5 transition-colors hover:bg-black/5"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-medium ${suspendido ? "line-through opacity-60" : ""}`}
                  >
                    {formatFecha(h.fecha)}
                  </p>
                  {h.cancha && (
                    <p className="truncate text-xs opacity-50">{h.cancha}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    suspendido
                      ? "bg-red-100 text-red-600"
                      : "bg-verde-acento/10 text-verde-acento"
                  }`}
                >
                  {suspendido ? "🚫 Suspendido" : "✅ Jugado"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
