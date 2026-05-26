---
phase: 08-history-enhancements
plan: 04
subsystem: ui
tags: [react, hooks, sse, auth, error-handling]

# Dependency graph
requires:
  - phase: 06-save-after-analysis
    provides: save_error SSE event emitted when analysis save fails
  - phase: 04-auth
    provides: /sign-in route for 401 redirects
provides:
  - 401 redirect from /api/analyse to /sign-in on session expiry
  - 401 redirect from /api/interview-questions to /sign-in on session expiry
  - SAVE_ERROR action + state field surfacing save failures in AnalysisPanel Alert
affects: [08-history-enhancements, analysis-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "401 guard before !res.ok: insert status === 401 branch first to redirect rather than show generic error"
    - "Non-fatal SSE event: dispatch to state rather than console.warn so UI can render warning without replacing result"

key-files:
  created: []
  modified:
    - src/hooks/use-analysis.ts
    - src/hooks/use-interview-prep.ts
    - src/components/analysis-panel.tsx

key-decisions:
  - "Use window.location.href (not Next.js router) for 401 redirect — hook runs in 'use client' but has no router instance; hard navigation is simpler and correct"
  - "SAVE_ERROR reducer only transitions from done state — save_error cannot arrive unless a result was already received"
  - "Alert variant=default (not destructive) for save_error — non-fatal, result is intact, warning tone is appropriate"

patterns-established:
  - "401 guard before generic !res.ok in SSE fetch hooks"
  - "Non-fatal SSE events dispatch to state, not console — ensures UI visibility"

requirements-completed: [HIST-WORKFLOW-01, HIST-WORKFLOW-02]

# Metrics
duration: 10min
completed: 2026-05-26
---

# Phase 8 Plan 04: Workflow Bug Fixes Summary

**401 session-expiry redirect and visible save-error Alert added to SSE hooks with zero new dependencies**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-26T00:00:00Z
- **Completed:** 2026-05-26T00:10:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- 401 responses from /api/analyse now redirect to /sign-in instead of showing "Failed to connect"
- 401 responses from /api/interview-questions now redirect to /sign-in
- save_error SSE events from the analyse route now surface as a visible non-fatal Alert in AnalysisPanel; analysis result is still displayed below the alert
- console.warn stub removed — save failures are now user-visible

## Task Commits

1. **Task 1: Add 401 redirect + SAVE_ERROR to use-analysis.ts** — `7ec5f0c` (feat)
2. **Task 2: Add 401 redirect to use-interview-prep.ts** — `005eb7b` (feat)
3. **Task 3: Render save_error Alert in analysis-panel.tsx** — `bcc8a25` (feat)

## Files Created/Modified

- `src/hooks/use-analysis.ts` — added saveError?: string to done state, SAVE_ERROR action + reducer case, 401 redirect branch, replaced console.warn with dispatch
- `src/hooks/use-interview-prep.ts` — added 401 redirect branch before existing !res.ok check
- `src/components/analysis-panel.tsx` — added saveError Alert (variant=default) as first child of done phase JSX

## Decisions Made

- Used `window.location.href` for the 401 redirect rather than Next.js `useRouter` — the hooks are `'use client'` components but have no router instance; hard navigation is correct and simpler
- Alert uses `variant="default"` (not destructive) because the save error is non-fatal — the analysis result is intact and displayed below the alert
- `SAVE_ERROR` reducer returns early if `state.phase !== 'done'` — a save_error event cannot arrive unless the result was already delivered, but the guard is correct for type narrowing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 8 workflow polish (D-12, D-13) complete
- Users now get redirected to /sign-in on session expiry instead of a confusing error
- Save failures are visible without disrupting the analysis result display

---
*Phase: 08-history-enhancements*
*Completed: 2026-05-26*
