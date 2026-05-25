---
phase: 01-input-pipeline
plan: "04"
subsystem: api
tags: [zod, sse, rate-limiting, upstash, middleware, prompt-injection, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js 16 scaffold with all Phase 1 dependencies installed

provides:
  - SSE mock endpoint at /api/analyse (POST) with force-dynamic, text/event-stream headers, Zod validation
  - Zod schemas for all Phase 1 + Phase 2 API shapes with inferred TypeScript types
  - wrapUserContent() XML-tag wrapper for prompt injection defense
  - Rate limiter with Upstash Redis (prod) / in-memory Map (dev) auto-selection
  - Next.js middleware applying rate limiting to all /api/* routes at 20 req/min/IP

affects:
  - Phase 2 (LLM analysis) — imports AnalyseRequestSchema, wrapUserContent, SSE endpoint structure
  - 01-02 (Resume panel) — imports ParseResumeTextRequestSchema, ParseResumeResponseSchema
  - 01-03 (JD panel) — imports FetchJdRequestSchema, FetchJdResponseSchema
  - All future /api/* routes — automatically rate-limited by middleware

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SSE streaming via ReadableStream with text/event-stream headers
    - Discriminated union Zod schemas for typed SSE events
    - Dynamic import of Upstash modules for Edge runtime compatibility
    - XML-tag prompt injection defense pattern for all LLM user content

key-files:
  created:
    - src/lib/schemas.ts
    - src/lib/sanitize.ts
    - src/lib/ratelimit.ts
    - src/app/api/analyse/route.ts
    - middleware.ts
  modified: []

key-decisions:
  - "Zod v4 uses .issues not .errors on ZodError — updated all error extraction"
  - "Dynamic import for @upstash/ratelimit and @upstash/redis avoids Edge runtime module errors when env vars absent"
  - "middleware.ts at project root (not src/) for Next.js 16 compatibility"
  - "runtime = nodejs on analyse route for 60s timeout vs Edge's 10s limit"

patterns-established:
  - "SSE endpoint pattern: force-dynamic + runtime nodejs + ReadableStream + text/event-stream headers"
  - "Rate limit middleware: checkRateLimit(ip) with X-RateLimit-Remaining header on all /api/* responses"
  - "Prompt injection defense: wrapUserContent(text, tag) before every LLM user turn"
  - "Zod schema-first API design: schema -> inferred TypeScript type, no separate interface definitions"

# Metrics
duration: 5min
completed: 2026-05-22
---

# Phase 1 Plan 04: Infrastructure Patterns Summary

**SSE mock endpoint, Zod schema library, rate limiting middleware (20 req/min/IP), and XML-tag prompt injection helper — all four patterns Phase 2 consumes directly.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-22T05:13:07Z
- **Completed:** 2026-05-22T05:18:20Z
- **Tasks:** 2 completed
- **Files modified:** 5 created

## Accomplishments

- Mock SSE endpoint at POST /api/analyse streams start, chunk, and done events with correct text/event-stream headers and force-dynamic export. Phase 2 replaces only the ReadableStream body.
- Zod schema library covers all Phase 1 and Phase 2 API shapes (resume parsing, JD fetching, analysis request/response, shared error). TypeScript types are inferred — no separate interface definitions.
- Rate limiting middleware gates every /api/* route at 20 requests/minute per IP. Returns 429 with Retry-After and X-RateLimit-Remaining headers. Works in dev without any Redis credentials using an in-memory Map fallback.
- wrapUserContent() strips injection attempts before wrapping in XML tags, ready for Phase 2 LLM calls.

## Task Commits

1. **Task 1: Zod schemas, sanitize helper, rate limit lib, and SSE mock endpoint** - `ec83627` (feat)
2. **Task 2: Rate limiting middleware applied to all /api/* routes** - `116ab18` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/schemas.ts` — Zod schemas and inferred TS types for all Phase 1+2 API shapes
- `src/lib/sanitize.ts` — wrapUserContent() XML-tag wrapper for prompt injection defense
- `src/lib/ratelimit.ts` — checkRateLimit() with Upstash (prod) / in-memory Map (dev) auto-selection
- `src/app/api/analyse/route.ts` — Mock SSE endpoint; Phase 2 replaces ReadableStream body only
- `middleware.ts` — Next.js middleware applying rate limiting to all /api/* routes

## Decisions Made

- **Zod v4 .issues over .errors:** Zod v4 changed the error collection property from `.errors` to `.issues`. Fixed in route.ts to use `parsed.error.issues[0]?.message`. Tracked as Rule 1 auto-fix.
- **Dynamic import for Upstash:** The `@upstash/ratelimit` and `@upstash/redis` packages are only imported inside `checkUpstash()` when env vars are present. This prevents Edge runtime failures when credentials are absent in dev.
- **nodejs runtime on analyse route:** SSE streams for LLM calls in Phase 2 will need up to 60 seconds. Edge runtime's 10s limit would kill the stream. `runtime = 'nodejs'` set now so Phase 2 doesn't need to discover this.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 uses .issues not .errors on ZodError**

- **Found during:** Task 1 (TypeScript check after creating route.ts)
- **Issue:** `parsed.error.errors[0]` caused `TS2339: Property 'errors' does not exist on type 'ZodError'`. Zod v4 renamed the property to `.issues`.
- **Fix:** Changed `parsed.error.errors[0]?.message` to `parsed.error.issues[0]?.message` in route.ts
- **Files modified:** src/app/api/analyse/route.ts
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** ec83627 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Zod v4 API change)
**Impact on plan:** Single-line fix, no scope change. Essential for 400 responses to work correctly.

## Issues Encountered

None beyond the Zod v4 deviation above.

## Next Phase Readiness

- Phase 2 can import `AnalyseRequestSchema` from `@/lib/schemas` and replace the ReadableStream body in `src/app/api/analyse/route.ts`
- Phase 2 imports `wrapUserContent` from `@/lib/sanitize` before every LLM user turn
- Rate limiting is active — safe to share any /api/* endpoint publicly
- Plans 01-02 and 01-03 can import their schemas immediately

---
*Phase: 01-input-pipeline*
*Completed: 2026-05-22*
