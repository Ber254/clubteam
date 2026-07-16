// Formateo de fechas consistente entre server y cliente.
// Por ahora asumimos es-AR / Buenos Aires (el server de Vercel corre en UTC;
// sin timeZone explícita las horas se mostrarían corridas).
const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function formatFecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}
