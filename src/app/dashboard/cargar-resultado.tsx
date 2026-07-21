import Link from "next/link";

// Etiqueta lateral verde debajo de "Suspender fecha".
// Solo funciona cuando la fecha/horario del partido ya pasó: ahí lleva a la
// pantalla de carga de resultado ("¿Cómo salió?"). Antes, se ve deshabilitada.
export function CargarResultado({
  partidoId,
  yaPaso,
}: {
  partidoId: string;
  yaPaso: boolean;
}) {
  const clases =
    "flex h-14 w-14 items-center justify-center rounded-md p-1 text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-white";

  if (!yaPaso) {
    return (
      <span
        title="Vas a poder cargar el resultado cuando pase el partido"
        className={`${clases} cursor-not-allowed opacity-45`}
        style={{
          background: "linear-gradient(#7f9a86, #5f7a68)",
          border: "1.5px solid #4a5f52",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,.25)",
        }}
      >
        Cargar resultado
      </span>
    );
  }

  return (
    <Link
      href={`/partidos/${partidoId}/resultado`}
      title="Cargar el resultado del partido"
      className={`${clases} transition-transform active:translate-y-[1px]`}
      style={{
        background: "linear-gradient(#2f9e5a, #1f7a44)",
        border: "1.5px solid #145c31",
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,.35), 0 2px 4px rgba(0,0,0,.45)",
      }}
    >
      Cargar resultado
    </Link>
  );
}
