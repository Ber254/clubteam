import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/auth/next-url";

// Callback de OAuth (Google) y del flujo PKCE con `code`.
// Supabase redirige acá con ?code=... y lo canjeamos por una sesión.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Algo falló: mandamos al login con un flag de error.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
