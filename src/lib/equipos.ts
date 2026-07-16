// Algoritmo de balanceo de equipos (versión inicial, simple).
//
// 1. Mezcla aleatoria (Fisher-Yates) como desempate: con niveles iguales
//    (hoy casi todos arrancan en 5.0), "re-generar" da repartos distintos.
// 2. Arqueros: si hay al menos 2, los 2 de mayor nivel van uno a cada
//    equipo. Con 0 o 1 no hay nada que garantizar: van al reparto general.
// 3. El resto se ordena por nivel (desc) y se reparte con snake draft
//    (1-2-2-1-1-2-2-1...). Arranca eligiendo el equipo que quedó más bajo
//    tras el reparto de arqueros, para compensar la diferencia.

export type JugadorBalanceo = {
  id: string;
  nombre: string;
  posicion: string | null;
  nivel: number;
};

export type ResultadoBalanceo = {
  equipoA: JugadorBalanceo[];
  equipoB: JugadorBalanceo[];
  nivelA: number;
  nivelB: number;
};

function esArquero(j: JugadorBalanceo): boolean {
  return (j.posicion ?? "").trim().toLowerCase() === "arquero";
}

function mezclar<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const sumarNivel = (equipo: JugadorBalanceo[]) =>
  equipo.reduce((suma, j) => suma + j.nivel, 0);

export function generarEquipos(
  jugadores: JugadorBalanceo[],
): ResultadoBalanceo {
  if (jugadores.length < 4) {
    throw new Error("Se necesitan al menos 4 jugadores para armar equipos");
  }

  const pool = mezclar(jugadores);
  const equipoA: JugadorBalanceo[] = [];
  const equipoB: JugadorBalanceo[] = [];

  // Paso 1: arqueros. Solo se pre-asignan si alcanza para uno por equipo.
  const arqueros = pool
    .filter(esArquero)
    .sort((x, y) => y.nivel - x.nivel);
  let resto = pool.filter((j) => !esArquero(j));

  if (arqueros.length >= 2) {
    equipoA.push(arqueros[0]);
    equipoB.push(arqueros[1]);
    resto = resto.concat(arqueros.slice(2)); // arqueros extra al pool general
  } else {
    resto = resto.concat(arqueros);
  }

  // Paso 2: snake draft por nivel, arrancando por el equipo más bajo.
  // (sort es estable, así que el shuffle previo desempata niveles iguales)
  resto.sort((x, y) => y.nivel - x.nivel);

  const [primero, segundo] =
    sumarNivel(equipoA) <= sumarNivel(equipoB)
      ? [equipoA, equipoB]
      : [equipoB, equipoA];

  resto.forEach((jugador, i) => {
    // Patrón 1-2-2-1: posiciones 0 y 3 de cada vuelta de 4 elige "primero"
    const elige = i % 4 === 0 || i % 4 === 3 ? primero : segundo;
    elige.push(jugador);
  });

  return {
    equipoA,
    equipoB,
    nivelA: sumarNivel(equipoA),
    nivelB: sumarNivel(equipoB),
  };
}
