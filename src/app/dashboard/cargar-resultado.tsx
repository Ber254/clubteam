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
  const contenido = (
    <span
      className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide"
      style={{ transform: "rotate(-90deg)" }}
    >
      Cargar resultado
    </span>
  );

  if (!yaPaso) {
    return (
      <span
        title="Vas a poder cargar el resultado cuando pase el partido"
        className="flex h-24 w-8 cursor-not-allowed items-center justify-center rounded-md text-white opacity-45"
        style={{
          background: "linear-gradient(#7f9a86, #5f7a68)",
          border: "1.5px solid #4a5f52",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,.25)",
        }}
      >
        {contenido}
      </span>
    );
  }

  return (
    <Link
      href={`/partidos/${partidoId}/resultado`}
      title="Cargar el resultado del partido"
      className="flex h-24 w-8 items-center justify-center rounded-md text-white transition-transform active:translate-y-[1px]"
      style={{
        background: "linear-gradient(#2f9e5a, #1f7a44)",
        border: "1.5px solid #145c31",
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,.35), 0 2px 4px rgba(0,0,0,.45)",
      }}
    >
      {contenido}
    </Link>
  );
}
