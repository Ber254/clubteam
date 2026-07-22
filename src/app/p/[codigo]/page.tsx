import { redirect } from "next/navigation";

// Alias corto de invitación: /p/[codigo] -> /join/[codigo].
// Existe para que los links viejos ya compartidos (que apuntaban a /p/...)
// no caigan en 404. El flujo real de sumarse al club vive en /join/[codigo].
export default async function InviteShortcut({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  redirect(`/join/${codigo}`);
}
