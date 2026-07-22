import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JoinForm } from "./join-form";

type GrupoInvitacion = {
  id: string;
  nombre: string;
  foto_url: string | null;
  cantidad_miembros: number;
  ya_es_miembro: boolean;
};

export default async function JoinPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: al login, conservando el destino para volver acá después.
  if (!user) {
    redirect(`/login?next=/join/${codigo}`);
  }

  // RPC security definer: el usuario todavía no es miembro, RLS no le
  // dejaría leer el grupo directamente.
  const { data: grupo } = await supabase
    .rpc("get_group_by_invite", { p_codigo: codigo })
    .single<GrupoInvitacion>();

  if (!grupo) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Link inválido</h1>
          <p className="text-sm opacity-70">
            Este link de invitación no existe o fue dado de baja. Pedile al
            admin del grupo que te pase uno nuevo.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg border border-black/15 px-5 py-2.5 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
          >
            Ir a mis grupos
          </Link>
        </div>
      </main>
    );
  }

  // Ya es miembro: directo al muro (TV del club).
  if (grupo.ya_es_miembro) {
    redirect("/dashboard");
  }

  // Prellenamos el nombre con el del perfil (viene del trigger de signup).
  const { data: jugador } = await supabase
    .from("jugadores")
    .select("nombre, posicion_preferida, posicion_secundaria")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm opacity-70">Te invitaron a unirte a</p>
          <h1 className="text-3xl font-bold">{grupo.nombre}</h1>
          <p className="text-sm opacity-70">
            {grupo.cantidad_miembros}{" "}
            {grupo.cantidad_miembros === 1 ? "miembro" : "miembros"}
          </p>
        </div>

        <JoinForm
          codigo={codigo}
          nombreInicial={jugador?.nombre ?? ""}
          posicionInicial={jugador?.posicion_preferida ?? ""}
          posicionSecundariaInicial={jugador?.posicion_secundaria ?? ""}
        />
      </div>
    </main>
  );
}
