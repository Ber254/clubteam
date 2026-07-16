# ClubTeam ⚽

Webapp para organizar equipos de fútbol amateur entre grupos de amigos:
partidos recurrentes, equipos balanceados e historial de estadísticas.

Stack: **Next.js 16** (App Router) · **Supabase** (Postgres + Auth + RLS) ·
**Tailwind CSS** · deploy en **Vercel**.

---

## 1. Requisitos

- Node.js 20+ (probado con 24)
- Una cuenta en [Supabase](https://supabase.com) (plan gratuito alcanza)

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar Supabase

### 3.1. Crear el proyecto y cargar el schema

1. Creá un proyecto nuevo en Supabase.
2. Andá a **SQL Editor** y ejecutá, en orden, el contenido de:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_invitaciones.sql`
   - `supabase/migrations/0004_partidos_equipos.sql`
   - `supabase/migrations/0005_resultados.sql`
   - `supabase/migrations/0006_partido_first.sql`

   (O si usás el [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase db push`.)

### 3.2. Variables de entorno

En **Project Settings → API** copiá la _URL_ y la _anon public key_, y creá un
archivo `.env.local` en la raíz (podés partir de `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

> La `anon key` es pública y segura para el navegador: los datos están
> protegidos por las políticas RLS.

### 3.3. URLs de redirección

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (en producción, tu dominio de Vercel)
- **Redirect URLs**: agregá
  - `http://localhost:3000/**`
  - la URL de producción con `/**` cuando la tengas

### 3.4. Magic link (login por email)

**No hay que tocar nada.** Funciona con la plantilla de email por defecto de
Supabase: el login pide el link con `emailRedirectTo` apuntando a
`/auth/callback`, Supabase verifica y redirige ahí con `?code=`, y esa ruta
canjea el código por la sesión (misma mecánica que Google OAuth).

> Supabase solo permite **editar** las plantillas de email si conectás un SMTP
> propio (SendGrid, Resend, etc.). Por eso no dependemos de eso.

**Límite a tener en cuenta:** el servicio de email incluido de Supabase tiene
un tope bajo de envíos por hora (sirve para probar, no para producción real).
Cuando el proyecto crezca, conectar un SMTP propio en
**Authentication → Emails → SMTP Settings**.

### 3.5. Google OAuth

1. En **Authentication → Providers → Google**, activalo.
2. Creá un OAuth Client en la
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (tipo _Web application_).
3. En **Authorized redirect URIs** de Google, pegá la URL de callback que te
   muestra Supabase (algo como `https://xxxx.supabase.co/auth/v1/callback`).
4. Pegá el _Client ID_ y _Client Secret_ en Supabase y guardá.

## 4. Correr en local

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Sin sesión te manda a
`/login`; al entrar caés en `/dashboard`.

## 5. Estructura relevante

```
supabase/migrations/   Schema SQL + políticas RLS + RPCs (invitación, partidos)
src/lib/equipos.ts     Algoritmo de balanceo (snake draft + arqueros)
src/lib/supabase/      Clientes de Supabase (browser, server, proxy)
src/proxy.ts           Refresco de sesión por request (ex-"middleware")
src/app/login/         Login: magic link + Google (con soporte de ?next=)
src/app/auth/          Callbacks de auth (callback, confirm, signout)
src/app/dashboard/     Home del usuario: sus grupos + crear grupo
src/app/grupos/        Grupo: miembros, partidos, resultados, historial, ranking
src/app/join/          Unirse a un grupo vía link de invitación
```
