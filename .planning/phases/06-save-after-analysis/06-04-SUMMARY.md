---
phase: 06-save-after-analysis
plan: "04"
subsystem: client-state
tags: [sse, state-threading, interview-prep, application-id]
dependency_graph:
  requires: [06-01, 06-02, 06-03]
  provides: [applicationId threaded to interview-questions fetch body]
  affects: [use-analysis, analysis-panel, page, interview-prep-panel, use-interview-prep]
tech_stack:
  added: []
  patterns: [optional prop threading, conditional spread in fetch body, useEffect on discriminated union field]
key_files:
  modified:
    - src/hooks/use-analysis.ts
    - src/components/analysis-panel.tsx
    - src/app/page.tsx
    - src/components/interview-prep-panel.tsx
    - src/hooks/use-interview-prep.ts
decisions:
  - useEffect dependency uses ternary expression (state.phase === 'done' ? state.applicationId : undefined) to access discriminated union field safely
  - applicationId uses conditional spread in fetch body so the field is omitted entirely when undefined, matching the server z.string().optional() schema
  - save_error SSE event handled with console.warn only — non-fatal, no UI change for Phase 6
metrics:
  duration: "~12 minutes"
  completed: "2026-05-26T04:56:22Z"
  tasks_completed: 3
  files_modified: 5
---

# Phase 6 Plan 04: Client applicationId Threading Summary

Thread applicationId from the analyse SSE result event through the client component tree to the interview-questions fetch body using five targeted file edits.

## What Was Built

applicationId flows from the `result` SSE event into `useAnalysis` done state, out via `onSaved` callback from `AnalysisPanel`, into `savedApplicationId` state in `page.tsx`, down as a prop to `InterviewPrepPanel`, and finally into the `startPrep` call and POST body for `/api/interview-questions`.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Extend use-analysis.ts — applicationId in AnalysisState, RESULT action, reducer, and SSE reader loop | c5d3ac8 |
| 2 | Extend analysis-panel.tsx — onSaved/onAnalysisStart props, useEffect for callback, Run again reset | 94784fc |
| 3 | Wire page.tsx state lift + update InterviewPrepPanel and use-interview-prep | 6170e8c |

## Key Changes

**use-analysis.ts:**
- `AnalysisState` done phase gains `applicationId?: string`
- `RESULT` action gains `applicationId?: string`
- Reducer RESULT case carries `action.applicationId` into state
- SSE reader loop extracts `event.applicationId` and passes to dispatch
- `save_error` event type handled with `console.warn` (non-fatal)

**analysis-panel.tsx:**
- `onSaved?: (applicationId: string) => void` and `onAnalysisStart?: () => void` added to props interface
- Mount useEffect calls `onAnalysisStart?.()` before `start()`
- New useEffect fires `onSaved?.(state.applicationId)` when done phase has applicationId
- "Run again" button calls `onAnalysisStart?.()` before `start()` to reset stale ID

**page.tsx:**
- `savedApplicationId` state (`string | null`) added
- `onSaved={setSavedApplicationId}` and `onAnalysisStart={() => setSavedApplicationId(null)}` passed to AnalysisPanel
- `applicationId={savedApplicationId ?? undefined}` passed to InterviewPrepPanel

**interview-prep-panel.tsx:**
- `applicationId?: string` added to props interface and destructured
- "Generate interview questions" button passes `applicationId` to `startPrep`

**use-interview-prep.ts:**
- `startPrep` signature gains `applicationId?: string` parameter
- Fetch body uses `{ resumeText, jdText, ...(applicationId ? { applicationId } : {}) }`

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — no new security surface introduced. All changes are additive prop threading. The server enforces userId scoping on any applicationId received (T-06-09, T-06-10 mitigated as specified in the threat model).

## Self-Check: PASSED

All five modified files verified to exist. Three commits recorded: c5d3ac8, 94784fc, 6170e8c. TypeScript check passes with zero errors.
