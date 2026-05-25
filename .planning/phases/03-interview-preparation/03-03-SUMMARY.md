---
phase: 03-interview-preparation
plan: 03-03
name: client-data-layer-use-interview-prep
subsystem: hooks
tags: [interview, hook, sse, reducer, state-management]
dependency_graph:
  requires: [03-01]
  provides: [useInterviewPrep hook]
  affects: [03-04, 03-05]
tech_stack:
  added: []
  patterns: [useReducer, useCallback, SSE ReadableStream consumer, immutable array updates]
key_files:
  created:
    - src/hooks/use-interview-prep.ts
  modified: []
decisions:
  - submitCritique accepts draftAnswer as a parameter (not read from state) to avoid stale closure on re-submission
  - CRITIQUE_START resets both critiqueText and critiqueError to empty string — mandatory for clean re-submission
  - defaultQuestionState() helper function used in QUESTIONS_RESULT to keep reducer readable
metrics:
  duration: ~10 minutes
  completed: 2026-05-25
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 03 Plan 03-03: Client Data Layer — use-interview-prep Hook Summary

## One-liner

SSE-consuming useInterviewPrep hook with 10-action reducer and per-question state arrays for expand/draft/critique lifecycle.

## What Was Built

`src/hooks/use-interview-prep.ts` — a `'use client'` hook that mirrors the architecture of `use-analysis.ts` and extends it with per-question arrays for independent state management.

**Exported types:**
- `QuestionState` — per-question state: expanded, draftAnswer, critiquePhase, critiqueText, critiqueError
- `PrepState` — discriminated union: idle | streaming | done | error

**Reducer (10 actions):**
- `STREAM_START`, `CHUNK`, `QUESTIONS_RESULT`, `ERROR` — top-level phase transitions
- `TOGGLE_EXPAND`, `SET_DRAFT` — per-question UI state
- `CRITIQUE_START`, `CRITIQUE_CHUNK`, `CRITIQUE_DONE`, `CRITIQUE_ERROR` — per-question critique lifecycle

**Hook returns:** `{ state, startPrep, submitCritique, toggleExpand, setDraft }`

**SSE consumers:** Both `startPrep` (→ `/api/interview-questions`) and `submitCritique` (→ `/api/interview-critique`) use the identical buffer-split-on-`\n\n` pattern from `use-analysis.ts`.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create use-interview-prep.ts | 0bdb2d8 | src/hooks/use-interview-prep.ts |

## Deviations from Plan

None — plan executed exactly as written. The plan's code spec was followed precisely including the four-parameter `submitCritique` signature, the mandatory `CRITIQUE_START` reset, and all 10 reducer actions with `state.phase !== 'done'` guards on per-question cases.

## Known Stubs

None. This is a pure state management hook with no UI rendering and no hardcoded data.

## Threat Flags

None. This hook only makes fetch calls to same-origin API routes — no new network surface, auth paths, or schema changes at trust boundaries.

## Self-Check: PASSED

- `src/hooks/use-interview-prep.ts` exists: FOUND
- Commit 0bdb2d8 exists: FOUND
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors (96 pre-existing warnings in .agents/ scripts only)
- Exports `useInterviewPrep`, `QuestionState`, `PrepState`: confirmed
- `CRITIQUE_START` resets `critiqueText: ''` and `critiqueError: ''`: confirmed
- `submitCritique` has four parameters including `draftAnswer: string`: confirmed
- Both SSE consumers use fetch + ReadableStreamDefaultReader + `\n\n` split: confirmed
