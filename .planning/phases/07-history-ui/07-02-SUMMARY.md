---
phase: 07-history-ui
plan: 02
subsystem: api
tags: [next.js, route-handler, status, drizzle, dal, idor]

# Dependency graph
requires:
  - phase: 05-database-schema-and-dal
    provides: updateApplicationStatus() DAL function with userId WHERE clause as IDOR guard
  - phase: 04-auth
    provides: verifySession() for session-based auth in route handlers
provides:
  - PATCH /api/applications/[id]/status route handler with 401/400/204 response branches
affects: [07-history-ui, 07-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [Next.js 16 params-as-Promise pattern for dynamic route segments, verifySession try/catch auth guard pattern]

key-files:
  created:
    - src/app/api/applications/[id]/status/route.ts
  modified: []

key-decisions:
  - "No try/catch around DAL call — let 500s propagate; matches project error-handling posture"
  - "No UUID validation — Drizzle silently matches zero rows for bad IDs (same semantics as IDOR case)"
  - "VALID_STATUSES module-level constant for enum whitelist — prevents Postgres pgEnum 500 on invalid values"
  - "Auth guard copied verbatim from analyse/route.ts lines 49-54 — no HOC wrapper (HOC wrappers break streaming)"

patterns-established:
  - "verifySession() try/catch auth guard: let userId; try { const session = await verifySession(); userId = session.userId } catch { return new Response(null, { status: 401 }) }"
  - "Next.js 16 dynamic params: const { id } = await params (params is a Promise)"

requirements-completed: [HIST-02]

# Metrics
duration: 5min
completed: 2026-05-26
---

# Phase 7 Plan 02: Status Route Handler Summary

**PATCH /api/applications/[id]/status route handler with verifySession auth guard, lowercase enum whitelist, and DAL-level IDOR protection via updateApplicationStatus WHERE clause**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-26T05:31:28Z
- **Completed:** 2026-05-26T05:36:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `src/app/api/applications/[id]/status/route.ts` — the persistence backend for the StatusSelect component built in Plan 07-01
- Auth guard returns 401 (empty body) before any params are read when session is absent
- Enum whitelist (`VALID_STATUSES`) rejects any status value not in `['saved', 'applied', 'interviewing', 'offer', 'rejected']` with 400 `{ error: 'Invalid status value' }`
- Malformed JSON returns 400 `{ error: 'Invalid JSON' }` via try/catch around `request.json()`
- Successful PATCH returns 204 No Content; the DAL's `and(eq(applications.id, id), eq(applications.userId, userId))` WHERE clause is the IDOR guard — cross-user requests silently affect zero rows
- TypeScript compiles cleanly with `npx tsc --noEmit`

## Task Commits

1. **Task 1: Implement PATCH /api/applications/[id]/status route** - `590b135` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `src/app/api/applications/[id]/status/route.ts` — PATCH route handler: auth guard, Next.js 16 params unwrap, JSON parse guard, enum validation, DAL call, 204 response

## Response Branches

| Branch | Status | Body | Trigger |
|--------|--------|------|---------|
| Unauthenticated | 401 | (empty) | `verifySession()` throws — no valid session cookie |
| Invalid JSON | 400 | `{"error":"Invalid JSON"}` | `request.json()` throws — malformed request body |
| Invalid status | 400 | `{"error":"Invalid status value"}` | `status` not in VALID_STATUSES (e.g. `"APPLIED"`, `"BANANA"`) |
| Success | 204 | (empty) | All checks pass; DB row updated (or zero-row silent success for IDOR case) |

## Decisions Made
- No try/catch around DAL call — 500s propagate naturally; consistent with project posture
- No UUID validation — Drizzle/Postgres silently matches zero rows on malformed IDs (same outcome as IDOR cross-user case)
- Auth guard copied verbatim from `src/app/api/analyse/route.ts` lines 49-54 for consistency; HOC wrappers break SSE streaming in that route so the pattern was chosen deliberately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Threat Coverage

All T-07-06 through T-07-11 mitigations from the plan's threat register are implemented:
- **T-07-06 (Spoofing):** verifySession() as first action, throws → 401 empty body
- **T-07-07 (IDOR):** userId from session only; DAL WHERE includes userId
- **T-07-08 (Enum injection):** VALID_STATUSES whitelist → 400 before DAL call
- **T-07-09 (Malformed JSON):** try/catch around request.json() → 400
- **T-07-11 (Info disclosure):** responses are static strings or empty — no DB state echoed

## Next Phase Readiness
- PATCH /api/applications/[id]/status is live and ready for StatusSelect to call
- Plan 07-03 (history page / getApplications wiring) can proceed — no blockers

---
*Phase: 07-history-ui*
*Completed: 2026-05-26*

## Self-Check: PASSED

- File exists: `src/app/api/applications/[id]/status/route.ts` — FOUND
- Commit `590b135` exists — FOUND
- All 10 acceptance criteria: PASS (FILE_EXISTS, PATCH_EXPORT, VERIFY_SESSION, UPDATE_STATUS, VALID_STATUSES, PARAMS_PROMISE, AWAIT_PARAMS, 401_BRANCH, 400_BRANCH, 204_BRANCH)
- Five enum values check (grep count ≥ 5): 5 — PASS
- `npx tsc --noEmit` exit 0 — PASS
