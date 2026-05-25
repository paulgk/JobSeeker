---
phase: 03-interview-preparation
plan: 03-01
subsystem: lib/schemas + lib/interview-prompt
tags: [schemas, zod, prompts, foundation, wave-1]
dependency_graph:
  requires: []
  provides:
    - InterviewPrepResultSchema
    - InterviewPrepResult
    - InterviewQuestionsRequestSchema
    - InterviewCritiqueRequestSchema
    - InterviewQuestionsEventSchema
    - QUESTIONS_SYSTEM_PROMPT
    - buildQuestionsPrompt
    - CRITIQUE_SYSTEM_PROMPT
    - buildCritiquePrompt
  affects:
    - src/lib/schemas.ts
    - src/lib/interview-prompt.ts
tech_stack:
  added: []
  patterns:
    - Zod discriminated union for SSE event shape documentation
    - wrapUserContent defensive wrapping for all user-supplied prompt inputs
key_files:
  created:
    - src/lib/interview-prompt.ts
  modified:
    - src/lib/schemas.ts
decisions:
  - "No max() length on modelAnswer — LLM output length limits can cause schema failures for thorough answers; system prompt enforces 150-250 word count verbally"
  - "category enum fixed to 4 values: behavioural, technical, situational, role-specific — prevents model taxonomy drift"
  - "All critique inputs wrapped via wrapUserContent even though question and modelAnswer come from a prior LLM call — consistent with defensive wrapping in analysis-prompt.ts"
metrics:
  duration: "5 minutes"
  completed: "2026-05-25"
  tasks_completed: 2
  files_changed: 2
---

# Phase 3 Plan 01: Foundation — Schemas and Prompt Summary

## One-liner

Zod v4 interview schemas (request, result, SSE events, critique) and two system prompts with JD-grounded question generation and three-section critique structure, all user inputs wrapped via wrapUserContent.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Append interview schemas to schemas.ts | eed30d8 | src/lib/schemas.ts |
| 2 | Create interview-prompt.ts | 6b5ba54 | src/lib/interview-prompt.ts |

## What Was Built

**schemas.ts additions (appended after `// ── Shared error shape ──`):**
- `InterviewQuestionsRequestSchema` — validates POST body for the questions API (resumeText min 200, jdText min 50)
- `InterviewQuestionSchema` (internal) — question, category enum (4 values), rationale, modelAnswer
- `InterviewPrepResultSchema` — questions array (5-8 items), prepStrategy with seniorityLevel/domainContext/tips
- `InterviewQuestionsEventSchema` — discriminated union documenting SSE contract (start/chunk/result/error/done)
- `InterviewCritiqueRequestSchema` — validates POST body for the critique API (question min 10, modelAnswer min 50, draftAnswer min 20)
- Exported types: `InterviewPrepResult`, `InterviewQuestionsRequest`, `InterviewCritiqueRequest`

**interview-prompt.ts (new file, server-side only):**
- `QUESTIONS_SYSTEM_PROMPT` — enforces GROUNDING RULE (every question references specific JD language, generic STAR questions NOT allowed), specifies 4 category archetypes, 5-8 question volume, 150-250 word model answers, tailored prep strategy
- `buildQuestionsPrompt(resumeText, jdText)` — wraps both inputs via wrapUserContent with distinct XML tags
- `CRITIQUE_SYSTEM_PROMPT` — 3-section structure (What works / What to improve / One rewrite suggestion), 150-200 word limit, plain markdown format
- `buildCritiquePrompt(question, modelAnswer, draftAnswer)` — wraps all three inputs via wrapUserContent with distinct XML tags

## Verification Results

- `npx tsc --noEmit`: passed (0 errors)
- `npm run lint`: passed (0 errors; 96 pre-existing warnings in `.agents/skills/impeccable/` tooling files only)
- All existing Phase 1 and Phase 2 schemas untouched (AnalysisResultSchema confirmed present)
- GROUNDING RULE and "NOT allowed" strings confirmed in QUESTIONS_SYSTEM_PROMPT
- wrapUserContent called 5 times total: 1 import + 2 in buildQuestionsPrompt + 3 in buildCritiquePrompt

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes at trust boundaries. The files are pure library code consumed by routes created in later plans.

## Self-Check: PASSED

- [x] src/lib/schemas.ts — exists with all required exports
- [x] src/lib/interview-prompt.ts — exists with all required exports
- [x] Commit eed30d8 — feat(03-01): append interview preparation schemas to schemas.ts
- [x] Commit 6b5ba54 — feat(03-01): create interview-prompt.ts with system prompts and builders
