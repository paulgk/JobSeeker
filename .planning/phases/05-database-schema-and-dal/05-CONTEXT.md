# Phase 5: Database Schema and DAL - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers a production-ready Neon Postgres database wired into the codebase via Drizzle ORM. By the end of this phase: the schema is migrated, better-auth is switched from memoryAdapter to the Drizzle/Neon adapter, and dal.ts exposes a complete typed CRUD layer that Phases 6 and 7 consume directly. No UI work, no save triggers, no history pages — those belong to Phases 6 and 7.

</domain>

<decisions>
## Implementation Decisions

### Schema Structure

- **D-01: Single `applications` table, no separate snapshots table.** One row = one saved analysis run. Simpler, matches the "one run = one saved application" data model. No join required to read a full application.

- **D-02: `matchScore` as a dedicated integer column (denormalized from `analysisData` JSONB).** Enables metadata-only list queries (Phase 7 history list) without deserializing JSONB. The full analysis result also lives in `analysisData` JSONB — score column is a fast-path duplicate.

- **D-03: `applications` table columns:**
  - `id` — UUID primary key (default `gen_random_uuid()`)
  - `userId` — string, foreign key → better-auth `user.id`
  - `jobTitle` — text (extracted in Phase 6)
  - `company` — text (extracted in Phase 6)
  - `status` — enum: `Saved | Applied | Interviewing | Offer | Rejected`, default `Saved`
  - `matchScore` — integer (0–100), nullable (null until analysis completes)
  - `resumeText` — text (required for re-run)
  - `jdText` — text (required for re-run)
  - `analysisData` — JSONB nullable (full `AnalysisResult` shape from schemas.ts)
  - `interviewData` — JSONB nullable (full `InterviewPrepResult` shape; null until interview prep runs)
  - `createdAt` — timestamp with timezone, default now()
  - `updatedAt` — timestamp with timezone, default now()

- **D-04: Status type is a Drizzle `pgEnum`.** Values: `saved`, `applied`, `interviewing`, `offer`, `rejected` (lowercase in DB, displayed as title-case in UI). Default: `saved`.

- **D-05: Auth tables are managed by better-auth via `@better-auth/drizzle-adapter`.** Use better-auth's own schema generation (`createAuthSchema` or `generateDrizzleSchema`) — do NOT handwrite user/session/account/verification tables. better-auth owns those; application code owns `applications`.

### better-auth Adapter Swap

- **D-06: Replace `memoryAdapter` with Drizzle adapter in `src/lib/auth.ts`.** The Drizzle adapter from `@better-auth/drizzle-adapter` (already installed at v1.6.11) takes the Drizzle `db` instance. The memory DB object and `memoryAdapter` import are removed entirely.

- **D-07: JWT session mode means session data is stored in a signed cookie, not the DB.** The better-auth `session` table still exists in the schema (better-auth requires it) but stays empty at runtime. No change to session config in auth.ts beyond the adapter swap.

### DAL Function Scope

- **D-08: Phase 5 delivers a complete, typed DAL in `src/lib/dal.ts`.** All functions are implemented (not stubbed) even though callers land in Phase 6/7. Functions:
  - `verifySession()` — existing, unchanged
  - `getApplications(userId: string)` — returns metadata columns only (no resumeText, jdText, analysisData, interviewData blobs)
  - `getApplicationById(userId: string, id: string)` — returns full row
  - `saveApplication(userId: string, data: SaveApplicationInput)` — inserts new row, returns id
  - `updateApplicationStatus(userId: string, id: string, status: ApplicationStatus)` — PATCH status column only

- **D-09: `getApplications` selects only:** `id`, `userId`, `jobTitle`, `company`, `status`, `matchScore`, `createdAt`, `updatedAt`. Never selects `resumeText`, `jdText`, `analysisData`, `interviewData` in the list query.

### File and Folder Conventions

- **D-10: DB files live at `src/lib/db/`:**
  - `src/lib/db/schema.ts` — Drizzle table definitions + exported types
  - `src/lib/db/index.ts` — Neon HTTP client + `export const db = drizzle(client, { schema })`

- **D-11: `dal.ts` stays at `src/lib/dal.ts`.** Existing Phase 4 imports (`import { verifySession } from '@/lib/dal'`) continue to work unchanged.

- **D-12: `drizzle.config.ts` at project root.** Uses `DATABASE_URL_UNPOOLED` for drizzle-kit migrations. App queries use `DATABASE_URL` (pooled).

### Claude's Discretion

All decisions above were made by Claude — user delegated fully. The researcher and planner should treat all D-xx items as locked implementation decisions.

### Reviewed Todos (not folded)

- **UX review polish** — UI/UX concern, out of scope for Phase 5 (database-only phase). Carry to Phase 7.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project State and Architecture
- `.planning/STATE.md` — Key decisions table (better-auth, Neon, Drizzle, JSONB, JWT sessions, DATABASE_URL vs DATABASE_URL_UNPOOLED). Read the "Critical Pitfalls" and "Key Decisions Made" sections.
- `.planning/ROADMAP.md` §Phase 5 — Success criteria (4 items) and phase boundary
- `.planning/REQUIREMENTS.md` §Data Layer — DATA-01, DATA-02, DATA-03 definitions

### Existing Code (must read before writing new code)
- `src/lib/auth.ts` — Current auth.ts using memoryAdapter; Phase 5 modifies this file
- `src/lib/dal.ts` — Current dal.ts with verifySession(); Phase 5 expands this file
- `src/lib/schemas.ts` — `AnalysisResultSchema` and `InterviewPrepResultSchema` Zod types; JSONB column shapes must match these exactly

### Package Documentation
- `node_modules/next/dist/docs/` — Next.js 16 docs (breaking changes from training data)
- `node_modules/@neondatabase/serverless/` — Neon serverless HTTP driver (not @vercel/postgres which is discontinued)

### Environment Variables (critical pitfall)
- `DATABASE_URL` — pooled connection, used by app queries at runtime
- `DATABASE_URL_UNPOOLED` — direct connection, used ONLY by drizzle-kit migrate

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/schemas.ts` — `AnalysisResult` and `InterviewPrepResult` Zod types define the exact shape of `analysisData` and `interviewData` JSONB columns. Import and reference these types in schema.ts for documentation/type inference.
- `src/lib/dal.ts` — Contains `verifySession()` which must remain untouched. Phase 5 adds functions below it.

### Established Patterns
- `import 'server-only'` at top of dal.ts — Phase 5 must keep this import; all DAL functions are server-only.
- `cache()` wrapper on verifySession — deduplicate pattern from React; use for getApplicationById if called from multiple RSCs.
- TypeScript strict mode throughout — all Drizzle schema exports must be fully typed; no `any`.

### Integration Points
- `src/lib/auth.ts` — The Drizzle `db` instance from `src/lib/db/index.ts` is passed to the better-auth Drizzle adapter here. This is the only change to auth.ts in Phase 5.
- `src/lib/dal.ts` — Phase 6 will import `saveApplication` and `updateApplicationStatus`; Phase 7 will import `getApplications` and `getApplicationById`. These imports must resolve correctly after Phase 5.
- `drizzle.config.ts` (new) — drizzle-kit needs this at project root to run `drizzle-kit migrate`.

</code_context>

<specifics>
## Specific Ideas

- Use `pgEnum` for application status so the enum is validated at the DB level, not just TypeScript.
- The `analysisData` JSONB column should accept `AnalysisResult | null` — use Drizzle's `jsonb().$type<AnalysisResult>()` pattern for type safety.
- Same pattern for `interviewData`: `jsonb().$type<InterviewPrepResult>()` nullable.
- Run `drizzle-kit generate` then `drizzle-kit migrate` as the migration workflow (not `push` — we want migration files committed to source control).

</specifics>

<deferred>
## Deferred Ideas

- **UX review polish pass** — noted in pending todos, deferred to Phase 7 when History UI is built.
- **Score trend chart per application (HIST-V2-01)** — v2 requirement; not in scope for v1.1.

</deferred>

---

*Phase: 5-Database Schema and DAL*
*Context gathered: 2026-05-25*
