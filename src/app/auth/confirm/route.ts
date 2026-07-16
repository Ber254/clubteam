import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/auth/next-url";

// Confirmación del magic link por email.
// Requiere que la plantilla de email en Supabase apunte acá con token_hash
// y next={{ .RedirectTo }} (ver instrucciones de setup en el README).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // "next" puede ser un path (/join/abc) o la URL completa que Supabase
  // inyecta vía {{ .RedirectTo }}; sanitizeNext resuelve ambos casos.
  const next = sanitizeNext(searchParams.get("next"), origin);

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
