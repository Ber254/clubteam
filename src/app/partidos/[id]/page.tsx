import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { POSICIONES } from "@/lib/posiciones";
import { ICONOS_ROL } from "@/app/selector-rol";
import { BotonInvitar } from "./boton-invitar";

type Anotado = {
  jugador_id: string;
  posicion_jugada: string | null;
  jugadores: { nombre: string } | null;
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
    .select("id, fecha, cancha, minimo, grupo_id, creado_por")
    .eq("id", id)
    .single();
  if (!partido) notFound();

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

  const link = `https://clubteam-two.vercel.app/partidos/${id}`;
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
            <div className="mt-4 rounded-xl bg-verde-acento p-4 text-center font-bold text-white shadow-md">
              🎉 Plantel listo, a organizar los equipos
            </div>
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
                <p className="mb-1 text-xs font-semibold uppercase opacity-60">
                  {ICONOS_ROL[rol]} {rol} ({gente.length})
                </p>
                <div className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white">
                  {gente.map((a) => (
                    <p key={a.jugador_id} className="px-3 py-2 font-medium">
                      {a.jugadores?.nombre ?? "Jugador"}
                    </p>
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
