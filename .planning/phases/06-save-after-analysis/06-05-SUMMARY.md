---
phase: 06-save-after-analysis
plan: 05
subsystem: api/interview-questions
tags: [persistence, sse, dal, non-fatal]
dependency_graph:
  requires: [06-01, 06-02, 06-03, 06-04]
  provides: [SAVE-03]
  affects: [src/app/api/interview-questions/route.ts]
tech_stack:
  added: []
  patterns: [non-fatal nested try/catch, guard-and-call persistence]
key_files:
  created: []
  modified:
    - src/app/api/interview-questions/route.ts
decisions:
  - Nested try/catch around updateInterviewData prevents DB failure from emitting error SSE event
  - applicationId guard (if present) means no DB call when user runs interview prep without a prior save
metrics:
  duration: ~5 minutes
  completed: 2026-05-26
---

# Phase 06 Plan 05: Persist Interview Q+A After SSE Stream Summary

Non-fatal updateInterviewData call wired into the interview-questions SSE route after the result event is emitted — guarded by applicationId presence check.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add updateInterviewData import and inject merge call | 36dd980 | src/app/api/interview-questions/route.ts |
| 2 | Full TypeScript check and end-to-end verification | (same commit) | — |

## Changes Made

**src/app/api/interview-questions/route.ts:**
- Added `updateInterviewData` to the `@/lib/dal` import
- After emitting `result` to the SSE stream, added a guarded nested try/catch:
  - `if (parsed.data.applicationId)` — skip entirely when applicationId is absent
  - `await updateInterviewData(userId, parsed.data.applicationId, result)` — merges the complete Q+A into the DB row
  - Inner catch swallows DB failures silently — the stream always reaches `done`

## Verification

- `grep -c "updateInterviewData" src/app/api/interview-questions/route.ts` → 2 (import + call)
- `grep -c "parsed.data.applicationId" src/app/api/interview-questions/route.ts` → 2 (guard + argument)
- `npx tsc --noEmit` → exit code 0, no errors
- End-to-end chain verification confirmed all six Phase 6 files have their key additions

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — the IDOR guard (WHERE userId + id) is already in `updateInterviewData` in dal.ts, as confirmed by the threat model.

## Self-Check: PASSED

- Commit 36dd980 exists: confirmed
- `src/app/api/interview-questions/route.ts` modified: confirmed
- TypeScript: exit code 0
