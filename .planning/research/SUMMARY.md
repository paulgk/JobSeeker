# Project Research Summary

**Project:** JobSeeker v1.1 — Persistence & History
**Domain:** Authenticated SaaS layer added to an existing stateless Next.js 16 AI app
**Researched:** 2026-05-25
**Confidence:** HIGH

## Executive Summary

JobSeeker v1.1 adds Google OAuth, Postgres-backed persistence, and application history to a fully-shipped stateless v1.0 tool. The architectural challenge is not greenfield — it is an incremental wrapping of a working SSE-streaming pipeline with auth and storage, without touching the LLM, prompt, or component logic. The recommended approach is: better-auth 1.6.x (not NextAuth.js, which has a blocking peer dep conflict with Next.js 16), Neon serverless Postgres via the @neondatabase/serverless HTTP driver (not the deprecated @vercel/postgres), and Drizzle ORM. JSONB columns for analysis snapshots are the correct storage strategy because the existing Zod types map directly to them with zero migration risk as prompts evolve.

The single highest-risk decision is auth integration with the SSE streaming route handlers. The auth() HOC wrapper pattern is documented to break when the inner handler returns a ReadableStream (Auth.js issue #12485). The safe pattern is a verifySession() function in a Data Access Layer (src/lib/dal.ts) called at the top of each route handler body — identical security, no streaming interference. Every other route handler modification is a three-line addition. The middleware.ts → proxy.ts rename is a hard Next.js 16 requirement and must happen before anything else touches routing.

The build dependency chain is strict and cannot be reordered: Auth must be verified working end-to-end before the DB schema is wired up, DB must be migrated and the DAL operational before save/load routes exist, and save must work before the history UI can render anything real. Re-run capability is architecturally free — the existing route handlers already accept resumeText + jdText as inputs, so re-run is just pre-populating the existing form state from saved DB values and navigating to page.tsx.

## Key Findings

### Recommended Stack

The v1.0 stack (Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Anthropic SDK, Zod v4, Upstash) is unchanged. Three packages are added: better-auth 1.6.x for Google OAuth, @neondatabase/serverless 1.1.x as the Postgres HTTP driver, and drizzle-orm 0.45.x with drizzle-kit for schema and migrations. Installation requires --legacy-peer-deps due to a packaging gap between better-auth and Next.js 16's peer dep declaration — this is cosmetic, not a runtime issue (confirmed via GitHub issue #6439 and multiple working tutorials including a Next.js 16 + better-auth starter repo).

@vercel/postgres is discontinued as of December 2024 — all Vercel Postgres stores were migrated to Neon. The pg/node-postgres pool driver is wrong for serverless because it cannot maintain persistent TCP connections between cold starts, which exhausts Postgres connection limits. The Neon HTTP driver sends queries over HTTP with zero connection state, which is exactly correct for Vercel's serverless function model.

**Core technologies (v1.1 additions):**
- `better-auth` 1.6.x: Google OAuth + session management — Auth.js is in maintenance mode; maintainers direct new projects here
- `@neondatabase/serverless` 1.1.x: Postgres HTTP driver — correct for serverless; @vercel/postgres is discontinued
- `drizzle-orm` 0.45.x: ORM with native Neon integration — lighter than Prisma; better-auth Drizzle adapter is built-in
- `drizzle-kit` 0.45.x: Migration CLI — keep minor version matched to drizzle-orm
- JWT sessions (not DB sessions): single-user tool; no server-side revocation needed; avoids sessions table

### Expected Features

The v1.1 feature set is tightly scoped — all seven items are load-bearing and none can be deferred without breaking the user story of "return to a past analysis weeks later."

**Must have (table stakes for v1.1):**
- Google OAuth sign-in — users will not create username/password for a new tool
- Application history list with company, role, match score, status, and date visible at a glance
- Status tags (Saved / Applied / Interviewing / Offer / Rejected) — returning users ask "where am I in the process?" first
- Full analysis snapshot saved to DB — score, action items, keyword gaps, accepted rewrites, interview Q+A
- Analysis detail view — read-only render of saved snapshot; primary re-engagement surface
- Resume + JD text stored per snapshot — required for re-run capability

**Should have (differentiators, included in v1.1):**
- Re-run from saved application — architecturally free; high value for users who update their resume
- Pre-filled inputs on re-run — load resumeText + jdText from DB into page.tsx form state

**Defer to v2+:**
- Score history chart per application (requires multiple snapshots per application to be useful)
- Notes field per application
- Kanban board view (overkill for <20 applications; list with status badges is sufficient)
- Shared analysis links (requires signed URL or public access control)
- Multiple resume versions per application

### Architecture Approach

The architecture is an additive overlay on the existing stateless app. A new proxy.ts (renamed from middleware.ts — required by Next.js 16) handles coarse-grained route protection for /history. A Data Access Layer at src/lib/dal.ts centralises all DB and auth operations — Route Handlers and RSC pages never import Drizzle directly. Analysis remains stateless during SSE streaming; save is an explicit user action triggered after phase === 'done'. History pages are React Server Components reading from the DAL. Re-run navigates to /?applicationId=[id] where page.tsx (already a client component) pre-populates form state from DB-fetched inputs.

**Major components:**
1. `proxy.ts` — renamed from middleware.ts; JWT cookie check only; redirects /history without a DB call
2. `src/lib/auth.ts` — better-auth config: Google provider, JWT session, userId persisted in token
3. `src/lib/dal.ts` — verifySession(), getApplications(), getApplicationById(), saveSnapshot(), updateStatus() — the only place DB is touched
4. `src/lib/db.ts` — Drizzle client over Neon HTTP; stateless per invocation
5. `src/lib/schema.ts` — three tables: users, applications, snapshots; JSONB for analysis and interview data
6. `/api/save/route.ts` — new; receives completed analysis payload, validates with Zod, writes to DAL
7. `/app/history/page.tsx` — RSC; metadata-only query (no JSONB); list with status badges
8. `/app/history/[id]/page.tsx` — RSC; full snapshot read; read-only result panels + re-run link
9. `SaveButton` component — client component; fires POST /api/save after streaming completes
10. `AuthHeader` component — client component; sign-in/avatar conditional on session

### Critical Pitfalls

1. **auth() HOC on SSE route handlers** — the wrapper is documented to break ReadableStream responses (Auth.js issue #12485). Use verifySession() from dal.ts at the top of the handler body instead. Affects /api/analyse, /api/interview-questions, /api/interview-critique.

2. **@vercel/postgres / next-auth usage** — both are wrong for this project. @vercel/postgres is discontinued. next-auth@4 and next-auth@beta both have blocking peer dep conflicts with Next.js 16. Using either requires --force or accepting broken installs. Use @neondatabase/serverless and better-auth.

3. **DB calls in proxy.ts** — proxy.ts runs on every request including static asset prefetches. A DB call here adds 50–150ms latency to every navigation. Next.js 16 auth guide explicitly warns against this. Keep proxy.ts JWT-only; all real auth checks go through the DAL.

4. **Auto-saving analysis on SSE completion** — auto-save violates explicit user intent. Users testing inputs or exploring the tool will pollute their history. Show a "Save to history" button after phase === 'done'; save is triggered manually.

5. **Duplicating AnalysisPanel on history detail page** — AnalysisPanel is wired to useAnalysis which drives a live SSE stream. Loading saved data through it requires forking the state model. Build separate display-only components for the detail view; re-run is a navigation link.

## Implications for Roadmap

Based on research, the dependency chain is strict. Each phase gates the next — there is no parallelism available.

### Phase 1: Auth Foundation

**Rationale:** Nothing in v1.1 works without a verified user identity. The proxy.ts rename is a hard prerequisite for any routing changes. Better-auth must be wired end-to-end (sign-in flow, session cookie, userId readable in a Route Handler) before DB work begins — because the DAL verifySession() function depends on auth.
**Delivers:** Google sign-in, session cookie, userId available in server context, /history route protected, middleware.ts to proxy.ts rename complete
**Addresses:** AUTH-01 from PROJECT.md active requirements
**Avoids:** proxy.ts DB calls (pitfall 3); next-auth peer dep failures (pitfall 2)
**Research flag:** NEEDS RESEARCH — better-auth v1.6.x API surface (auth.api.getSession() vs. verifySession pattern) and exact proxy.ts export syntax should be verified against installed package at implementation time

### Phase 2: Database Schema and DAL

**Rationale:** Schema must be migrated and the DAL operational before any Route Handler can read or write persistence data. This phase has no user-facing output — it is pure infrastructure, but every subsequent phase depends on it.
**Delivers:** Neon database provisioned, three Drizzle tables migrated (users, applications, snapshots), dal.ts with verifySession() and all CRUD functions, Drizzle client in db.ts
**Uses:** @neondatabase/serverless HTTP driver, drizzle-orm/neon-http, JSONB columns typed against existing Zod schemas from src/lib/schemas.ts
**Implements:** db.ts, schema.ts, dal.ts components; drizzle.config.ts; DATABASE_URL environment variable in Vercel
**Avoids:** @vercel/postgres (deprecated); pg Pool (TCP breaks serverless); normalized tables for analysis data (JSONB maps directly to existing types)
**Research flag:** STANDARD PATTERNS — Drizzle + Neon HTTP is well-documented with official tutorials; no additional research needed

### Phase 3: Save-After-Analysis

**Rationale:** The save route is the bridge between the existing stateless analysis flow and the new DB layer. Route Handler auth guards (verifySession() at the top of each existing handler) must be added here to enforce authentication on the LLM pipeline. The SaveButton component is the only new UI surface in this phase.
**Delivers:** All existing Route Handlers auth-guarded, /api/save Route Handler operational, SaveButton component in analysis UI, applicationId state in page.tsx, "View in history" link post-save
**Avoids:** auth() HOC on streaming routes (pitfall 1); auto-save on SSE completion (pitfall 4)
**Research flag:** STANDARD PATTERNS — three-line auth guard addition per route handler; save route is a standard Zod-validated POST insert

### Phase 4: History UI

**Rationale:** History UI is the user-facing payoff of phases 1–3. The list view queries metadata only (no JSONB deserialization at list time — only jobTitle, companyName, status, createdAt, and score from analysisData). The detail view reads the full snapshot. Re-run is a navigation link to /?applicationId=[id] which triggers RSC pre-population of form state in the existing page.tsx.
**Delivers:** /history list page (RSC, status badges, match score, date), /history/[id] detail page (read-only result panels), /api/applications/[id]/status PATCH endpoint, status selector component, re-run navigation wired end-to-end
**Avoids:** Duplicating AnalysisPanel on detail page (pitfall 5); Kanban board (anti-feature per FEATURES.md)
**Research flag:** STANDARD PATTERNS — RSC data fetching, PATCH status endpoint, and navigation-based re-run are all established Next.js 16 App Router patterns

### Phase Ordering Rationale

- Auth before DB: the DAL's verifySession() calls auth internally; you cannot test the DAL without working auth
- DB before save: /api/save calls dal.saveSnapshot() which calls db.insert(); the DB must be migrated and the client working first
- Save before history UI: the history pages have nothing to render until at least one analysis has been saved
- No phase can be done in parallel because each phase's output is the next phase's input
- The list view intentionally queries only metadata columns (not full JSONB blobs) to keep list performance fast — this is a deliberate architectural constraint
- Re-run capability requires no new API surface — it reuses existing route handlers with pre-populated inputs, which is why it is included in Phase 4 rather than requiring a Phase 5

### Research Flags

Phases needing deeper research during planning:
- **Phase 1:** better-auth v1.6.x exact API surface — auth.api.getSession() vs. auth() direct call vs. better-auth's verifySession equivalent; exact proxy.ts export pattern with better-auth (differs from NextAuth's `export { auth as proxy }`)

Phases with standard patterns (skip research-phase):
- **Phase 2:** Drizzle + Neon HTTP fully documented; JSONB + .$type<T>() is standard Drizzle
- **Phase 3:** Three-line verifySession() guard; /api/save is a standard validated POST insert
- **Phase 4:** RSC data fetching, PATCH route, and client-side navigation are standard Next.js 16 App Router patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | @vercel/postgres deprecation confirmed via official Vercel docs; better-auth 1.6.11 confirmed current on npm; next-auth peer dep conflict confirmed via GitHub issue; Neon HTTP driver confirmed as correct serverless pattern |
| Features | HIGH | v1.1 feature set validated against live competitor products (Teal, Huntr, Careerflow) researched May 2026; all 7 features confirmed load-bearing |
| Architecture | HIGH | Build order derived from hard functional dependencies; DAL pattern from Next.js 16 official auth guide; auth() HOC SSE issue confirmed via GitHub issue #12485 |
| Pitfalls | HIGH | auth() HOC SSE conflict and proxy.ts DB call warning documented in official sources; deprecated package pitfalls are confirmed facts |

**Overall confidence:** HIGH

### Gaps to Address

- **better-auth exact API surface at v1.6.x:** auth.api.getSession() is the documented Route Handler pattern, but whether better-auth exposes a verifySession() convenience or requires manual wrapping in dal.ts should be verified against the installed package's TypeScript types at Phase 1. ARCHITECTURE.md shows a NextAuth-flavored pattern that needs reconciling with better-auth's actual API.

- **proxy.ts export syntax with better-auth:** ARCHITECTURE.md was written referencing NextAuth's `export { auth as proxy }` pattern. Better-auth uses `toNextJsHandler(auth)` for Route Handlers — the proxy export may differ. Verify at install time against better-auth's Next.js integration docs.

- **JSONB score extraction for list view:** The history list needs to display the match score without deserializing the full JSONB blob. Either extract score into a dedicated indexed column during schema design (Phase 2) or use a Drizzle raw JSONB expression. Decision depends on how overallScore is nested in the existing AnalysisResult Zod schema.

- **Snapshot save timing with partial interview data:** The save payload schema needs to handle the case where interview Q+A is absent (user saved before running interview prep). interviewData is a nullable JSONB column — the SaveButton UX must account for partial saves without blocking the user.

## Sources

### Primary (HIGH confidence)
- Vercel Postgres deprecation notice: https://vercel.com/docs/storage/vercel-postgres (confirmed discontinued Dec 2024)
- Neon on Vercel Marketplace: https://vercel.com/marketplace/neon
- @neondatabase/serverless npm: https://www.npmjs.com/package/@neondatabase/serverless (v1.1.0)
- drizzle-orm npm: https://www.npmjs.com/package/drizzle-orm (v0.45.2)
- better-auth npm: https://www.npmjs.com/package/better-auth (v1.6.11)
- Auth.js joins Better Auth announcement: https://better-auth.com/blog/authjs-joins-better-auth
- better-auth Next.js 16 peer dep issue: https://github.com/better-auth/better-auth/issues/6439
- next-auth Next.js 16 peer dep issue: https://github.com/nextauthjs/next-auth/issues/13302
- Auth.js route handler wrapper issue: https://github.com/nextauthjs/next-auth/issues/12485
- Next.js 16 authentication guide (in repo): node_modules/next/dist/docs/01-app/02-guides/authentication.md
- Next.js 16 proxy.ts reference (in repo): node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
- Drizzle ORM — Neon integration: https://orm.drizzle.team/docs/connect-neon

### Secondary (MEDIUM confidence)
- better-auth Next.js integration docs: https://better-auth.com/docs/integrations/next
- better-auth Drizzle adapter: https://better-auth.com/docs/adapters/drizzle
- Next.js 16 starter with better-auth + Drizzle: https://github.com/jabirdev/nextjs-better-auth
- Full stack auth 2026 tutorial: https://dev.to/iampandit/full-stack-authentication-in-2026-with-better-auth-drizzle-neon-shadcn-ui-and-nextjs-32nb
- History list UX: Teal (tealhq.com), Huntr (huntr.co), Careerflow (careerflow.ai) — verified live May 2026
- @neondatabase/serverless vs postgres.js: https://www.pkgpulse.com/guides/pg-vs-postgres-js-vs-neon-serverless-postgresql-drivers-2026

### Tertiary (LOW confidence)
- drizzle-kit exact version: npm search (published March 2026; keep matched to drizzle-orm minor — verify at install)
- better-auth CLI generate command: npx @better-auth/cli generate — verify exact invocation at install time

---
*Research completed: 2026-05-25*
*Ready for roadmap: yes*
