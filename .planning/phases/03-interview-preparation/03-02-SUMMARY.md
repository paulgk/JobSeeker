---
phase: 03-interview-preparation
plan: 03-02
subsystem: api
tags: [api-routes, sse, streaming, anthropic, interview-prep]
dependency_graph:
  requires: [03-01]
  provides: [interview-questions-api, interview-critique-api]
  affects: []
tech_stack:
  added: []
  patterns: [sse-streaming, zod-output-format, call-with-retry, raw-text-streaming]
key_files:
  created:
    - src/app/api/interview-questions/route.ts
    - src/app/api/interview-critique/route.ts
  modified: []
decisions:
  - "critique route omits zodOutputFormat and result event — plain markdown streamed client-side"
  - "questions route reuses callWithRetry pattern from analyse/route.ts verbatim with InterviewPrepResult types"
  - "maxDuration=30 for critique (short 150-200 word output) vs maxDuration=60 for questions"
metrics:
  duration_minutes: 6
  completed: 2026-05-25
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 03 Plan 02: API Routes — Questions and Critique Summary

**One-liner:** Two SSE route handlers — Sonnet with zodOutputFormat for structured interview questions, Haiku with raw text streaming for markdown critique.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create interview-questions route (Sonnet, zodOutputFormat, SSE) | dc72b7c | src/app/api/interview-questions/route.ts |
| 2 | Create interview-critique route (Haiku, raw stream, SSE) | f0e03fb | src/app/api/interview-critique/route.ts |

## What Was Built

**`/api/interview-questions`** — mirrors `analyse/route.ts` exactly:
- Model: `claude-sonnet-4-6`
- `zodOutputFormat(InterviewPrepResultSchema)` via `output_config`
- `callWithRetry` retries once with `max_tokens=6144` when `stop_reason !== 'end_turn'`
- SSE events: `start | chunk | result | done | error`
- Request validated with `InterviewQuestionsRequestSchema`
- `maxDuration = 60`, `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`

**`/api/interview-critique`** — simpler variant:
- Model: `claude-haiku-4-5-20251001`
- No `zodOutputFormat`, no `output_config`, no retry logic
- Raw text chunks streamed directly as `chunk` SSE events
- SSE events: `start | chunk | done | error` (no `result` event)
- Request validated with `InterviewCritiqueRequestSchema`
- `maxDuration = 30`, `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`

Both routes include `X-Accel-Buffering: no` to prevent Vercel nginx buffering.

## Verification Results

- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors (96 pre-existing warnings in `.agents/` scripts, unrelated)
- Static checks: all required constants, imports, and headers confirmed present

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both routes are complete implementations with no placeholder data.

## Threat Flags

None — routes validate all inputs with Zod before processing. No new trust boundaries introduced beyond what the plan specifies.

## Self-Check: PASSED

- FOUND: src/app/api/interview-questions/route.ts
- FOUND: src/app/api/interview-critique/route.ts
- FOUND: commit dc72b7c (interview-questions)
- FOUND: commit f0e03fb (interview-critique)
