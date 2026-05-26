---
phase: 08-history-enhancements
plan: "02"
subsystem: history-ui
tags: [client-island, inline-edit, badge, react-state]
dependency_graph:
  requires: [08-01]
  provides: [editable-application-header, edit-needed-badge]
  affects: [src/app/history/page.tsx, "src/app/history/[id]/page.tsx"]
tech_stack:
  added: []
  patterns: [click-to-edit-island, optimistic-revert, conditional-badge]
key_files:
  created:
    - src/components/edit-needed-badge.tsx
    - src/components/editable-application-header.tsx
  modified:
    - src/app/history/page.tsx
    - "src/app/history/[id]/page.tsx"
decisions:
  - "PATCH sends both company and jobTitle fields (not just the changed one) to match route handler expectation"
  - "handleSave reverts blank-string input to initialCompany/initialJobTitle (not prev) to prevent empty save"
  - "EditableApplicationHeader owns only company+jobTitle editing; StatusSelect and status Badge stay in RSC"
  - "Clicking EditNeededBadge (wrapped in span with onClick) enters edit mode for that field"
metrics:
  duration: "134s"
  completed: "2026-05-26T12:40:55Z"
  tasks_completed: 3
  files_created: 2
  files_modified: 2
---

# Phase 8 Plan 02: Edit-Needed Badge + Editable Application Header Summary

**One-liner:** Click-to-edit company/jobTitle island with amber "Edit needed" badge on list and detail pages, auto-saves via PATCH, reverts on error.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create EditNeededBadge component | b7a0fb8 | src/components/edit-needed-badge.tsx |
| 2 | Create EditableApplicationHeader island | 2305cc0 | src/components/editable-application-header.tsx |
| 3 | Wire badges into history list and swap header on detail page | 37ae756 | src/app/history/page.tsx, src/app/history/[id]/page.tsx |

## What Was Built

**EditNeededBadge** (`src/components/edit-needed-badge.tsx`): Thin wrapper around `<Badge variant="outline">` with amber-500 Tailwind className override (`border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400`). No props, no logic, no `'use client'` — purely static display.

**EditableApplicationHeader** (`src/components/editable-application-header.tsx`): `'use client'` island with:
- Controlled state for `company`, `jobTitle`, `editingField`, `saving`, `error`
- Click on h1/p converts to `<Input>` with `autoFocus`
- Blur or Enter triggers `handleSave`, which PATCHes `/api/applications/[id]/metadata`
- Escape key reverts to `initialCompany`/`initialJobTitle`
- Empty-string guard: blank input reverts to initial value without PATCH
- Error revert: on `!res.ok`, reverts the changed field to its pre-edit value
- Inline `<p className="text-sm text-destructive">` error message

**History list page** (`src/app/history/page.tsx`): Company and jobTitle spans wrapped in `flex items-center gap-1.5` divs; conditional `<EditNeededBadge />` appears after each when value matches 'Unknown Company'/'Unknown Role'.

**Detail page** (`src/app/history/[id]/page.tsx`): Static h1+p header block replaced with `<EditableApplicationHeader>` island; StatusSelect and status Badge remain as RSC siblings. Page has no `'use client'` directive.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. PATCH fetch goes to same-origin `/api/applications/${id}/metadata`; session cookie included automatically; empty-string guard on client mirrors server-side validation in the 08-01 route handler (defense in depth — T-08-05).

## Self-Check: PASSED

- `src/components/edit-needed-badge.tsx` exists and exports `EditNeededBadge`
- `src/components/editable-application-header.tsx` exists with `'use client'` as line 1
- `src/app/history/page.tsx` has two conditional `EditNeededBadge` usages
- `src/app/history/[id]/page.tsx` has `EditableApplicationHeader` import and usage; no `'use client'`
- All three commits verified: b7a0fb8, 2305cc0, 37ae756
- `npx tsc --noEmit` passes with zero errors
