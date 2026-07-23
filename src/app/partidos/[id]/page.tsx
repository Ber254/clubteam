import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { POSICIONES, ICONOS_ROL } from "@/lib/posiciones";
import { BotonInvitar } from "./boton-invitar";
import { ResumenPartido } from "./resumen-partido";
import { BajarJugador } from "./bajar-jugador";

type Anotado = {
  jugador_id: string;
  posicion_jugada: string | null;
  jugadores: { nombre: string } | null;
};
type ComentarioRow = {
  id: string;
  texto: string;
  jugador_id: string;
  jugadores: { nombre: string; apodo: string | null } | null;
};

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
    .select("id, fecha, cancha, minimo, grupo_id, creado_por, estado, resultado, codigo_invitacion")
    .eq("id", id)
    .single();
  if (!partido) notFound();

  // Partido ya jugado: se muestra el resumen (marcador, equipos, comentarios),
  // NO el flujo de convocatoria/armado (ese partido ya pasó).
  if (partido.estado === "jugado" && partido.resultado) {
    const { data: coments } = await supabase
      .from("comentarios")
      .select("id, texto, jugador_id, jugadores(nombre, apodo)")
      .eq("partido_id", id)
      .order("created_at", { ascending: true })
      .returns<ComentarioRow[]>();

    const comentarios = (coments ?? []).map((c) => ({
      id: c.id,
      texto: c.texto,
      autor: c.jugadores?.apodo || c.jugadores?.nombre || "Jugador",
      esOrg: c.jugador_id === partido.creado_por,
    }));

    // Resultados viejos no tienen los rosters en el snapshot: se reconstruyen
    // partiendo los anotados en dos (igual que hace la carga de resultado).
    const r = partido.resultado as {
      equipos?: unknown;
      [k: string]: unknown;
    };
    let resultadoFinal = partido.resultado;
    if (!r.equipos) {
      const { data: anot } = await supabase
        .from("participaciones")
        .select("jugador_id, jugadores(nombre)")
        .eq("partido_id", id)
        .returns<Anotado[]>();
      const noms = (anot ?? []).map(
        (a, i) => a.jugadores?.nombre ?? `Jugador ${i + 1}`
      );
      const mitad = Math.ceil(noms.length / 2);
      const mk = (arr: string[]) =>
        arr.map((n) => ({ nombre: n, goles: 0, tarjeta: 0, lesion: false }));
      resultadoFinal = {
        ...r,
        equipos: { A: mk(noms.slice(0, mitad)), B: mk(noms.slice(mitad)) },
      };
    }

    return (
      <main className="mx-auto w-full max-w-md flex-1 space-y-4 p-5">
        <Link href="/dashboard" className="text-sm opacity-60 hover:opacity-100">
          ← Volver al muro
        </Link>

        {/* Tablilla del DT: portapapeles de madera + hoja */}
        <div
          className="relative rounded-2xl p-4 pb-5"
          style={{
            background:
              "repeating-linear-gradient(91deg, #9c6b3f 0 7px, #a9764a 7px 15px, #915f36 15px 22px)",
            boxShadow:
              "0 6px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(0,0,0,.15)",
          }}
        >
          <div
            className="absolute left-1/2 -top-2 h-6 w-20 -translate-x-1/2 rounded-b-sm rounded-t-md border border-[#8a9096]"
            style={{
              background: "linear-gradient(#fdfdfd, #c9ccd1 55%, #9aa0a6)",
              boxShadow: "0 2px 5px rgba(0,0,0,.35)",
            }}
          />

          <div className="rounded-md bg-[#fffdf5] p-4 shadow-inner">
            <ResumenPartido
              fecha={partido.fecha}
              resultado={resultadoFinal}
              comentarios={comentarios}
            />

            {/* Garabatos de DT del cierre (distintos a los de las otras hojas) */}
            <div className="doodles" aria-hidden="true">
              <span className="doodle" style={{ fontSize: 22, transform: "rotate(-5deg)" }}>
                3 puntos 🏆
              </span>
              <svg
                width="52"
                height="40"
                viewBox="0 0 52 40"
                fill="none"
                stroke="#6f6f6f"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: "rotate(3deg)" }}
              >
                <path d="M26 6 l4.7 9.5 10.5 1.5 -7.6 7.4 1.8 10.4 -9.4 -4.9 -9.4 4.9 1.8 -10.4 -7.6 -7.4 10.5 -1.5 z" />
              </svg>
              <span className="doodle" style={{ fontSize: 18, transform: "rotate(2deg)" }}>
                a lo hecho pecho
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { data: anotados } = await supabase
    .from("participaciones")
    .select("jugador_id, posicion_jugada, jugadores(nombre)")
    .eq("partido_id", id)
    .returns<Anotado[]>();

  const lista = anotados ?? [];
  const cantidad = lista.length;
  const faltan = Math.max(0, partido.minimo - cantidad);
  const seJuega = cantidad >= partido.minimo;
  const porRol = POSICIONES.map((rol) => ({
    rol,
    gente: lista.filter((a) => (a.posicion_jugada ?? "Donde sea") === rol),
  })).filter((g) => g.gente.length > 0);

  // El link de invitación va por /anotarse/[codigo del PARTIDO]: el invitado
  // se loguea, elige rol + apodo y queda anotado a ESTA fecha (y sumado al
  // club). Entrar directo a /partidos/[id] le daría 404 (RLS no lo deja ver
  // el partido si todavía no es miembro).
  const link = partido.codigo_invitacion
    ? `https://clubteam-two.vercel.app/anotarse/${partido.codigo_invitacion}`
    : `https://clubteam-two.vercel.app/partidos/${id}`;
  const mensaje = `No te cagues, vení al partido 😤\nJugamos ${formatFecha(partido.fecha)}${partido.cancha ? " en " + partido.cancha : ""}.\nAnotate y elegí tu puesto 👉 ${link}`;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 p-5">
      <Link href="/dashboard" className="text-sm opacity-60 hover:opacity-100">
        ← Inicio
      </Link>

      {/* Planilla del DT: portapapeles de madera + hoja */}
      <div
        className="relative rounded-2xl p-4 pb-5"
        style={{
          background:
            "repeating-linear-gradient(91deg, #9c6b3f 0 7px, #a9764a 7px 15px, #915f36 15px 22px)",
          boxShadow: "0 6px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(0,0,0,.15)",
        }}
      >
        <div
          className="absolute left-1/2 -top-2 h-6 w-20 -translate-x-1/2 rounded-b-sm rounded-t-md border border-[#8a9096]"
          style={{
            background: "linear-gradient(#fdfdfd, #c9ccd1 55%, #9aa0a6)",
            boxShadow: "0 2px 5px rgba(0,0,0,.35)",
          }}
        />

        <div className="rounded-md bg-[#fffdf5] p-4 shadow-inner">
          {seJuega && (
            <Link
              href={`/partidos/${id}/equipos`}
              className="mt-4 block rounded-xl bg-verde-acento p-4 text-center font-bold text-white shadow-md transition-opacity hover:opacity-90"
            >
              🎉 Plantel listo → armar los equipos
            </Link>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">
                {cantidad}/{partido.minimo}
              </span>
              <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-medium">
                {seJuega ? "✅ ¡Se juega!" : `Faltan ${faltan} para que se juegue`}
              </span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-verde-acento transition-all"
                style={{ width: `${Math.min(100, (cantidad / partido.minimo) * 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-lg font-semibold">{formatFecha(partido.fecha)}</p>
            {partido.cancha && <p className="text-sm opacity-60">{partido.cancha}</p>}
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase opacity-60">Titulares</p>
            {porRol.length === 0 && (
              <p className="rounded-lg border border-dashed border-black/15 py-6 text-center text-sm opacity-60">
                Todavía no se anotó nadie.
              </p>
            )}
            {porRol.map(({ rol, gente }) => (
              <div key={rol}>
                <p className="mb-1 flex items-center gap-1.5">
                  <span className="text-base leading-none">{ICONOS_ROL[rol]}</span>
                  <span className="text-xs font-semibold uppercase opacity-60">
                    {rol} ({gente.length})
                  </span>
                </p>
                <div className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white">
                  {gente.map((a) => (
                    <div
                      key={a.jugador_id}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {a.jugadores?.nombre ?? "Jugador"}
                        {a.jugador_id === partido.creado_por && (
                          <span className="ml-1.5 rounded bg-verde-acento/10 px-1.5 py-0.5 text-[10px] font-medium text-verde-acento">
                            organizador
                          </span>
                        )}
                      </span>
                      <BajarJugador
                        partidoId={partido.id}
                        jugadorId={a.jugador_id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Invitación: debajo del listado de jugadores */}
          <div className="mt-4">
            <BotonInvitar mensaje={mensaje} />
          </div>

          {/* Garabatos manuscritos (planes de juego) al pie del portapapeles */}
          <div className="doodles" aria-hidden="true">
            <span className="doodle" style={{ fontSize: 26, transform: "rotate(-5deg)" }}>
              2-3-1
            </span>
            <svg
              width="60"
              height="40"
              viewBox="0 0 60 40"
              fill="none"
              stroke="#6f6f6f"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: "rotate(-3deg)" }}
            >
              <circle cx="9" cy="30" r="4" />
              <path d="M6 8 L14 16 M14 8 L6 16" />
              <path d="M14 28 C 27 9, 40 34, 52 13" strokeDasharray="3 3" />
              <path d="M52 13 l-6 1 m6 -1 l-1 -6" />
            </svg>
            <span className="doodle" style={{ fontSize: 18, transform: "rotate(2deg)" }}>
              dale q se puede
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
