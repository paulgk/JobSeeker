---
phase: 08-history-enhancements
plan: "03"
subsystem: history-detail
tags: [interview-prep, client-island, sse, streaming]
dependency_graph:
  requires: ["08-02"]
  provides: ["HIST-INTV-01"]
  affects: ["src/app/history/[id]/page.tsx", "src/components/interview-prep-island.tsx"]
tech_stack:
  added: []
  patterns: ["client-island", "sse-streaming", "server-component-props"]
key_files:
  created:
    - src/components/interview-prep-island.tsx
  modified:
    - src/app/history/[id]/page.tsx
decisions:
  - "Used near-verbatim copy of interview-prep-panel.tsx for streaming/error/done phases to minimize divergence"
  - "Link import retained in detail page (used by Back to History and Re-run Analysis links)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-26"
  tasks_completed: 2
  files_changed: 2
requirements:
  - HIST-INTV-01
---

# Phase 8 Plan 03: InterviewPrepIsland — Summary

InterviewPrepIsland client island embeds the full interview prep SSE flow directly in the detail page Interview tab, replacing the "Go back" link with an inline "Start Interview Prep" button.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create InterviewPrepIsland component | (pending) | src/components/interview-prep-island.tsx |
| 2 | Wire InterviewPrepIsland into detail page | (pending) | src/app/history/[id]/page.tsx |

## What Was Built

**Task 1 — InterviewPrepIsland (`src/components/interview-prep-island.tsx`):**
- `'use client'` island with props `{ applicationId: string, resumeText: string, jdText: string }`
- Idle phase: card with "Start Interview Prep" button calling `startPrep(resumeText, jdText, applicationId)`
- Streaming/error/done phases copied verbatim from `interview-prep-panel.tsx`
- Done phase uses interactive `QuestionCard` (not read-only `QuestionCardDisplay`)
- Hook destructuring: `useInterviewPrep()` with no arguments

**Task 2 — Detail page edit (`src/app/history/[id]/page.tsx`):**
- Added import for `InterviewPrepIsland`
- Replaced the empty-state `<div>` (old "Go back to run interview prep" link) with `<InterviewPrepIsland applicationId={app.id} resumeText={app.resumeText} jdText={app.jdText} />`
- Truthy branch (QuestionCardDisplay list for saved interview data) left untouched
- Page remains a Server Component — no `'use client'` directive added
- `Link` import retained (still used for "Back to History" and "Re-run Analysis" links)

## Verifications Passed

- `npx tsc --noEmit` — zero errors after both tasks
- `grep "startPrep(resumeText, jdText, applicationId)"` — correct 3-arg hook call confirmed
- `grep "QuestionCard"` — interactive QuestionCard (not QuestionCardDisplay) confirmed
- `grep "Go back to run interview prep"` — old link removed confirmed
- `grep "'use client'"` in detail page — not found (Server Component preserved)
- `grep "Link"` — import still present, used by Back and Re-run links

## Deviations from Plan

None — plan executed exactly as written.

The plan noted `onSubmitCritique={(q, ma, da) => submitCritique(...)}` as a signature hint, but `QuestionCard`'s actual prop is `onSubmitCritique: () => void`. The correct call pattern `() => submitCritique(i, question.question, question.modelAnswer, questions[i].draftAnswer)` was used (matching the existing pattern in `interview-prep-panel.tsx`). This is a documentation clarification, not a plan deviation.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The island calls the existing `/api/interview-questions` route (same-origin, session cookie). `applicationId` flows from server-side `getApplicationById` which enforces IDOR — consistent with T-08-09 accepted disposition.

## Self-Check

- [x] `src/components/interview-prep-island.tsx` exists
- [x] `src/app/history/[id]/page.tsx` modified with `InterviewPrepIsland`
- [x] TypeScript compiles clean
- [x] No `'use client'` in detail page

## Self-Check: PASSED
