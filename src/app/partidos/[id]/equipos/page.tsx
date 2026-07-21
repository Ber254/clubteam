import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFecha } from "@/lib/fechas";
import { ArmarEquipos } from "./armar-equipos";

type Anotado = {
  jugador_id: string;
  posicion_jugada: string | null;
  jugadores: { nombre: string; nivel_global: number | null } | null;
};

export default async function EquiposPage({
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
    .select("id, fecha, cancha, minimo")
    .eq("id", id)
    .single();
  if (!partido) notFound();

  const { data: anotados } = await supabase
    .from("participaciones")
    .select("jugador_id, posicion_jugada, jugadores(nombre, nivel_global)")
    .eq("partido_id", id)
    .returns<Anotado[]>();

  const jugadores = (anotados ?? []).map((a, i) => ({
    id: a.jugador_id,
    nombre: a.jugadores?.nombre ?? `Jugador ${i + 1}`,
    nivel: a.jugadores?.nivel_global ?? 5,
    rol: a.posicion_jugada ?? "Donde sea",
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 p-5">
      <Link
        href={`/partidos/${id}`}
        className="text-sm opacity-60 hover:opacity-100"
      >
        ← Volver a la convocatoria
      </Link>

      {/* Tablilla del DT: portapapeles de madera + hoja */}
      <div
        className="relative rounded-2xl p-4 pb-5"
        style={{
          background:
            "repeating-linear-gradient(91deg, #9c6b3f 0 7px, #a9764a 7px 15px, #915f36 15px 22px)",
          boxShadow: "0 6px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(0,0,0,.15)",
        }}
      >
        {/* Pinza metálica */}
        <div
          className="absolute left-1/2 -top-2 h-6 w-20 -translate-x-1/2 rounded-b-sm rounded-t-md border border-[#8a9096]"
          style={{
            background: "linear-gradient(#fdfdfd, #c9ccd1 55%, #9aa0a6)",
            boxShadow: "0 2px 5px rgba(0,0,0,.35)",
          }}
        />

        <div className="rounded-md bg-[#fffdf5] p-4 shadow-inner">
          <h1 className="text-2xl font-bold">Armar equipos</h1>
          <p className="mb-4 text-sm opacity-60">
            {formatFecha(partido.fecha)}
            {partido.cancha ? ` · ${partido.cancha}` : ""} · {jugadores.length} jugadores
          </p>

          {jugadores.length < 2 ? (
            <p className="rounded-lg border border-dashed border-black/15 py-8 text-center text-sm opacity-60">
              Todavía no hay jugadores suficientes para armar equipos.
            </p>
          ) : (
            <ArmarEquipos
              jugadores={jugadores}
              cuando={formatFecha(partido.fecha)}
              lugar={partido.cancha}
            />
          )}

          {/* Garabatos de DT al pie de la hoja */}
          <div className="doodles" aria-hidden="true">
            <span className="doodle" style={{ fontSize: 24, transform: "rotate(-4deg)" }}>
              dupla 🔒
            </span>
            <svg
              width="54"
              height="40"
              viewBox="0 0 54 40"
              fill="none"
              stroke="#6f6f6f"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: "rotate(2deg)" }}
            >
              <circle cx="27" cy="20" r="7" />
              <path d="M27 13 L27 20 L33 24 M27 20 L21 24" />
              <path d="M6 34 C 18 24, 36 24, 48 34" strokeDasharray="3 3" />
            </svg>
            <span className="doodle" style={{ fontSize: 18, transform: "rotate(3deg)" }}>
              que se mueva
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
