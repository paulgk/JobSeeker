---
phase: 04-auth
plan: 01
subsystem: auth
tags: [better-auth, next-js-16, proxy, session, memory-adapter, google-oauth, email-password]

# Dependency graph
requires:
  - phase: 01-input-pipeline
    provides: existing Next.js app structure and rate-limiting middleware

provides:
  - proxy.ts with Next.js 16 proxy export, session-cookie guard for /history, rate-limit logic preserved
  - src/lib/auth.ts with betterAuth() server instance (memory adapter, email/password, Google, nextCookies)
  - src/lib/auth-client.ts with createAuthClient() for browser components
  - src/lib/dal.ts with verifySession() server-only DAL using React cache()
  - src/app/api/auth/[...all]/route.ts catch-all handler via toNextJsHandler(auth)
  - .env.example updated with all five Phase 4 env var names

affects:
  - 04-02 (sign-in UI — imports authClient, signIn, signUp, useSession)
  - 04-03 (auth guards — imports verifySession from dal.ts)
  - 05-database (will swap memoryAdapter for drizzleAdapter in auth.ts)

# Tech tracking
tech-stack:
  added:
    - better-auth 1.6.11 (already in package.json; no install needed)
    - better-auth/adapters/memory (bundled, Phase 4 DB-less operation)
    - better-auth/next-js (toNextJsHandler, nextCookies)
    - better-auth/react (createAuthClient, useSession)
    - better-auth/cookies (getSessionCookie — proxy cookie check)
  patterns:
    - proxy.ts cookie-existence check (no DB call) for optimistic redirects
    - DAL verifySession() with React cache() for deduplicated session validation
    - nextCookies() plugin as last entry in plugins array (fixes Set-Cookie in Server Actions)
    - server-only guard on dal.ts prevents accidental client import

key-files:
  created:
    - proxy.ts
    - src/lib/auth.ts
    - src/lib/auth-client.ts
    - src/lib/dal.ts
    - src/app/api/auth/[...all]/route.ts
  modified:
    - .env.example
    - middleware.ts (deleted — replaced by proxy.ts)

key-decisions:
  - "Renamed middleware.ts to proxy.ts and export to proxy — Next.js 16 breaking change requirement"
  - "Used memory adapter for Phase 4 — persistent Neon/Drizzle adapter deferred to Phase 5 (single line swap)"
  - "getSessionCookie(request) in proxy.ts — cookie existence only, no DB call, avoids per-request DB hit on static prefetches"
  - "nextCookies() placed last in plugins array — required for Set-Cookie to work in Server Actions"
  - "verifySession() wrapped with React cache() — deduplicates auth.api.getSession() across RSC + route handler in same render pass"

patterns-established:
  - "Pattern 1: proxy.ts uses getSessionCookie (optimistic, no DB) — route handlers use verifySession() (authoritative, DB-backed)"
  - "Pattern 2: dal.ts imports server-only as first line — prevents accidental client-side import"
  - "Pattern 3: catch-all auth route is exactly 3 lines — toNextJsHandler(auth) handles all better-auth endpoints"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-06]

# Metrics
duration: 15min
completed: 2026-05-25
---

# Phase 4 Plan 01: Auth Foundation Summary

**better-auth 1.6.11 wired end-to-end with memory adapter: proxy.ts session-cookie guard, DAL verifySession(), Google OAuth + email/password catch-all handler, server-only DAL with React cache deduplication**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-25T00:00:00Z
- **Completed:** 2026-05-25T00:15:00Z
- **Tasks:** 3
- **Files modified:** 6 (5 created, 1 modified, 1 deleted)

## Accomplishments
- Renamed middleware.ts to proxy.ts with `export async function proxy` (Next.js 16 breaking change), preserving all rate-limit logic and adding /history session-cookie guard
- Created complete better-auth server instance (auth.ts) with memory adapter, email/password, Google OAuth, 7-day sessions, and nextCookies() plugin last in array
- Created auth-client.ts for browser components, server-only dal.ts with React cache(), and the 3-line catch-all route handler

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename middleware.ts to proxy.ts** - `f708d3c` (feat)
2. **Task 2: Create auth.ts, auth-client.ts, dal.ts, catch-all route** - `22f83d2` (feat)
3. **Task 3: Update .env.example with Phase 4 env vars** - `e0ec468` (chore)

## Files Created/Modified
- `proxy.ts` - Next.js 16 proxy function with session-cookie guard (/history) and preserved rate-limit logic for /api
- `src/lib/auth.ts` - betterAuth() server config: memory adapter, email+password, Google OAuth, 7-day session, nextCookies() last
- `src/lib/auth-client.ts` - createAuthClient() browser instance with signIn/signOut/signUp/useSession re-exports
- `src/lib/dal.ts` - server-only verifySession() with React cache(), redirects to /sign-in on missing session
- `src/app/api/auth/[...all]/route.ts` - toNextJsHandler(auth) wiring GET and POST
- `.env.example` - appended BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_APP_URL
- `middleware.ts` - deleted (replaced by proxy.ts per Next.js 16 convention)

## Decisions Made
- Used memory adapter for Phase 4 (not skipping auth entirely) — allows full sign-in flow to be tested end-to-end before Phase 5 introduces Neon/Drizzle
- getSessionCookie(request) in proxy.ts instead of auth.api.getSession() — avoids DB call on every static prefetch (per RESEARCH.md Pitfall 2)
- nextCookies() as last plugin in array — required for Set-Cookie header to survive Server Action context (per RESEARCH.md Pitfall 3)
- Matcher changed from '/api/:path*' to '/((?!_next/static|_next/image|favicon.ico).*)' — rate-limit block still only fires when pathname starts with /api

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

External environment variables are required before the app runs. Add to `.env.local`:

```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Google Cloud Console setup: create OAuth 2.0 credentials, add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.

## Next Phase Readiness

- Plan 04-02 (sign-in UI) can import `authClient`, `signIn`, `signUp`, `useSession` from `src/lib/auth-client.ts`
- Plan 04-03 (auth guards on SSE routes) can import `verifySession` from `src/lib/dal.ts`
- Phase 5 (Neon/Drizzle) swap: replace `memoryAdapter(memoryDB)` with `drizzleAdapter(db, { provider: 'pg' })` in auth.ts — one line change

---
*Phase: 04-auth*
*Completed: 2026-05-25*
