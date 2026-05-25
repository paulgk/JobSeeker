---
phase: 03-interview-preparation
plan: 03-04
name: display-components-interview-prep-panel-and-question-card
subsystem: interview-prep-ui
tags: [components, interview-prep, stateless, hook-orchestration]
dependency_graph:
  requires: [03-03]
  provides: [InterviewPrepPanel, QuestionCard]
  affects: [src/app/interview/page.tsx]
tech_stack:
  added: []
  patterns: [stateless-controlled-component, phase-gated-ui, hook-orchestration]
key_files:
  created:
    - src/components/interview-prep-panel.tsx
    - src/components/question-card.tsx
  modified: []
decisions:
  - "QuestionCard uses a native <button> for the header row to make the full row clickable while remaining accessible (aria-expanded)"
  - "Model answer displayed in bg-secondary block (always visible) rather than behind a secondary toggle — reduces interaction depth for prep workflow"
  - "Feedback button shows 'Getting feedback…' label text while streaming in addition to being disabled — reduces ambiguity when streaming starts"
  - "draftTooShort hint shown only after user has started typing (draftAnswer.length > 0) to avoid noise on initial render"
metrics:
  duration_minutes: 15
  completed: "2026-05-25"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 03 Plan 04: Display Components — InterviewPrepPanel and QuestionCard Summary

## One-liner

Phase-gated InterviewPrepPanel and stateless QuestionCard rendering idle/streaming/error/done states, with per-question expand, draft textarea, and inline critique streaming.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create QuestionCard stateless controlled component | 9dc7456 | src/components/question-card.tsx |
| 2 | Create InterviewPrepPanel orchestrating the hook | 8ca0d54 | src/components/interview-prep-panel.tsx |

## Decisions Made

1. **Model answer always visible when expanded** — The plan gave discretion on model-answer visibility. Displaying it immediately avoids a tertiary interaction (expand card → show model → write draft). The prep workflow benefits from seeing the model answer before writing.

2. **Native `<button>` for full-row header** — The header must be fully clickable and accessible. A native button with `aria-expanded` satisfies both without adding a click handler to a `div`.

3. **Streaming button label change** — The feedback button shows "Getting feedback…" as its label (in addition to `disabled`) during streaming, so the state change is immediately legible even without looking at the critique area below.

4. **Draft hint gated on non-empty input** — The "At least 20 characters" hint appears only once the user has started typing, keeping the UI clean on first render.

## Deviations from Plan

None — plan executed exactly as written. The `onSubmitCritique` prop in the plan prompt specified a `(draft: string) => void` signature, but the PLAN.md itself specifies `() => void` with the panel passing the draft at call time. Used the PLAN.md contract (`() => void`) which matches the hook's stale-closure avoidance pattern described in the plan.

## Verification

- `npx tsc --noEmit` — passed (0 errors)
- `npm run lint` — passed (0 errors; 96 pre-existing warnings in `.agents/` scripts unrelated to this plan)

### Static checks

- `interview-prep-panel.tsx` exports `InterviewPrepPanel`; imports `useInterviewPrep`; renders four phase branches; does NOT contain `useEffect`.
- `question-card.tsx` exports `QuestionCard`; contains no `useState` or `useReducer`; renders both collapsed (header) and expanded (rationale, model answer, textarea, feedback button, critique display) states.
- Both files are `'use client'`.

## Known Stubs

None — components are fully wired to the hook. No hardcoded empty values, placeholder text, or mock data.

## Threat Flags

None — these are pure display components with no network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- [x] src/components/question-card.tsx exists
- [x] src/components/interview-prep-panel.tsx exists
- [x] Commit 9dc7456 exists (QuestionCard)
- [x] Commit 8ca0d54 exists (InterviewPrepPanel)
