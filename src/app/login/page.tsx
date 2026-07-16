"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClase =
  "w-full rounded-lg border border-black/15 bg-blanco-cancha px-4 py-3 text-base outline-none focus:border-verde-acento dark:border-white/20 dark:focus:border-white/50";

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"entrar" | "registrate">("entrar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const esRegistro = mode === "registrate";

  // Destino post-login (ej: /join/abc123 si venís de un link de invitación).
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  function cambiarModo(nuevo: "entrar" | "registrate") {
    setMode(nuevo);
    setStatus("idle");
    setErrorMsg("");
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Apuntamos a /auth/callback (igual que Google): Supabase verifica el
        // link, redirige acá con ?code= y ahí lo canjeamos por la sesión.
        // Así funciona con la plantilla de email POR DEFECTO, sin SMTP propio.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // Solo al registrarse creamos la cuenta; "Entrar" es solo login.
        shouldCreateUser: esRegistro,
        // El nombre viaja como metadata y el trigger lo usa para el perfil.
        ...(esRegistro ? { data: { full_name: nombre } } : {}),
      },
    });

    if (error) {
      const noExiste = /signups not allowed|not found|no user/i.test(
        error.message,
      );
      setErrorMsg(
        !esRegistro && noExiste
          ? "No encontramos una cuenta con ese mail. Probá registrarte."
          : error.message,
      );
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function handleGoogle() {
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold">ClubTeam</h1>
        <p className="text-sm opacity-70">
          {esRegistro
            ? "Creá tu cuenta para arrancar."
            : "Organizá tus partidos con los pibes."}
        </p>
      </div>

      {status === "sent" ? (
        <div className="rounded-lg border border-verde-acento/30 bg-verde-acento/10 p-4 text-center text-sm">
          Te mandamos un link a <strong>{email}</strong>. Abrilo desde este
          dispositivo para {esRegistro ? "crear tu cuenta" : "entrar"}.
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-3">
          {esRegistro && (
            <input
              type="text"
              required
              maxLength={40}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className={inputClase}
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={inputClase}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-lg bg-verde-acento py-3 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending"
              ? "Enviando…"
              : esRegistro
                ? "Crear cuenta"
                : "Entrar con email"}
          </button>
        </form>
      )}

      {status !== "sent" && (
        <>
          <div className="flex items-center gap-3 text-xs opacity-50">
            <span className="h-px flex-1 bg-current" />o<span className="h-px flex-1 bg-current" />
          </div>

          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 py-3 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
          >
            Continuar con Google
          </button>

          <p className="text-center text-sm opacity-80">
            {esRegistro ? "¿Ya tenés cuenta? " : "¿No tenés cuenta? "}
            <button
              type="button"
              onClick={() => cambiarModo(esRegistro ? "entrar" : "registrate")}
              className="font-medium text-verde-acento hover:underline"
            >
              {esRegistro ? "Entrá" : "Registrate"}
            </button>
          </p>
        </>
      )}

      {status === "error" && (
        <p className="text-center text-sm text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}

function ArcoCancha() {
  // Arco visto desde arriba, como las líneas blancas de una cancha:
  // red, línea de fondo, área chica, área grande, punto y arco del penal.
  return (
    <svg
      viewBox="0 0 320 170"
      className="mx-auto w-full max-w-[16rem]"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="red-arco"
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <path d="M9 0H0V9" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.6" />
        </pattern>
      </defs>
      {/* Red del arco (vista desde arriba) */}
      <rect x="128" y="8" width="64" height="22" fill="url(#red-arco)" />
      {/* Línea de fondo */}
      <path d="M14 30 H306" strokeLinecap="round" />
      {/* Postes */}
      <circle cx="128" cy="30" r="2.5" fill="#FFFFFF" stroke="none" />
      <circle cx="192" cy="30" r="2.5" fill="#FFFFFF" stroke="none" />
      {/* Área chica */}
      <path d="M104 30 V64 H216 V30" strokeLinejoin="round" />
      {/* Área grande */}
      <path d="M54 30 V122 H266 V30" strokeLinejoin="round" />
      {/* Punto de penal */}
      <circle cx="160" cy="94" r="2.5" fill="#FFFFFF" stroke="none" />
      {/* Semicírculo del penal */}
      <path d="M131 122 Q160 146 189 122" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center p-6">
      <div className="mt-2 w-full max-w-sm">
        <ArcoCancha />
      </div>
      <div className="flex w-full flex-1 items-center justify-center">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
