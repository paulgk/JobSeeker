---
phase: 05-database-schema-and-dal
plan: 03
subsystem: database
tags: [better-auth, drizzle-orm, drizzle-adapter, neon, postgres, dal, idor, server-only]

# Dependency graph
requires:
  - phase: 05-01
    provides: "db instance (db/index.ts) and schema (db/schema.ts) created in Plan 01"
  - phase: 04-auth
    provides: "better-auth configured with memoryAdapter, verifySession in dal.ts"
provides:
  - "better-auth persists to Neon via drizzleAdapter (db, { provider: 'pg', schema })"
  - "dal.ts exports getApplications, getApplicationById, saveApplication, updateApplicationStatus, SaveApplicationInput"
  - "Full typed CRUD DAL surface with IDOR protection and metadata-only list query"
affects: [phase-06-save-after-analysis, phase-07-history-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "drizzleAdapter wiring: drizzleAdapter(db, { provider: 'pg', schema }) — schema arg is mandatory at runtime even though optional in types"
    - "IDOR double-filter: and(eq(applications.id, id), eq(applications.userId, userId)) — never filter by id alone"
    - "Metadata-only select: getApplications never selects resumeText/jdText/analysisData/interviewData (D-09)"
    - "cache() on getApplicationById — same pattern as verifySession, deduplicates across RSC renders"
    - "Explicit updatedAt: new Date() on UPDATE — Drizzle default(sql`now()`) only fires on INSERT"

key-files:
  created: []
  modified:
    - src/lib/auth.ts
    - src/lib/dal.ts

key-decisions:
  - "drizzleAdapter schema arg is mandatory — omitting causes runtime TypeError: ...fullSchema (Pitfall 2 / issue #1163)"
  - "getApplicationById wrapped in cache() — called from multiple RSCs in Phase 7, deduplication prevents N round-trips"
  - "getApplications uses partial select — blob columns (resumeText/jdText/analysisData/interviewData) excluded from list query per D-09"
  - "Both ownership-scoped functions use and(id, userId) double-filter — IDOR prevention, security constraint T-05-05"
  - "updateApplicationStatus sets updatedAt: new Date() explicitly — Drizzle does not auto-update timestamp columns on UPDATE"

patterns-established:
  - "IDOR guard: all ownership-scoped DAL queries use and(eq(table.id, id), eq(table.userId, userId))"
  - "Metadata-only list pattern: getApplications partial select never loads blob columns"
  - "cache() deduplication: use on any DAL function called from multiple RSCs in the same render"

requirements-completed: [DATA-02, DATA-03]

# Metrics
duration: 2min
completed: 2026-05-26
---

# Phase 05 Plan 03: DAL and Drizzle Adapter Summary

**better-auth wired to Neon via drizzleAdapter, and dal.ts expanded with four IDOR-guarded, type-safe CRUD functions ready for Phases 6 and 7**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-26T02:15:36Z
- **Completed:** 2026-05-26T02:17:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced memoryAdapter with drizzleAdapter(db, { provider: 'pg', schema }) in auth.ts — better-auth now persists all auth state to Neon Postgres
- Added getApplications (metadata-only list, no blob columns), getApplicationById (full-row, cache-wrapped, IDOR-guarded), saveApplication (insert + returning id), and updateApplicationStatus (IDOR-guarded, explicit updatedAt) to dal.ts
- All four functions are fully typed against the Drizzle schema; project type-checks clean (tsc --noEmit exits 0)
- IDOR double-filter pattern applied exactly twice (getApplicationById and updateApplicationStatus) per T-05-05 threat mitigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Swap memoryAdapter to drizzleAdapter in auth.ts** - `63913b5` (feat)
2. **Task 2: Expand dal.ts with typed CRUD functions and SaveApplicationInput** - `4194fd6` (feat)

## Files Created/Modified
- `src/lib/auth.ts` - Removed memoryAdapter/memoryDB; added drizzleAdapter wired to db+schema
- `src/lib/dal.ts` - Added 5 new exports (4 functions + SaveApplicationInput type) while keeping verifySession unchanged

## Decisions Made
- Schema arg passed explicitly to drizzleAdapter — omitting causes a runtime TypeError at first auth operation (Pitfall 2)
- getApplicationById wrapped in cache() — matches verifySession pattern, needed for Phase 7 RSC deduplication
- getApplications select list excludes all four blob columns — D-09 performance constraint
- updatedAt set to new Date() in updateApplicationStatus — Drizzle does not auto-update; default only fires on INSERT

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. TypeScript passed clean after both tasks.

## Known Stubs

None — all exported functions are fully implemented with real Drizzle queries.

## User Setup Required

None — no external service configuration required for this plan specifically. The live DB migration (Plan 02) must be applied before these DAL functions can execute against a real database.

## Next Phase Readiness

- Phase 6 (Save After Analysis) can call `saveApplication(userId, data)` from SSE route handlers once auth session is verified with `verifySession()`
- Phase 7 (History UI) can call `getApplications(userId)` in RSCs and `getApplicationById(userId, id)` with cache deduplication
- `updateApplicationStatus(userId, id, status)` ready for status-change route handler in Phase 7
- `SaveApplicationInput` type exported for Phase 6 callers to import

---
*Phase: 05-database-schema-and-dal*
*Completed: 2026-05-26*
