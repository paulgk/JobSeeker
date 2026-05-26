---
phase: 06-save-after-analysis
plan: 01
subsystem: data-layer
tags: [dal, schemas, llm, idor-guard]
dependency_graph:
  requires: []
  provides: [updateInterviewData, extractJobMeta, save_error-event, applicationId-fields]
  affects: [src/lib/dal.ts, src/lib/schemas.ts, src/lib/extract-job-meta.ts]
tech_stack:
  added: []
  patterns: [drizzle-update-idor-guard, non-streaming-haiku-call, try-catch-fallback]
key_files:
  created:
    - src/lib/extract-job-meta.ts
  modified:
    - src/lib/dal.ts
    - src/lib/schemas.ts
decisions:
  - "save_error is a top-level SSE event variant (not embedded in result) per D-06"
  - "applicationId on result variant rather than separate saved event per D-03"
  - "extractJobMeta max_tokens=64 with 2000-char JD slice — job title/company appear early"
metrics:
  duration: ~5min
  completed: 2026-05-26
  tasks_completed: 3
  files_changed: 3
---

# Phase 06 Plan 01: Server-Side Foundation for Save-After-Analysis Summary

Wave 1 foundation: DAL function, extended Zod schemas, and Haiku-based job-meta extractor — all pure additions with no route handler changes.

## What Was Built

**`updateInterviewData` in `src/lib/dal.ts`** — five-line mirror of `updateApplicationStatus`. Writes `interviewData` (typed as `InterviewPrepResult`) to an existing application row. IDOR guard: WHERE clause requires both `eq(applications.id, id)` and `eq(applications.userId, userId)`.

**Extended `src/lib/schemas.ts`** — three targeted changes:
1. `AnalyseResponseEventSchema` `result` variant gains `applicationId: z.string().optional()`
2. New `save_error` discriminated-union variant added after `result`
3. `InterviewQuestionsRequestSchema` gains `applicationId: z.string().optional()`

**`src/lib/extract-job-meta.ts`** — non-streaming `claude-haiku-4-5-20251001` call. Sends up to 2000 chars of JD text, expects `{ jobTitle, company }` JSON. Full try/catch covers both the API call and `JSON.parse`. Returns `{ jobTitle: 'Unknown Role', company: 'Unknown Company' }` on any failure.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 75d59c7 | feat(06-01): add updateInterviewData to dal.ts |
| 2 | 23bd29c | feat(06-01): extend schemas with save_error event and applicationId fields |
| 3 | b5602be | feat(06-01): create extract-job-meta.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat | Disposition | Implemented |
|--------|-------------|-------------|
| T-06-01: JSON.parse of Haiku output | mitigate | Full try/catch wraps parse; non-JSON returns fallback |
| T-06-02: Cross-user record update | mitigate | WHERE clause uses `and(eq(applications.id, id), eq(applications.userId, userId))` |
| T-06-03: applicationId in request schema | mitigate | Optional string field; IDOR guard in updateInterviewData prevents cross-user writes |

## Self-Check: PASSED

- `src/lib/extract-job-meta.ts` exists and exports `extractJobMeta`
- `src/lib/dal.ts` contains `updateInterviewData` (grep count: 1)
- `src/lib/schemas.ts` contains `save_error` (grep count: 1) and `applicationId` (grep count: 2)
- `npx tsc --noEmit` passes with zero errors
