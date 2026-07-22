import Link from "next/link";
import { formatFecha } from "@/lib/fechas";
import { TvAcciones } from "./tv-acciones";
import { MuroPrevia } from "@/app/partidos/[id]/muro-previa";
import { SuspenderFecha } from "./suspender-fecha";
import { CargarResultado } from "./cargar-resultado";

type Previa = {
  id: string;
  texto: string;
  jugador_id: string;
  autor: string;
  esOrg: boolean;
};

type Partido = {
  id: string;
  fecha: string;
  cancha: string | null;
  codigo_invitacion: string;
  minimo: number;
  creado_por: string;
};

// Un televisor del muro = un partido planificado. Se apilan cuando hay más
// de uno (el que se organiza arriba, el siguiente debajo).
export function TvMuro({
  partido,
  codigoClub,
  cantidad,
  previaInicial,
  puedeSuspender,
}: {
  partido: Partido;
  codigoClub: string;
  cantidad: number;
  previaInicial: Previa[];
  puedeSuspender: boolean;
}) {
  const faltan = Math.max(0, partido.minimo - cantidad);
  const seJuega = cantidad >= partido.minimo;
  const yaPaso = new Date(partido.fecha).getTime() < Date.now();
  const etiqueta = formatFecha(partido.fecha) + (partido.cancha ? ` · ${partido.cancha}` : "");

  return (
    <div
      className="relative mt-12 rounded-2xl pb-5 pl-4 pr-20 pt-4"
      style={{
        background: "linear-gradient(#6a4a33, #4e3722)",
        boxShadow: "inset 0 0 0 3px rgba(255,255,255,.08), 0 10px 24px rgba(0,0,0,.3)",
      }}
    >
      {/* Etiquetas laterales del televisor: suspender (creador) + cargar resultado */}
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
        {puedeSuspender && (
          <SuspenderFecha partidoId={partido.id} etiqueta={etiqueta} />
        )}
        <CargarResultado partidoId={partido.id} yaPaso={yaPaso} />
      </div>

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
          boxShadow: "inset 0 0 22px rgba(0,0,0,.14), inset 0 0 0 2px rgba(0,0,0,.25)",
        }}
      >
        {/* Zona clickeable: lleva a la organización del partido */}
        <Link
          href={`/partidos/${partido.id}`}
          className="-m-1 block rounded-lg p-1 transition-colors hover:bg-verde-acento/5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold">{formatFecha(partido.fecha)}</p>
              {partido.cancha && (
                <p className="text-sm opacity-60">{partido.cancha}</p>
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
          partidoId={partido.id}
          codigo={codigoClub}
          cuando={formatFecha(partido.fecha)}
          lugar={partido.cancha}
        />

        <MuroPrevia
          partidoId={partido.id}
          creadoPor={partido.creado_por}
          inicial={previaInicial}
        />
      </div>
    </div>
  );
}
