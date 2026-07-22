import { redirect } from "next/navigation";

// Alias corto de invitación: /p/[codigo] -> /anotarse/[codigo].
// Existe para que los links viejos ya compartidos (el botón del muro usaba
// /p/{codigo del partido}) no caigan en 404. El flujo de anotarse al partido
// vive en /anotarse/[codigo].
export default async function InviteShortcut({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  redirect(`/anotarse/${codigo}`);
}
