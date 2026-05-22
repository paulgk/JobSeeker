---
phase: 02-match-analysis-and-resume-optimisation
plan: "05"
subsystem: ui
tags: [react, typescript, lucide-react, shadcn, diff]

# Dependency graph
requires:
  - phase: 02-03
    provides: InlineDiff component (src/lib/diff.tsx) and RewriteState/RewriteSection types (src/hooks/use-analysis.ts)
provides:
  - RewriteDiff controlled component with per-section accept/reject UI and diff visualisation
affects:
  - 02-06 (AnalysisPanel — renders one RewriteDiff per rewrite entry from useAnalysis state)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Controlled component pattern: RewriteDiff reads status from parent-owned state, never manages accept/reject itself"
    - "Undo accept/reject: non-pending state swaps to the opposite callback for easy reversal"

key-files:
  created:
    - src/components/rewrite-diff.tsx
  modified: []

key-decisions:
  - "Undo via callback swap: accepted state shows 'Undo Accept' calling onReject; rejected shows 'Undo Reject' calling onAccept — no extra props needed"
  - "Status badge coloring: accepted uses green-100/green-800 inline classes; rejected uses outline variant with line-through"

patterns-established:
  - "Controlled diff card: Card wraps CardHeader (name + status badge), CardContent (InlineDiff), CardFooter (action buttons)"

# Metrics
duration: 1min
completed: 2026-05-22
---

# Phase 2 Plan 05: Rewrite Diff with Accept/Reject Summary

**Controlled RewriteDiff card component: section name heading, InlineDiff word-level diff, and per-section Accept/Reject buttons with accepted/rejected status badges**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-22T07:11:49Z
- **Completed:** 2026-05-22T07:12:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- RewriteDiff controlled component renders section name, InlineDiff before/after view, and Accept/Reject controls
- Pending state shows Accept (default variant) and Reject (outline variant) buttons with lucide icons
- Accepted state shows green badge; rejected state shows muted outline badge with line-through
- Non-pending states offer an undo button that swaps callbacks — no additional props needed
- `npx tsc --noEmit` and `npm run lint` both pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RewriteDiff controlled component** - `ac1c99d` (feat)

**Plan metadata:** (forthcoming docs commit)

## Files Created/Modified
- `src/components/rewrite-diff.tsx` - Controlled RewriteDiff component exporting `RewriteDiff`

## Decisions Made
- Undo accept/reject is implemented by swapping callbacks in the non-pending footer (no extra `onUndo` prop). Accepted renders "Undo Accept" calling `onReject`; rejected renders "Undo Reject" calling `onAccept`.
- Status badge for accepted uses inline Tailwind `bg-green-100 text-green-800 border-green-200` rather than a custom variant — minimal and sufficient.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `RewriteDiff` is ready for Plan 02-06 (AnalysisPanel): map `state.rewrites` and render `<RewriteDiff rewrite={rw} onAccept={() => acceptRewrite(i)} onReject={() => rejectRewrite(i)} />` per entry.
- No blockers.

---
*Phase: 02-match-analysis-and-resume-optimisation*
*Completed: 2026-05-22*
