---
phase: 02-match-analysis-and-resume-optimisation
plan: 02-03
subsystem: ui
tags: [react, typescript, sse, diff, hooks, reducer]

# Dependency graph
requires:
  - phase: 02-01
    provides: diff package installed, AnalysisResult type and RewriteSectionSchema in schemas.ts
provides:
  - InlineDiff component (src/lib/diff.tsx) using diffWords for word-level before/after highlighting
  - useAnalysis hook (src/hooks/use-analysis.ts) with SSE consumer and per-rewrite accept/reject state
  - RewriteState and RewriteSection types exported for downstream plans
affects: [02-05, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useReducer pattern for multi-phase async state (idle/streaming/done/error)"
    - "fetch POST + ReadableStreamDefaultReader + TextDecoder + buffer split on \\n\\n for SSE over POST"
    - "Guard acceptRewrite/rejectRewrite by phase === 'done' before dispatching"

key-files:
  created:
    - src/lib/diff.tsx
    - src/hooks/use-analysis.ts
  modified: []

key-decisions:
  - "diff.tsx uses .tsx extension (JSX content) not .ts — import path @/lib/diff unchanged"
  - "acceptRewrite/rejectRewrite wrapped in useCallback with state.phase dependency for stable refs"
  - "JSON.parse inside try/catch per line — malformed lines silently skipped, not thrown"

patterns-established:
  - "SSE Pattern: fetch POST body reader, buffer incomplete lines with pop(), split on \\n\\n, skip non-data: lines"
  - "Reducer guard pattern: return state unchanged if phase doesn't match expected pre-condition"

# Metrics
duration: 2min
completed: 2026-05-22
---

# Phase 2 Plan 03: Client Data Layer — Diff Utility and SSE Hook Summary

**Word-level InlineDiff component (green/red spans via diffWords) and useAnalysis hook with fetch+ReadableStreamDefaultReader SSE consumer, useReducer state machine, and client-side accept/reject rewrite controls**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-22T07:07:43Z
- **Completed:** 2026-05-22T07:09:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `InlineDiff` component renders word-level diff with green (added), red strikethrough (removed), and neutral (unchanged) spans using the `diff` package's `diffWords`
- `useAnalysis` hook implements full SSE streaming lifecycle: idle → streaming (progress accumulation) → done (result + seeded rewrites) / error
- Per-rewrite accept/reject is entirely client-side with no server round-trip; state lives in reducer, guarded by `phase === 'done'`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InlineDiff component in src/lib/diff.tsx** - `4b6f17e` (feat)
2. **Task 2: Create useAnalysis hook with reducer and SSE consumer** - `2802d77` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/diff.tsx` - InlineDiff component; 'use client'; uses diffWords from diff package; renders added/removed/unchanged spans
- `src/hooks/use-analysis.ts` - useAnalysis hook; 'use client'; useReducer with 4-phase state; fetch POST SSE consumer; exports RewriteState, RewriteSection, AnalysisState, useAnalysis

## Decisions Made

- `diff.tsx` uses `.tsx` extension because JSX is rendered inline — import path `@/lib/diff` is unchanged since Next.js/TypeScript resolve `.tsx` via path alias
- `acceptRewrite`/`rejectRewrite` wrapped in `useCallback` with `state.phase` as dependency so consumers get stable refs while guarding is correct
- Per-line JSON.parse wrapped in try/catch: malformed or partial SSE lines silently skipped rather than thrown

## Deviations from Plan

None — plan executed exactly as written. The plan's SSE consumer code was implemented verbatim with minor additions (network error catch block, try/catch around JSON.parse per-line) that are critical correctness requirements.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `InlineDiff` and `useAnalysis` are ready for Plans 02-05 (RewriteCard component) and 02-06 (AnalysisPanel integration)
- `RewriteState` and `RewriteSection` types exported — downstream components can import without re-deriving
- `ANTHROPIC_API_KEY` must be set in environment before the `/api/analyse` route (Plan 02-02) executes — not a blocker for these client primitives

---
*Phase: 02-match-analysis-and-resume-optimisation*
*Completed: 2026-05-22*
