// Roles simples, pensados para fútbol 5/7 entre amigos:
// "yo voy al arco", "yo de fondo", "yo arriba", "yo donde pinte".
export const POSICIONES = [
  "Arquero",
  "Defensa",
  "Ataque",
  "Donde sea",
] as const;

export type Posicion = (typeof POSICIONES)[number];

// Ícono por rol. Vive acá (módulo neutral, sin "use client") para que lo
// puedan usar TANTO server components (convocatoria, resumen) COMO client
// components (cards, armar equipos). Si estuviera en un módulo "use client",
// al importarlo desde un server component se recibiría una referencia stub
// y el ícono saldría vacío.
export const ICONOS_ROL: Record<string, string> = {
  Arquero: "🧤",
  Defensa: "🛡️",
  Ataque: "⚽",
  "Donde sea": "🔄",
};

// "Donde sea" se muestra con una frase futbolera distinta en cada iteración
// del flujo. El valor guardado en la DB es siempre el canónico "Donde sea";
// esto es solo la etiqueta visible.
export const FRASES_DONDE_SEA = [
  "Donde sea",
  "Donde pinte",
  "Donde me necesiten",
  "Donde haga falta",
  "Donde toque",
  "Donde caiga",
  "Donde falte uno",
  "Donde me manden",
  "Donde diga el DT",
  "Donde haya lugar",
  "Yo me acomodo",
  "Me da igual, juego",
  "Comodín",
  "Todoterreno",
  "Polifuncional",
  "Multiuso",
  "Utility",
  "Sin puesto fijo",
  "Puesto libre",
  "Tapo agujeros",
  "Juego en todas",
  "De 2 a 11",
  "Del arco pa' adelante",
  "Hasta de arquero",
  "Ponéme donde quieras",
  "A disposición",
  "Que elija el capi",
  "El comodín del mazo",
  "Pieza de recambio",
  "Jugador de rotación",
  "Me pongo la que sea",
  "Al servicio del equipo",
  "Donde sume",
  "Donde me pongas, rindo",
  "Voy a todas",
  "Cualquier puesto",
  "Sin drama, donde sea",
  "Donde quiera el equipo",
  "Titular donde sea",
  "Me adapto",
  "Camaleón",
  "El que tapa huecos",
  "Toco y me acomodo",
  "Puesto: sí",
  "Vengo a jugar nomás",
  "El plan B de todos",
  "Donde el partido pida",
  "Falso 9... y falso todo",
  "Libre, a lo líbero",
  "Donde ataje o meta gol",
] as const;

export function fraseDondeSea(): string {
  return FRASES_DONDE_SEA[Math.floor(Math.random() * FRASES_DONDE_SEA.length)];
}
