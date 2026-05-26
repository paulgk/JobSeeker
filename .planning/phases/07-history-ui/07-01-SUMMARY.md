---
phase: 07-history-ui
plan: 01
subsystem: ui
tags: [next.js, react, drizzle-orm, better-auth, base-ui, shadcn, server-component]

# Dependency graph
requires:
  - phase: 05-database-schema-and-dal
    provides: applications table, ApplicationStatus enum, DAL functions (verifySession, getApplications, updateApplicationStatus)
  - phase: 06-save-after-analysis
    provides: application rows in DB to list
provides:
  - /history Server Component list page (src/app/history/page.tsx)
  - AuthHeader shared client component (src/components/auth-header.tsx)
  - StatusSelect optimistic client component (src/components/status-select.tsx)
  - shadcn Select primitive via base-ui (src/components/ui/select.tsx)
  - getApplications() ordered newest-first (desc createdAt)
affects: [07-02-status-patch-api, 07-04-history-detail-page]

# Tech tracking
tech-stack:
  added: ["@base-ui/react/select (via shadcn nova preset — select.tsx generated)"]
  patterns:
    - "Server Component data fetching: verifySession() + DAL call at top, no try/catch (verifySession redirects internally)"
    - "Optimistic UI with revert: capture prev state before mutating, revert + show inline error on !res.ok"
    - "Inline style for runtime-computed color (oklch) — dynamic Tailwind class would be purged at build"
    - "stopPropagation inside client component to prevent parent Link navigation"
    - "Intl.DateTimeFormat for locale-consistent date rendering"

key-files:
  created:
    - src/app/history/page.tsx
    - src/components/auth-header.tsx
    - src/components/status-select.tsx
    - src/components/ui/select.tsx
  modified:
    - src/lib/dal.ts

key-decisions:
  - "stopPropagation wrapper belongs inside StatusSelect (already a client component) not in the Server Component page"
  - "Score color uses inline style oklch(0.72 0.12 68) — dynamic Tailwind class would be purged at build"
  - "base-ui Select API (value/onValueChange/disabled) is compatible with Radix usage patterns — no adapter needed"

patterns-established:
  - "Auth gate pattern: verifySession() at page top, redirect handled internally, no error boundary needed"
  - "History row: Link wrapping metadata columns, StatusSelect inside stopPropagation div for independent interaction"
  - "Empty state: rounded-2xl ring-1 ring-border bg-card p-10 text-center with locked copy strings"

requirements-completed: [HIST-01, HIST-02]

# Metrics
duration: ~35min
completed: 2026-05-26
---

# Phase 7 Plan 01: History UI — List Page, AuthHeader, StatusSelect Summary

**shadcn Select installed (base-ui nova preset), /history Server Component delivers metadata-only application list newest-first with optimistic StatusSelect, AuthHeader with sign-out, and locked dark-theme empty state**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-26T05:34:00Z
- **Completed:** 2026-05-26T06:09:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed shadcn Select primitive (base-ui, nova preset) — `src/components/ui/select.tsx` with full API compat
- Built `AuthHeader` client component with better-auth `signOut` + router redirect on success
- Built `StatusSelect` optimistic client component: PATCH, revert on failure, stopPropagation guard inside component
- Built `/history` Server Component: verifySession + getApplications, score inline-style color, Badge, date formatting
- Flipped `getApplications()` ORDER BY to `desc(applications.createdAt)` for newest-first

## Task Commits

1. **Task 1: Install shadcn Select, flip getApplications to desc, add AuthHeader + StatusSelect** - `df074d0` (feat)
2. **Task 2: Build /history server-component list page** - `4d7306a` (feat)

## Files Created/Modified
- `src/components/ui/select.tsx` - shadcn Select primitive (base-ui @base-ui/react/select, nova preset)
- `src/components/auth-header.tsx` - Sticky header with JobSeeker wordmark, History nav link, email display, sign-out button
- `src/components/status-select.tsx` - Optimistic status dropdown bound to PATCH /api/applications/[id]/status with revert on error
- `src/app/history/page.tsx` - Server Component: verifySession + getApplications, row list with Badge + StatusSelect + score color + date
- `src/lib/dal.ts` - Added `desc` import, changed `getApplications()` ORDER BY to `desc(applications.createdAt)`

## Decisions Made
- `stopPropagation` placed inside `StatusSelect`'s root `<div>` (already a client component) rather than in the Server Component page — avoids mixing event handler concerns across the server/client boundary
- Inline style `color: 'oklch(0.72 0.12 68)'` used for score ≥ 70 instead of a dynamic Tailwind class — dynamic classes are purged at build and would not render in production
- base-ui `Select` API (`value`, `onValueChange`, `disabled`) is compatible with Radix-style usage; no adapter or shim needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **IDE hint during Task 1**: After adding `desc` to the drizzle-orm import but before updating `orderBy`, the IDE reported `'desc' is declared but its value is never read`. This was expected and resolved immediately by the second edit changing `.orderBy(applications.createdAt)` to `.orderBy(desc(applications.createdAt))`.
- **Acceptance criteria grep**: The check `grep -q '"History"'` (with embedded double-quotes) returned exit 1 because "History" appears as JSX text content, not a quoted JS string. Fixed by using `grep -q "History"` — confirmed copy strings are present.

## Verification Results

- `npx tsc --noEmit` exits 0 — no TypeScript errors
- `npm run lint` — 0 errors; 192 warnings all pre-existing in `.agents/skills` scripts, none in new files
- All Task 1 acceptance criteria: PASS
- All Task 2 acceptance criteria: PASS (verified with explicit grep checks)

## Threat Surface Scan

No new security-relevant surface beyond what the plan's threat model covers. All T-07-0x mitigations are implemented:
- T-07-01: `verifySession()` + `getApplications(userId)` WHERE clause — IDOR guard in DAL
- T-07-02: No JSONB columns selected — confirmed by grep in acceptance criteria
- T-07-03: Optimistic revert on `!res.ok`, `disabled={saving}` prevents concurrent PATCHes
- T-07-04: `signOut()` clears server-side session, `router.push('/sign-in')` on success

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 07-02 (PATCH /api/applications/[id]/status route) — StatusSelect is wired and ready; the route handler is the dependency
- Plan 07-04 (detail page) — AuthHeader and StatusSelect are both reusable without modification

---
*Phase: 07-history-ui*
*Completed: 2026-05-26*
