# Phase 4: Auth Foundation - Research

**Researched:** 2026-05-25
**Domain:** better-auth 1.6.x · Next.js 16 App Router · Google OAuth · email/password
**Confidence:** HIGH

---

## Summary

better-auth 1.6.11 is the current stable release and explicitly supports Next.js 16 (`next: '^14.0.0 || ^15.0.0 || ^16.0.0'` in its peerDependencies — **confirmed via `npm view`**). The previously-reported `--legacy-peer-deps` requirement (GitHub issue #6439) was resolved when 1.6.x updated the peer dep range. Installation is straightforward: `npm install better-auth @better-auth/drizzle-adapter`.

The library provides a catch-all route handler (`toNextJsHandler`), an auth client for React components (`createAuthClient`), and a `nextCookies` plugin that patches Server Action cookie behavior. Email/password is a **built-in feature** (not a plugin) enabled by `emailAndPassword: { enabled: true }`. Google OAuth is a **built-in social provider** via `socialProviders: { google: { ... } }`. Password hashing uses **scrypt** (Node.js native, no external dependency).

The critical Phase 4 constraint is the DB-before-auth sequencing problem: better-auth normally requires a DB adapter. For Phase 4 (before Phase 5 Neon setup), we use `better-auth/adapters/memory` as a temporary adapter — it is bundled in better-auth itself, requires no separate package, and lets the entire auth flow work in-memory. Phase 5 swaps it for the Drizzle/Neon adapter by changing one import.

**Primary recommendation:** Install both packages, configure `src/lib/auth.ts` with the memory adapter and `nextCookies()` plugin, wire the catch-all route, rename `middleware.ts` → `proxy.ts` with cookie-only session check in proxy and DAL-based full check in route handlers.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign in with Google OAuth | `socialProviders: { google: { ... } }` built-in; `/api/auth/callback/google` auto-wired |
| AUTH-02 | User can sign in with email and password (register + login) | `emailAndPassword: { enabled: true }` built-in; scrypt hashing, email uniqueness enforced |
| AUTH-03 | User can sign out | `authClient.signOut()` client call; POST `/api/auth/sign-out` auto-wired |
| AUTH-04 | Unauthenticated users redirected to sign-in before accessing /history | `proxy.ts` cookie-only guard on `/history` matcher; DAL `verifySession()` as backstop |
| AUTH-05 | Analysis (run) requires authentication — anonymous analysis not permitted | `verifySession()` called at top of `/api/analyse`, `/api/interview-questions`, `/api/interview-critique` route handlers (NOT auth HOC — SSE constraint) |
| AUTH-06 | User session persists across browser refresh | JWT cookie with 7-day expiry; `httpOnly` secure cookie survives page refresh |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session cookie issuance | API (better-auth handler) | — | Cookies must be set server-side; better-auth handler at `/api/auth/[...all]` owns this |
| Route protection (optimistic) | Proxy (proxy.ts) | — | Cookie-only check, no DB call; runs before page render |
| Route protection (secure) | API / DAL | — | `verifySession()` in dal.ts; called at top of route handlers and Server Actions |
| Google OAuth callback | API (better-auth handler) | — | Auto-handled by `toNextJsHandler`; callback at `/api/auth/callback/google` |
| Sign-in / Sign-up UI | Browser (Client Component) | — | shadcn/ui form; calls `authClient.signIn.email()` or `authClient.signIn.social()` |
| Session client state | Browser (Client Component) | — | `useSession()` hook from `better-auth/react` |
| Password hashing | API (server-only) | — | scrypt in better-auth server; never exposed to client |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | 1.6.11 | Auth server, session, OAuth | Explicit Next.js 16 support; built-in email+Google; no peer dep conflict |
| `@better-auth/drizzle-adapter` | 1.6.11 | DB adapter for Phase 5 Neon | Phase 5 ready; same version pin as better-auth |

[VERIFIED: npm registry] — both packages confirmed via `npm view` and slopcheck [OK].

### Supporting (bundled — no additional install)

| Import Path | Purpose | When to Use |
|-------------|---------|-------------|
| `better-auth/next-js` | `toNextJsHandler`, `nextCookies` | Route handler and Server Action cookie fix |
| `better-auth/react` | `createAuthClient`, `useSession` | Client Components |
| `better-auth/cookies` | `getSessionCookie` | proxy.ts lightweight cookie check |
| `better-auth/adapters/memory` | `memoryAdapter` | Phase 4 DB-less operation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| memory adapter (Phase 4) | Skip auth entirely until Phase 5 | Worse: users can't test the sign-in flow end-to-end in Phase 4 |
| scrypt (default) | bcrypt via custom hash override | bcrypt needs separate package; scrypt is Node-native and OWASP-recommended |
| `getSessionCookie` in proxy.ts | `auth.api.getSession()` in proxy.ts | Full session validation in proxy runs a DB call on every request — violates the constraint |

**Installation (both packages are now already in package.json as of research):**

```bash
npm install better-auth @better-auth/drizzle-adapter
```

No `--legacy-peer-deps` needed — confirmed peer dep range `next: '^14.0.0 || ^15.0.0 || ^16.0.0'` in better-auth 1.6.11.

---

## Package Legitimacy Audit

> Packages installed during research via `slopcheck install better-auth @better-auth/drizzle-adapter` — both already present in `package.json`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `better-auth` | npm | ~1 yr (Apr 2024) | High (active OSS) | github.com/better-auth/better-auth | [OK] | Approved |
| `@better-auth/drizzle-adapter` | npm | ~4 mo (Jan 2026) | Bundled with better-auth | github.com/better-auth/better-auth | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├─ [Sign-in page] ──POST──► /api/auth/[...all]  ←── better-auth handler
  │    authClient.signIn.email()                         (toNextJsHandler)
  │    authClient.signIn.social('google')                     │
  │                                               sets better-auth.session_token cookie
  │
  ├─ [Any page request]
  │    │
  │    ▼
  │  proxy.ts  (every request)
  │    └─ getSessionCookie(request)  ← cookie-only, no DB
  │         ├─ no cookie + path is /history → redirect /sign-in
  │         └─ cookie present → NextResponse.next()
  │
  ├─ [/history page]  ──► DAL verifySession()  ← reads cookie, validates JWT
  │                            └─ no valid session → redirect /sign-in
  │
  └─ [/api/analyse, /api/interview-questions, /api/interview-critique]
       └─ verifySession() called at top of route handler body (NOT HOC wrapper)
            └─ returns { userId }  or throws/redirects
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── auth.ts          # betterAuth() server instance (NEW)
│   ├── auth-client.ts   # createAuthClient() for browser (NEW)
│   └── dal.ts           # verifySession() — server-only DAL (NEW)
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts   # toNextJsHandler(auth) (NEW)
│   └── sign-in/
│       └── page.tsx            # Custom sign-in UI (NEW)
proxy.ts                        # renamed from middleware.ts (RENAME)
```

---

### Pattern 1: auth.ts Server Configuration (Phase 4 — memory adapter)

[CITED: https://www.better-auth.com/docs/installation, https://www.better-auth.com/docs/integrations/next]

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { nextCookies } from 'better-auth/next-js'

const memoryDB: Record<string, any[]> = {
  user: [],
  session: [],
  account: [],
  verification: [],
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: memoryAdapter(memoryDB),
  emailAndPassword: {
    enabled: true,
    // autoSignIn: true is the default — user is signed in immediately after sign-up
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,        // refresh if older than 1 day
  },
  plugins: [nextCookies()],         // MUST be last plugin; fixes Set-Cookie in Server Actions
})
```

**Phase 5 swap:** Replace `memoryAdapter(memoryDB)` with:
```typescript
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'  // Phase 5 Neon/Drizzle instance
database: drizzleAdapter(db, { provider: 'pg' }),
```

---

### Pattern 2: Catch-All Route Handler

[CITED: https://www.better-auth.com/docs/integrations/next]

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

`toNextJsHandler` returns `{ GET, POST, PATCH, PUT, DELETE }` — only `GET` and `POST` are needed for the standard flow. [VERIFIED: inspected `node_modules/better-auth/dist/integrations/next-js.d.mts`]

---

### Pattern 3: proxy.ts (renamed from middleware.ts)

[CITED: proxy.md from node_modules/next/dist/docs, https://www.better-auth.com/docs/integrations/next]

```typescript
// proxy.ts  (replaces middleware.ts — function name must be `proxy`)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const PROTECTED_PATHS = ['/history']
const AUTH_PATHS = ['/sign-in']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = getSessionCookie(request)
  // Default cookie name: "better-auth.session_token"
  // getSessionCookie only checks existence — does NOT validate the JWT

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  const isAuthPage = AUTH_PATHS.some(p => pathname.startsWith(p))

  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Apply to protected routes and auth pages; skip static assets and API
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

**Critical:** The existing rate-limiting logic from `middleware.ts` MUST be preserved in `proxy.ts`. The rename is:
1. Rename file `middleware.ts` → `proxy.ts`
2. Rename export `middleware` → `proxy`
3. Add the session cookie check for `/history`
4. Keep all rate-limit logic intact (it only runs for `/api` paths anyway)

**Warning from Next.js 16 docs:** proxy.ts should not import `cookies` from `next/headers` (that's for RSC/Server Actions). Use `request.cookies.get(...)` or `getSessionCookie(request)` instead.

---

### Pattern 4: DAL `verifySession()` for Route Handlers

[CITED: https://nextjs.org/docs/app/guides/authentication, node_modules/next/dist/docs/01-app/02-guides/authentication.md]

```typescript
// src/lib/dal.ts
import 'server-only'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export const verifySession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/sign-in')
  }

  return {
    isAuth: true,
    userId: session.user.id,
    user: session.user,
  }
})
```

**Usage in SSE Route Handlers (AUTH-05):**

```typescript
// src/app/api/analyse/route.ts  (example — same pattern for the other two SSE routes)
import { verifySession } from '@/lib/dal'

export async function POST(request: NextRequest) {
  // MUST be called at the top of the handler body — NOT as an HOC wrapper
  // HOC wrappers break ReadableStream SSE responses (Auth.js issue #12485)
  const { userId } = await verifySession()

  // ... rest of SSE handler unchanged
}
```

`verifySession()` uses React `cache()` so multiple calls within the same server render pass (RSC + route handler) deduplicate the DB lookup.

---

### Pattern 5: Auth Client (Browser)

[CITED: https://www.better-auth.com/docs/integrations/next]

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
})

// Re-export commonly used methods for convenience
export const { signIn, signOut, signUp, useSession } = authClient
```

**Client usage examples:**

```typescript
// Sign in with email
await authClient.signIn.email({ email, password })

// Sign in with Google
await authClient.signIn.social({ provider: 'google' })

// Sign up with email
await authClient.signUp.email({ name, email, password })

// Sign out
await authClient.signOut()

// Session hook (Client Components)
const { data: session, isPending } = useSession()
```

---

### Pattern 6: Server Component Session Access

[CITED: https://www.better-auth.com/docs/integrations/next]

```typescript
// In a Server Component or Server Action
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({
  headers: await headers(),
})
// session?.user.id, session?.user.email, session?.user.name
```

---

### Anti-Patterns to Avoid

- **Auth HOC wrapping SSE route handlers:** `export const POST = withAuth(handler)` — breaks `ReadableStream`. Use `verifySession()` at the top of the handler body instead.
- **DB calls in proxy.ts:** `auth.api.getSession({ headers: await headers() })` in proxy.ts hits the DB on every request including static prefetches. Use `getSessionCookie(request)` (cookie existence only) in proxy.ts.
- **`cookies()` from `next/headers` in proxy.ts:** This is a Server Component API. In proxy.ts use `request.cookies.get('better-auth.session_token')` directly, or `getSessionCookie(request)`.
- **Trusting proxy.ts as the sole auth gate:** The Next.js 16 docs explicitly warn that Server Functions are not separate routes — a page's proxy match doesn't cover Server Actions on that page. Always call `verifySession()` in Server Actions too.
- **Forgetting `nextCookies()` plugin:** Without it, `Set-Cookie` from `auth.api.signInEmail()` in a Server Action is silently dropped by Next.js. The plugin patches this.
- **Wrong import path for drizzle adapter:** The adapter is at `better-auth/adapters/drizzle` (bundled in `better-auth`). There is also a separate `@better-auth/drizzle-adapter` package (the main package re-exports from it). Either path works, but `better-auth/adapters/drizzle` avoids the separate install in Phase 5.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt calls | scrypt via better-auth built-in | scrypt is native to Node.js, OWASP-recommended, zero extra deps |
| JWT session cookies | Manual `jose` encrypt/decrypt | better-auth session management | Handles rotation, expiry, secure cookie attributes automatically |
| OAuth callback handling | Custom `/api/auth/callback` routes | `toNextJsHandler(auth)` catch-all | OAuth state verification, PKCE, token exchange — all handled |
| Email uniqueness check | Custom DB query before sign-up | better-auth built-in | Returns 200 regardless (enumeration protection) when `requireEmailVerification` enabled |
| Session cookie attributes | Manual `httpOnly`, `secure`, `sameSite` | better-auth sets these automatically | Correct attributes set per environment (prod vs dev) |

---

## Environment Variables

Required for Phase 4:

```bash
# .env.local additions

# Required — must be 32+ chars, high entropy
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>

# Required — base URL for OAuth callbacks
BETTER_AUTH_URL=http://localhost:3000

# Required for Google OAuth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Required for client-side baseURL (public)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**`BETTER_AUTH_URL` vs `NEXT_PUBLIC_APP_URL`:** `BETTER_AUTH_URL` is server-side only (auth.ts). `NEXT_PUBLIC_APP_URL` is exposed to the browser for the auth client's `baseURL`.

---

## Google Cloud Console Setup

[CITED: https://www.better-auth.com/docs/authentication/google]

1. Google Cloud Console > APIs & Services > Credentials > Create OAuth 2.0 Client ID
2. Application type: **Web application**
3. Authorized redirect URIs — add BOTH:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-vercel-domain.vercel.app/api/auth/callback/google` (production)
4. Copy Client ID → `GOOGLE_CLIENT_ID`, Client Secret → `GOOGLE_CLIENT_SECRET`

The callback path `{BETTER_AUTH_URL}/api/auth/callback/google` is auto-wired by better-auth — do not create a custom route for it.

---

## Session Cookie Details

[VERIFIED: inspected `node_modules/better-auth/dist/cookies/index.mjs`]

| Property | Value |
|----------|-------|
| Default cookie name | `better-auth.session_token` |
| Production prefix | `__Secure-better-auth.session_token` (Secure prefix added) |
| `httpOnly` | true |
| `secure` | true in production |
| `sameSite` | `lax` |
| Default expiry | 7 days |
| `getSessionCookie` import | `import { getSessionCookie } from 'better-auth/cookies'` |

`getSessionCookie(request)` returns the token string or `null` — it does **not** validate the JWT. It's safe to use in proxy.ts for the optimistic redirect but must never be the sole security gate.

---

## Email/Password Details

[CITED: https://www.better-auth.com/docs/authentication/email-password]

- **Built-in** — no plugin import needed; set `emailAndPassword: { enabled: true }` in `betterAuth()`
- **Password hashing:** scrypt (Node.js native) — no bcrypt package needed
- **Min/max length:** 8–128 characters (default)
- **Email uniqueness:** enforced at the DB layer; with `requireEmailVerification` enabled, sign-up returns 200 even if email exists (enumeration protection)
- **No UI provided:** better-auth does not ship a sign-in page; we build it with shadcn/ui
- **Registration fields:** `name`, `email`, `password` (all required for `signUp.email()`)

---

## Routes better-auth Auto-Wires

All routes are handled by the `[...all]` catch-all. These paths exist under `/api/auth/`:

| Path | Method | Purpose |
|------|--------|---------|
| `/api/auth/sign-in/email` | POST | Email/password sign-in |
| `/api/auth/sign-up/email` | POST | Registration |
| `/api/auth/sign-out` | POST | Sign-out |
| `/api/auth/get-session` | GET | Session fetch |
| `/api/auth/sign-in/social` | POST | Initiate OAuth |
| `/api/auth/callback/google` | GET | OAuth callback |

**Custom pages we must build:**
- `src/app/sign-in/page.tsx` — sign-in form with email/password fields AND Google button (shadcn/ui; styled via impeccable skill in a later step)
- No sign-up page needed if we fold registration into the sign-in page with tabs, OR a separate `src/app/sign-up/page.tsx`

---

## DB-Before-Auth Sequencing (Phase 4 vs Phase 5)

The Drizzle adapter requires an initialized DB connection. Phase 5 sets up Neon/Drizzle. The Phase 4 solution:

```typescript
// Phase 4: memory adapter (resets on server restart — acceptable for dev)
import { memoryAdapter } from 'better-auth/adapters/memory'
const memoryDB: Record<string, any[]> = { user: [], session: [], account: [], verification: [] }
database: memoryAdapter(memoryDB),
```

**Implication:** Users created in Phase 4 are lost on server restart. This is expected and acceptable — Phase 5 migrates to persistent storage. The auth flow (sign-in, sign-out, route protection, SSE auth guard) is fully testable with the memory adapter.

**The memory adapter is bundled in better-auth** at `better-auth/adapters/memory` — confirmed via `node_modules/better-auth/package.json` exports. No additional package needed.

---

## Common Pitfalls

### Pitfall 1: Auth HOC Wrapping SSE Routes
**What goes wrong:** `export const POST = withAuth(myHandler)` or similar wrapper breaks `ReadableStream`. The wrapper tries to `await` the response, which consumes the stream before SSE data is sent.
**Why it happens:** HOC pattern works for JSON responses but not for streaming. This is Auth.js issue #12485 (also applies to better-auth HOC patterns).
**How to avoid:** Call `verifySession()` at the very top of the route handler body. Return `Response(null, { status: 401 })` if session is missing.
**Warning signs:** SSE connection opens but no events are received; client-side EventSource immediately closes.

### Pitfall 2: proxy.ts DB Call Performance
**What goes wrong:** Using `auth.api.getSession({ headers: await headers() })` in proxy.ts causes a DB query on every request including static asset prefetches (`_next/data`, image requests).
**Why it happens:** proxy.ts runs before the filesystem; Next.js 16 docs explicitly warn against DB calls in Proxy.
**How to avoid:** Use `getSessionCookie(request)` in proxy.ts (cookie existence check only). Put the full `auth.api.getSession()` call in the DAL for route handlers and pages.

### Pitfall 3: Missing `nextCookies()` Plugin
**What goes wrong:** Calling `auth.api.signInEmail(...)` in a Server Action appears to succeed but the session cookie is never set — user is not signed in.
**Why it happens:** Next.js App Router requires cookies to be set via the `cookies()` API in Server Actions; the standard `Set-Cookie` header approach is stripped. The `nextCookies()` plugin intercepts the response and calls `cookies().set(...)` instead.
**How to avoid:** Add `plugins: [nextCookies()]` to `betterAuth()` config. Must be the last plugin in the array.
**Warning signs:** `signInEmail()` returns success but `getSession()` returns null immediately after.

### Pitfall 4: Wrong Function Name in proxy.ts
**What goes wrong:** Next.js 16 throws a build error or silently ignores the proxy if the function is named `middleware` instead of `proxy`.
**Why it happens:** Next.js 16 breaking change — the file convention is renamed from `middleware.ts` to `proxy.ts` AND the exported function must be `proxy` (or a default export).
**How to avoid:** Rename both the file (`proxy.ts`) and the function export (`export function proxy(...)`). Run `npx @next/codemod@canary middleware-to-proxy .` to automate.
**Warning signs:** Route protection doesn't work; no redirect happens for unauthenticated `/history` access.

### Pitfall 5: BETTER_AUTH_URL Mismatch on Vercel
**What goes wrong:** Google OAuth redirects to `localhost:3000/api/auth/callback/google` in production, causing `redirect_uri_mismatch` error from Google.
**Why it happens:** `BETTER_AUTH_URL` defaults to `localhost:3000` if not set in production env.
**How to avoid:** Set `BETTER_AUTH_URL` as a Vercel environment variable pointing to the actual production domain. Also register the production callback URI in Google Cloud Console.

### Pitfall 6: Memory Adapter Data Loss
**What goes wrong:** In Phase 4, restarting the dev server wipes all test users — sign-in with previously created credentials fails.
**Why it happens:** The memory adapter stores data in a JavaScript `Map`/array that lives in process memory.
**How to avoid:** Expect this behavior and re-register test users after each server restart. This is resolved in Phase 5 when Drizzle/Neon is introduced.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `auth.api.getSession()` in proxy.ts makes a DB call and is therefore prohibited by the constraint | Pattern 3 / Pitfall 2 | If it uses cookie cache only, `getSessionCookie` is still safer and simpler |
| A2 | The memory adapter's `MemoryDB` initial shape needs the four keys `{ user, session, account, verification }` | Pattern 1 | If wrong keys are needed, better-auth may throw at runtime; verify against memory adapter source |
| A3 | Sign-in page route should be `/sign-in` | Pattern 3 / Routes section | If existing app convention differs, adjust proxy.ts matcher and redirect targets |

---

## Open Questions

1. **Sign-in page route: `/sign-in` vs `/login`**
   - What we know: The existing app has no auth pages
   - What's unclear: User preference for the route name
   - Recommendation: Default to `/sign-in` (matches better-auth's implicit convention in docs examples)

2. **Separate sign-up page or tabbed sign-in page?**
   - What we know: better-auth supports both flows via distinct API calls
   - What's unclear: UX preference
   - Recommendation: Single `/sign-in` page with tabs (Sign In / Create Account) — fewer pages to protect in proxy.ts

3. **`requireEmailVerification` in Phase 4?**
   - What we know: Email verification requires an email transport (SMTP/Resend) not in scope for Phase 4
   - What's unclear: Whether the planner wants to defer email verification to a later phase
   - Recommendation: Set `requireEmailVerification: false` (default) in Phase 4; wire email transport in a future phase

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | better-auth scrypt | ✓ | v20+ (inferred from @types/node ^20 in package.json) | — |
| `better-auth` | All auth | ✓ | 1.6.11 | — |
| `@better-auth/drizzle-adapter` | Phase 5 swap | ✓ | 1.6.11 | — |
| Google Cloud project | AUTH-01 | Unknown | — | Auth-02 (email) works without it |
| Neon DB | AUTH-02 persistence | Not yet (Phase 5) | — | memory adapter for Phase 4 |

**Missing dependencies with fallback:**
- Neon DB: memory adapter bridges Phase 4; Phase 5 wires persistent storage
- Google Cloud: Google OAuth (AUTH-01) blocked without credentials; email/password (AUTH-02) works independently

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test framework found in project |
| Config file | none — Wave 0 gap |
| Quick run command | TBD (Wave 0 installs framework) |
| Full suite command | TBD |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| AUTH-01 | Google OAuth redirects correctly | manual | OAuth flows require browser + real credentials |
| AUTH-02 | Email sign-up creates session | integration | Needs server + memory adapter running |
| AUTH-03 | Sign-out clears cookie | integration | Check `Set-Cookie: better-auth.session_token=; Max-Age=0` |
| AUTH-04 | `/history` redirects unauthenticated | smoke | `curl /history` without cookie → 307 to `/sign-in` |
| AUTH-05 | `/api/analyse` returns 401 without session | smoke | `curl -X POST /api/analyse` without cookie → 401 |
| AUTH-06 | Session persists across reload | manual | Sign in, hard refresh, verify session still active |

### Wave 0 Gaps

- [ ] No test framework configured — research recommends Vitest for unit tests or Playwright for e2e
- [ ] AUTH-04 and AUTH-05 are testable as smoke tests with `curl` (documented in plan tasks)
- [ ] AUTH-01 and AUTH-06 are manual-only (OAuth + browser session)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | better-auth email/password + OAuth (scrypt hashing) |
| V3 Session Management | yes | better-auth JWT cookie (httpOnly, Secure, SameSite=Lax, 7-day expiry) |
| V4 Access Control | yes | DAL `verifySession()` in every protected route handler |
| V5 Input Validation | yes | Zod schemas already in project (`src/lib/schemas.ts`) |
| V6 Cryptography | yes | better-auth handles (scrypt + JWT signing) — never hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session hijacking | Spoofing | `httpOnly` cookie prevents JS access; `Secure` prevents non-HTTPS transmission |
| CSRF | Tampering | `SameSite=Lax` cookie + better-auth CSRF token on state-changing requests |
| Password brute force | Tampering | Existing rate limiter in proxy.ts applies to `/api/auth` routes |
| OAuth state forgery | Spoofing | better-auth handles OAuth PKCE/state internally |
| Email enumeration | Information Disclosure | better-auth returns consistent responses regardless of email existence |
| JWT secret compromise | Elevation | `BETTER_AUTH_SECRET` must be 32+ chars, stored in env, never in git |

---

## Sources

### Primary (HIGH confidence — verified from installed package)
- `node_modules/better-auth/dist/integrations/next-js.d.mts` — `toNextJsHandler` and `nextCookies` type signatures
- `node_modules/better-auth/dist/cookies/index.mjs` — default cookie name `better-auth.session_token`, `getSessionCookie` implementation
- `node_modules/better-auth/package.json` — peer deps `next: '^14.0.0 || ^15.0.0 || ^16.0.0'`, exports map, version 1.6.11
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — `proxy` function export name, proxy.ts migration guide
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md` — DAL pattern, `verifySession()` with `cache()`, route handler auth pattern
- `npm view better-auth version` → 1.6.11 [VERIFIED: npm registry]
- `npm view @better-auth/drizzle-adapter version` → 1.6.11 [VERIFIED: npm registry]
- `slopcheck install better-auth @better-auth/drizzle-adapter` → [OK] both packages

### Secondary (MEDIUM confidence — verified against installed package)
- [better-auth Next.js integration docs](https://www.better-auth.com/docs/integrations/next) — `toNextJsHandler`, `nextCookies`, `getSession` patterns
- [better-auth email/password docs](https://www.better-auth.com/docs/authentication/email-password) — built-in (not plugin), scrypt, fields
- [better-auth Google OAuth docs](https://www.better-auth.com/docs/authentication/google) — config snippet, callback URL, Cloud Console setup
- [better-auth session management docs](https://www.better-auth.com/docs/concepts/session-management) — cookie cache, expiry defaults
- [better-auth installation docs](https://www.better-auth.com/docs/installation) — env vars, auth.ts structure

### Tertiary (LOW confidence — web search, needs impl-time verification)
- GitHub issue #6439 — `--legacy-peer-deps` no longer required in 1.6.x (overridden by npm view confirmation)
- [better-auth/better-auth GitHub](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/cookies.mdx) — cookie prefix format `better-auth.session_token`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm-verified versions, slopcheck [OK], peer dep confirmed
- Architecture: HIGH — verified against installed package type definitions and Next.js 16 docs
- Pitfalls: HIGH — sourced from official docs and GitHub issues with verified resolutions

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (better-auth releases frequently; re-verify if 1.7.x ships)
