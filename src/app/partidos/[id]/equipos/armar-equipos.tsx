"use client";

import { useState } from "react";

type J = { id: string; nombre: string; nivel: number; rol: string };
type Equipos = { A: J[]; B: J[] };
type Nombres = { A: string; B: string };

const ICON: Record<string, string> = {
  Arquero: "🧤",
  Defensa: "🛡️",
  Ataque: "⚽",
  "Donde sea": "🔄",
};

const PARES: [string, string][] = [
  ["Primera", "Reserva"],
  ["Con pechera", "Sin pechera"],
  ["Camisetas", "Pecheras"],
  ["Locales", "Visitantes"],
  ["Zurdos", "Diestros"],
  ["Los de siempre", "Los nuevos"],
  ["Mates", "Birras"],
  ["Equipo Messi", "Equipo Cristiano"],
];

// Frases futboleras según la formación del equipo (por roles declarados).
const FRASES: Record<string, string[]> = {
  sinArquero: [
    "⚠️ Sin arquero: los van a llenar de goles.",
    "¿Quién ataja? El poste, crucemos los dedos.",
    "El que llegue último, ataja. Clásico de potrero.",
    "Van a cobrar más goles que likes.",
    "El arco lo cuida San Cayetano.",
    "Defensa heroica o goleada histórica. No hay medias tintas.",
  ],
  dobleArquero: [
    "Dos arqueros: uno ataja, el otro mira el partido.",
    "Muralla doble atrás… ¿y los goles quién los mete?",
    "Fort Knox en el arco, desierto en el ataque.",
    "Con dos '1' no te hacen goles… ni vos tampoco.",
    "Arco blindado. Ahora, a ver si la pasan de mitad de cancha.",
  ],
  ofensivo: [
    "Todos adelante: o golean o los golean.",
    "Defensa es una palabra que este equipo no conoce.",
    "Sacan del medio y ya están en el área rival.",
    "Nueve killers y un valiente atrás.",
    "Van a ganar 7 a 6 o no van a ganar.",
    "Ataque, ataque y después Dios proveerá.",
  ],
  defensivo: [
    "Cerrojo total: entran con pelota y todo o no entran.",
    "Autobús estacionado frente al arco.",
    "0 a 0 y a cobrar. Filosofía italiana pura.",
    "Catenaccio de barrio, marca personal al que pase.",
    "El que quiera un gol, que lo pida por favor.",
    "Muralla china, versión fútbol 5.",
  ],
  comodin: [
    "Todos hacen de todo… o nadie hace nada.",
    "Equipo camaleón: cambian de puesto cada cinco minutos.",
    "Formación líquida: se acomoda sola sobre la marcha.",
    "Multiuso FC: hoy defiendo, mañana la clavo al ángulo.",
    "Táctica oficial: 'que cada uno vea'.",
    "El DT rival no sabe a quién marcar. Nosotros tampoco.",
  ],
  equilibrado: [
    "Equipo de manual: parados como Dios manda.",
    "Bien plantados, esto puede ser lindo de ver.",
    "Equilibrio perfecto, peligro real.",
    "Nada que envidiarle a la Scaloneta.",
    "Cada uno en su puesto. A jugar tranquilos.",
    "Formación seria: acá se vino a ganar.",
  ],
};

function categoria(arr: J[]) {
  const n = (rol: string) => arr.filter((a) => a.rol === rol).length;
  const gk = n("Arquero"),
    df = n("Defensa"),
    at = n("Ataque"),
    cm = n("Donde sea");
  if (gk === 0) return "sinArquero";
  if (gk >= 2) return "dobleArquero";
  if (at > df + 1) return "ofensivo";
  if (df > at + 1) return "defensivo";
  if (cm >= Math.max(df, at) && cm >= 2) return "comodin";
  return "equilibrado";
}

function fraseDe(arr: J[]) {
  const pool = FRASES[categoria(arr)];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Balanceador: reparte arqueros uno a cada equipo y el resto parejo en
// cantidad y nivel. Cada armado baraja distinto.
function armar(players: J[]): Equipos {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const arqueros = shuffled.filter((p) => p.rol === "Arquero");
  const resto = shuffled.filter((p) => p.rol !== "Arquero");
  const A: J[] = [];
  const B: J[] = [];
  const suma = (t: J[]) => t.reduce((s, p) => s + p.nivel, 0);
  arqueros.forEach((p, i) => (i % 2 === 0 ? A : B).push(p));
  for (const p of resto) {
    if (A.length < B.length) A.push(p);
    else if (B.length < A.length) B.push(p);
    else (suma(A) <= suma(B) ? A : B).push(p);
  }
  return { A, B };
}

// Mini radar del perfil del equipo (Arco / Ataque / Comodín / Defensa).
function Radar({ arr }: { arr: J[] }) {
  const ejes = [
    { ico: "🧤", v: arr.filter((a) => a.rol === "Arquero").length },
    { ico: "⚽", v: arr.filter((a) => a.rol === "Ataque").length },
    { ico: "🔄", v: arr.filter((a) => a.rol === "Donde sea").length },
    { ico: "🛡️", v: arr.filter((a) => a.rol === "Defensa").length },
  ];
  const max = Math.max(2, ...ejes.map((e) => e.v));
  const C = 70,
    R = 42;
  const pt = (i: number, f: number) => {
    const ang = -Math.PI / 2 + i * (Math.PI / 2);
    return [C + R * f * Math.cos(ang), C + R * f * Math.sin(ang)] as const;
  };
  const poli = (f: number) =>
    ejes.map((_, i) => pt(i, f).map((n) => n.toFixed(1)).join(",")).join(" ");
  const datos = ejes
    .map((e, i) => pt(i, e.v / max).map((n) => n.toFixed(1)).join(","))
    .join(" ");
  return (
    <svg
      viewBox="0 0 140 140"
      className="mx-auto mt-2 block w-full max-w-[130px]"
      aria-hidden="true"
    >
      {[1 / 3, 2 / 3, 1].map((f, k) => (
        <polygon key={k} points={poli(f)} fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
      ))}
      {ejes.map((_, i) => {
        const [x, y] = pt(i, 1);
        return (
          <line key={i} x1={C} y1={C} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        );
      })}
      <polygon points={datos} fill="rgba(45,106,79,.3)" stroke="#2d6a4f" strokeWidth="2" strokeLinejoin="round" />
      {ejes.map((e, i) => {
        const [x, y] = pt(i, 1.34);
        return (
          <text key={i} x={x.toFixed(1)} y={(y + 4).toFixed(1)} textAnchor="middle" fontSize="12">
            {e.ico}
          </text>
        );
      })}
    </svg>
  );
}

export function ArmarEquipos({
  jugadores,
  cuando,
  lugar,
}: {
  jugadores: J[];
  cuando: string;
  lugar: string | null;
}) {
  const [equipos, setEquipos] = useState<Equipos>(() => armar(jugadores));
  const [frases, setFrases] = useState<Nombres>(() => ({
    A: fraseDe(equipos.A),
    B: fraseDe(equipos.B),
  }));
  const [nombres, setNombres] = useState<Nombres>({ A: "Primera", B: "Reserva" });
  const [banco, setBanco] = useState<J[]>([]);
  const [editando, setEditando] = useState<null | "A" | "B">(null);
  const [toast, setToast] = useState(false);

  function mezclar() {
    const e = armar(jugadores);
    setEquipos(e);
    setBanco([]);
    setFrases({ A: fraseDe(e.A), B: fraseDe(e.B) });
    setEditando(null);
  }

  // Mandar un jugador al banco (lo saca de su equipo)
  function alBanco(eq: "A" | "B", p: J) {
    const nuevo = equipos[eq].filter((x) => x.id !== p.id);
    setEquipos({ ...equipos, [eq]: nuevo });
    setBanco([...banco, p]);
    setFrases({ ...frases, [eq]: nuevo.length ? fraseDe(nuevo) : "" });
  }

  // Asignar un jugador del banco a un equipo
  function aEquipo(p: J, eq: "A" | "B") {
    const nuevo = [...equipos[eq], p];
    setEquipos({ ...equipos, [eq]: nuevo });
    setBanco(banco.filter((x) => x.id !== p.id));
    setFrases({ ...frases, [eq]: fraseDe(nuevo) });
  }

  function sortearNombres() {
    let par = PARES[Math.floor(Math.random() * PARES.length)];
    while (par[0] === nombres.A) par = PARES[Math.floor(Math.random() * PARES.length)];
    setNombres({ A: par[0], B: par[1] });
    setEditando(null);
  }

  function copiar() {
    const linea = (t: J[]) => t.map((p) => `• ${p.nombre}`).join("\n");
    const txt = `⚽ Equipos para ${cuando}${lugar ? " en " + lugar : ""}\n\n🔵 ${nombres.A}\n${linea(
      equipos.A
    )}\n\n🔴 ${nombres.B}\n${linea(equipos.B)}\n\n¡Nos vemos en la cancha!`;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  function Columna({ eq, dot }: { eq: "A" | "B"; dot: string }) {
    const arr = equipos[eq];
    return (
      <div className="rounded-xl border border-black/10 bg-white p-3">
        <div className="mb-2 flex items-center gap-1">
          <span aria-hidden="true">{dot}</span>
          {editando === eq ? (
            <input
              autoFocus
              defaultValue={nombres[eq]}
              maxLength={20}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) setNombres((n) => ({ ...n, [eq]: v }));
                setEditando(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditando(null);
              }}
              className="min-w-0 flex-1 rounded border border-verde-acento px-1.5 py-0.5 text-sm font-bold outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditando(eq)}
              title="Tocá para cambiar el nombre"
              className="min-w-0 flex-1 truncate text-left text-sm font-bold"
            >
              {nombres[eq]} <span className="opacity-50">({arr.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={sortearNombres}
            title="Nombre al azar"
            className="shrink-0 rounded-md border border-black/10 px-1.5 py-0.5 text-xs hover:bg-black/5"
          >
            ✏️
          </button>
        </div>

        <div className="space-y-1">
          {arr.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 rounded-md bg-black/[0.03] px-2 py-1.5 text-sm">
              <span aria-hidden="true">{ICON[p.rol] ?? "🔄"}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{p.nombre}</span>
              <button
                type="button"
                onClick={() => alBanco(eq, p)}
                title="Mandar al banco"
                className="shrink-0 rounded border border-black/10 bg-white px-1.5 py-0.5 text-xs hover:bg-black/5"
              >
                ↓ Banco
              </button>
            </div>
          ))}
          {arr.length === 0 && (
            <p className="rounded-md border border-dashed border-black/15 py-3 text-center text-xs opacity-50">
              Sin jugadores
            </p>
          )}
        </div>

        <Radar arr={arr} />
        <p className="mt-1.5 text-center text-xs opacity-70">{frases[eq]}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={mezclar}
        className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90"
      >
        ⚖ Armado automático
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Columna eq="A" dot="🔵" />
        <Columna eq="B" dot="🔴" />
      </div>

      {/* Banco: jugadores sin equipo, listos para reasignar */}
      {banco.length > 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-black/25 bg-black/[0.02] p-3">
          <p className="mb-2 text-xs font-semibold uppercase opacity-60">
            🪑 Banco ({banco.length})
          </p>
          <div className="space-y-1.5">
            {banco.map((p) => (
              <div key={p.id} className="rounded-md border border-black/10 bg-white px-2 py-1.5">
                <p className="flex items-center gap-1.5 text-sm">
                  <span aria-hidden="true">{ICON[p.rol] ?? "🔄"}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{p.nombre}</span>
                </p>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => aEquipo(p, "A")}
                    className="truncate rounded border border-black/10 px-1.5 py-1 text-xs hover:bg-black/5"
                  >
                    🔵 {nombres.A}
                  </button>
                  <button
                    type="button"
                    onClick={() => aEquipo(p, "B")}
                    className="truncate rounded border border-black/10 px-1.5 py-1 text-xs hover:bg-black/5"
                  >
                    🔴 {nombres.B}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={copiar}
        className="mt-3 w-full rounded-lg border border-black/15 bg-white py-3 font-medium transition-colors hover:bg-black/5"
      >
        📋 Copiar equipos
      </button>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-5">
          <div className="rounded-xl bg-[#1b1b1b] px-5 py-3 text-center text-sm font-medium text-white shadow-xl">
            ✅ Equipos copiados, pegalos en el grupo
          </div>
        </div>
      )}
    </div>
  );
}
