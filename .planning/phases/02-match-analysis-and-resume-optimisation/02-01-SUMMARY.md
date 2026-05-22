---
phase: 02-match-analysis-and-resume-optimisation
plan: "01"
subsystem: api
tags: [anthropic, zod, diff, shadcn, sse, prompts, schema]

# Dependency graph
requires:
  - phase: 01-input-pipeline
    provides: schemas.ts with AnalyseRequestSchema/AnalyseResponseEventSchema, sanitize.ts with wrapUserContent()
provides:
  - "@anthropic-ai/sdk and diff installed and importable"
  - "AnalysisResultSchema and AnalysisResult type (flat shape: overallScore, components[], actionItems[], keywordGaps[], rewrites[])"
  - "AnalyseResponseEventSchema extended with result event carrying AnalysisResult"
  - "SYSTEM_PROMPT with hardcoded 40/25/20/15 rubric and anti-hallucination constraints"
  - "buildUserPrompt() wrapping both inputs via wrapUserContent()"
  - "progress.tsx, separator.tsx, scroll-area.tsx shadcn components"
affects:
  - 02-02-route
  - 02-03-hook
  - 02-04-components
  - 02-05-results-panel
  - 02-06-integration

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk ^0.98.0", "diff ^9.0.0", "@types/diff ^7.0.2"]
  patterns:
    - "Flat Zod schemas (<=3 levels nesting, no optional arrays — use empty arrays)"
    - "XML-wrapped user prompt content via wrapUserContent() for prompt injection defense"
    - "Hardcoded rubric in system prompt to prevent LLM deviation from scoring weights"

key-files:
  created:
    - src/lib/analysis-prompt.ts
    - src/components/ui/progress.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/scroll-area.tsx
  modified:
    - src/lib/schemas.ts
    - package.json

key-decisions:
  - "Schema kept flat (<=3 nesting levels) per output_config complexity limits"
  - "AnalyseResponseEventSchema extended in-place — existing start/chunk/error/done variants preserved"
  - "SYSTEM_PROMPT hardcodes rubric values as strings (40%, 25%, 20%, 15%) to prevent model deviation"

patterns-established:
  - "Prompt builder pattern: SYSTEM_PROMPT constant + buildUserPrompt(resumeText, jdText) function in dedicated file"
  - "SSE event union pattern: discriminated union on 'type' field with typed payloads per event variant"

# Metrics
duration: 8min
completed: 2026-05-22
---

# Phase 2 Plan 01: Foundation — Dependencies, Schema, and Prompt Summary

**Anthropic SDK + diff installed, AnalysisResultSchema with 5-field flat shape, and SYSTEM_PROMPT with locked 40/25/20/15 rubric and anti-hallucination constraints**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-22T07:23:00Z
- **Completed:** 2026-05-22T07:31:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Installed `@anthropic-ai/sdk` and `diff` packages with TypeScript types; verified importable via Node
- Extended `AnalyseResponseEventSchema` discriminated union with `result` event carrying full `AnalysisResult` payload
- Created `analysis-prompt.ts` with locked rubric system prompt and XML-wrapped user prompt builder

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and shadcn components** - `b85e7a4` (chore)
2. **Task 2: Extend schemas.ts with AnalysisResultSchema and result event** - `b377cb7` (feat)
3. **Task 3: Create analysis-prompt.ts** - `92f9f32` (feat)

## Files Created/Modified

- `src/lib/schemas.ts` - Added AnalysisResultSchema, AnalysisResult type, extended AnalyseResponseEventSchema with result variant
- `src/lib/analysis-prompt.ts` - SYSTEM_PROMPT constant and buildUserPrompt() function
- `src/components/ui/progress.tsx` - shadcn Progress component
- `src/components/ui/separator.tsx` - shadcn Separator component
- `src/components/ui/scroll-area.tsx` - shadcn ScrollArea component
- `package.json` - Added @anthropic-ai/sdk, diff, @types/diff

## Decisions Made

- Schema kept flat (3 levels max) to avoid output_config complexity limits — no nested optional arrays
- `AnalyseResponseEventSchema` extended in-place, existing variants unchanged, `result` variant inserted between `chunk` and `error` for logical ordering
- `SYSTEM_PROMPT` hardcodes literal percentage strings so the model cannot reinterpret or renegotiate weights

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

This plan requires an Anthropic API key for Phase 2 LLM calls (not needed for this foundation plan itself, but required before running the analyse route):

- Set `ANTHROPIC_API_KEY` environment variable from https://console.anthropic.com/settings/api-keys

## Next Phase Readiness

- All Wave 1 foundation artifacts are in place; Wave 2 plans (02-02 route, 02-03 hook, 02-04 components) can begin
- `npx tsc --noEmit` and `npm run lint` both clean
- No blockers

---
*Phase: 02-match-analysis-and-resume-optimisation*
*Completed: 2026-05-22*
