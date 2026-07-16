// Sanitiza el parámetro "next" usado tras el login para volver al destino
// original (ej: /join/abc123). Acepta paths relativos o URLs del mismo
// origen; cualquier otra cosa cae al fallback (evita open redirects).
export function sanitizeNext(
  next: string | null | undefined,
  origin: string,
  fallback = "/dashboard",
): string {
  if (!next) return fallback;

  // Path relativo simple ("/join/abc"), pero no protocol-relative ("//evil.com")
  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  // URL absoluta: solo si es del mismo origen (viene de {{ .RedirectTo }}
  // en la plantilla de email de Supabase)
  try {
    const url = new URL(next);
    if (url.origin === origin) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // no era una URL válida
  }

  return fallback;
}
