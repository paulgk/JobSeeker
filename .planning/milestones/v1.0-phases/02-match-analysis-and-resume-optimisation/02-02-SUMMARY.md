---
phase: 02-match-analysis-and-resume-optimisation
plan: 02-02
subsystem: api
tags: [anthropic-sdk, streaming, sse, zod, zodOutputFormat, llm, structured-output]

# Dependency graph
requires:
  - phase: 02-01
    provides: AnalysisResultSchema, SYSTEM_PROMPT, buildUserPrompt, @anthropic-ai/sdk installed
provides:
  - Real Anthropic streaming route at POST /api/analyse emitting start/chunk/result/error/done SSE events
  - callWithRetry helper with retry-once logic on non-end_turn stop_reason
  - maxDuration=60 export capping runaway calls
affects: [02-03, 02-04, 02-05, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SSE streaming via ReadableStream with start/chunk/result/error/done event protocol
    - Retry-once pattern using attempt counter passed recursively
    - Error surfaced as SSE error event (no unhandled 500)

key-files:
  created: []
  modified:
    - src/app/api/analyse/route.ts

key-decisions:
  - "zodOutputFormat takes one argument only (no name param) — plan had incorrect second arg, corrected"
  - "All three tasks implemented as single coherent file write; committed as one atomic unit"

patterns-established:
  - "callWithRetry: register stream.on('text') before finalMessage(), check stop_reason, then parsed_output"
  - "SSE error handling: catch all errors inside ReadableStream.start(), emit error event then done, never crash"

# Metrics
duration: 2min
completed: 2026-05-22
---

# Phase 02 Plan 02: Analyse Route — Real LLM Streaming Summary

**Real Anthropic streaming route replacing mock: client.messages.stream() with zodOutputFormat, retry-once on non-end_turn, all errors surfaced as SSE error events**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-22T07:07:00Z
- **Completed:** 2026-05-22T07:09:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Replaced mock ReadableStream block with real Anthropic streaming call using `client.messages.stream()` and `zodOutputFormat(AnalysisResultSchema)`
- Implemented `callWithRetry` helper that streams text deltas via callback, retries once with `max_tokens: 6144` when `stop_reason !== 'end_turn'`, and throws if `parsed_output` is missing
- Added `maxDuration = 60` export; errors (including missing API key) caught inside ReadableStream and emitted as `error` SSE event followed by `done`

## Task Commits

All three tasks implemented together as single coherent file (tightly coupled same-file changes):

1. **Task 1: Add callWithRetry helper** - `4330532` (feat)
2. **Task 2: Replace mock ReadableStream** - `4330532` (feat, same commit)
3. **Task 3: Add maxDuration + graceful no-key behaviour** - `4330532` (feat, same commit)

## Files Created/Modified
- `src/app/api/analyse/route.ts` - Real streaming route with callWithRetry, zodOutputFormat, retry logic, SSE error handling

## Decisions Made
- `zodOutputFormat` in the installed SDK (0.98.x) takes only one argument — plan specified a second name argument `'analysis_result'` which does not exist in the type signature. Corrected to `zodOutputFormat(AnalysisResultSchema)`.
- Tasks 1, 2, and 3 all modify the same file in a tightly coupled way; committed as single atomic unit rather than three partial commits that would leave the file in a broken intermediate state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] zodOutputFormat called with single argument instead of two**
- **Found during:** Task 1 (checking SDK type signatures before writing)
- **Issue:** Plan specified `zodOutputFormat(AnalysisResultSchema, 'analysis_result')` but the installed SDK's `helpers/zod` exports `zodOutputFormat<ZodInput extends z.ZodType>(zodObject: ZodInput)` — only one parameter. Calling with two arguments would cause a TypeScript error.
- **Fix:** Used `zodOutputFormat(AnalysisResultSchema)` with single argument as the SDK requires.
- **Files modified:** src/app/api/analyse/route.ts
- **Verification:** `npx tsc --noEmit` passes with no errors.
- **Committed in:** 4330532

---

**Total deviations:** 1 auto-fixed (1 bug — incorrect API call signature per plan)
**Impact on plan:** Fix was necessary for TypeScript compilation. No functional difference; the SDK auto-generates schema name from the JSON schema shape.

## Issues Encountered
None - aside from the deviation above, execution was straightforward.

## User Setup Required
`ANTHROPIC_API_KEY` must be set in `.env.local` before the route executes. Without it, the SDK throws inside `callWithRetry`, which is caught and emitted as an `error` SSE event — the dev server does not crash.

## Next Phase Readiness
- POST /api/analyse now streams real Claude output with structured `AnalysisResult` JSON
- Ready for 02-03 (client-side hook consuming the SSE stream) and 02-04 (UI components rendering the result)
- Manual smoke test requires `ANTHROPIC_API_KEY` in `.env.local`

---
*Phase: 02-match-analysis-and-resume-optimisation*
*Completed: 2026-05-22*
