---
phase: 06-save-after-analysis
plan: 03
subsystem: api
tags: [sse, auto-save, analyse-route, dal]
dependency_graph:
  requires: [06-01, 06-02]
  provides: [auto-save on analysis complete]
  affects: [src/app/api/analyse/route.ts]
tech_stack:
  added: []
  patterns: [nested-try-catch for non-fatal save, SSE applicationId propagation]
key_files:
  modified:
    - src/app/api/analyse/route.ts
decisions:
  - Save logic injected inside ReadableStream.start() nested try/catch — save failure emits save_error then result still fires
  - applicationId is undefined (not null) when save fails — client must handle the optional field
  - save_error fires before result so client UI can show toast alongside result card
metrics:
  duration: "~5 minutes"
  completed: "2026-05-26"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 06 Plan 03: Auto-save inject into analyse route — Summary

Injected save logic into `src/app/api/analyse/route.ts` so each successful analysis is persisted to the DB and the `result` SSE event carries `applicationId`.

## What Was Built

After `callWithRetry()` returns the analysis result inside `ReadableStream.start()`:

1. `extractJobMeta(jdText)` is called to get `{ jobTitle, company }` (never throws — returns "Unknown" fallbacks).
2. `saveApplication(userId, { jobTitle, company, resumeText, jdText, matchScore: result.overallScore, analysisData: result })` inserts the row and returns its UUID.
3. `result` SSE event now includes `applicationId` in its payload.
4. If either save call throws, the nested catch emits `save_error` and the `result` event still fires (with `applicationId: undefined`).

The outer catch (analysis failure path) and `finally` block are unchanged.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add imports and inject save logic | a89b49a | src/app/api/analyse/route.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

Done-criteria grep counts:
- `extractJobMeta`: 2 (import + call)
- `saveApplication`: 2 (import + call)
- `save_error`: 1
- `applicationId`: 4 (declaration, assignment, sseEvent call, plus import line)

TypeScript: `npx tsc --noEmit` — no errors.

## Self-Check: PASSED

- `src/app/api/analyse/route.ts` modified and committed at a89b49a
- No file deletions in commit
- All done-criteria counts pass
- TypeScript clean
