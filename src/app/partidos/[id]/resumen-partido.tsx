import { formatFecha } from "@/lib/fechas";

type JugadorResumen = {
  nombre: string;
  goles: number;
  tarjeta: number;
  lesion: boolean;
};
type Resultado = {
  marcador: { A: number; B: number };
  nombres: { A: string; B: string };
  equipos?: { A: JugadorResumen[]; B: JugadorResumen[] };
  goleadores?: { nombre: string; goles: number; equipo: string }[];
  sinAutor?: { A: number; B: number };
  anecdota: string | null;
};
type Comentario = {
  id: string;
  texto: string;
  autor: string;
  esOrg: boolean;
};

// Marcas del detalle de cada jugador (goles / tarjeta / lesión)
function Detalle({ j }: { j: JugadorResumen }) {
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs opacity-70">
      {j.goles > 0 && <span>{"⚽".repeat(j.goles)}</span>}
      {j.tarjeta === 1 && <span>🟨</span>}
      {j.tarjeta === 2 && <span>🟥</span>}
      {j.lesion && <span>🤕</span>}
    </span>
  );
}

function Columna({
  dot,
  nombre,
  jugadores,
}: {
  dot: string;
  nombre: string;
  jugadores: JugadorResumen[];
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/60">
      <p className="border-b border-black/10 px-2 py-1.5 text-xs font-bold uppercase tracking-wide opacity-70">
        {dot} {nombre} ({jugadores.length})
      </p>
      {jugadores.map((j, i) => (
        <div
          key={`${j.nombre}-${i}`}
          className="flex items-center justify-between gap-2 border-t border-black/10 px-2 py-2 first:border-t-0"
        >
          <span className="truncate text-sm font-medium">{j.nombre}</span>
          <Detalle j={j} />
        </div>
      ))}
    </div>
  );
}

// Resumen de solo lectura de un partido ya jugado: marcador, equipos y
// comentarios. Se usa al entrar desde el historial del muro.
export function ResumenPartido({
  fecha,
  resultado,
  comentarios,
}: {
  fecha: string;
  resultado: Resultado;
  comentarios: Comentario[];
}) {
  const { marcador, nombres, equipos } = resultado;
  const equipoA = equipos?.A ?? [];
  const equipoB = equipos?.B ?? [];
  const top = [...(resultado.goleadores ?? [])].sort(
    (a, b) => b.goles - a.goles
  )[0];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold">
          {formatFecha(fecha)}
          {top ? ` · ⚽ ${top.nombre} (${top.goles})` : ""}
        </p>
      </div>

      {/* Marcador */}
      <div className="flex items-start justify-center gap-4">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-black/15 bg-white text-4xl font-bold tabular-nums shadow-inner">
            {marcador.A}
          </div>
          <span className="mt-1 text-xs font-medium opacity-60">{nombres.A}</span>
        </div>
        <span className="mt-5 text-3xl font-bold opacity-40">-</span>
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-black/15 bg-white text-4xl font-bold tabular-nums shadow-inner">
            {marcador.B}
          </div>
          <span className="mt-1 text-xs font-medium opacity-60">{nombres.B}</span>
        </div>
      </div>

      {resultado.anecdota && (
        <p className="text-center text-sm italic opacity-70">
          “{resultado.anecdota}”
        </p>
      )}

      {/* Equipos */}
      <div className="grid grid-cols-2 gap-2">
        <Columna dot="🔵" nombre={nombres.A} jugadores={equipoA} />
        <Columna dot="🔴" nombre={nombres.B} jugadores={equipoB} />
      </div>

      {/* Comentarios */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase opacity-60">
          💬 Comentarios del partido
        </p>
        {comentarios.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 py-4 text-center text-xs opacity-55">
            No hubo comentarios en este partido.
          </p>
        ) : (
          <div className="space-y-2">
            {comentarios.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-black/10 bg-white px-3 py-2"
              >
                <p className="text-xs font-semibold">
                  {c.autor}
                  {c.esOrg && (
                    <span className="ml-1 rounded bg-verde-acento/10 px-1.5 py-0.5 text-[10px] font-medium text-verde-acento">
                      organizador
                    </span>
                  )}
                </p>
                <p className="text-sm">{c.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
