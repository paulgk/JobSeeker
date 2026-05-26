---
phase: 07-history-ui
plan: 04
subsystem: ui
tags: [nextjs, react, typescript, server-component, client-component, prefill, re-run]

requires:
  - phase: 07-history-ui/07-01
    provides: AuthHeader, StatusSelect, /history list page
  - phase: 07-history-ui/07-02
    provides: PATCH /api/applications/[id]/status route
  - phase: 07-history-ui/07-03
    provides: ScoreCardDisplay, ActionListDisplay, KeywordBadgesDisplay, RewriteDiffReadOnly, QuestionCardDisplay
  - phase: 05-database-schema-and-dal
    provides: getApplicationById(userId, id) with IDOR guard, full Application row with JSONB
provides:
  - GET /api/applications/[id]/prefill route returning { resumeText, jdText } only
  - /history/[id] detail page — Server Component, reads saved analysis+interview data read-only
  - initialValue prop on ResumePanel and JobDescriptionPanel (fires useEffect to pre-populate)
  - Re-run flow: /?applicationId=ID → prefill fetch → panels pre-populated → Analyse button enabled
affects: [phase-08, any future phase touching home page or history routes]

tech-stack:
  added: []
  patterns:
    - Next.js 16 Client Component searchParams via use(searchParams) Promise unwrap
    - Next.js 16 Server Component params via await params Promise unwrap
    - useEffect keyed on initialValue only — stable React setter deps omitted intentionally with eslint-disable
    - Prefill route scoped to owner via verifySession + getApplicationById IDOR guard

key-files:
  created:
    - src/app/api/applications/[id]/prefill/route.ts
    - src/app/history/[id]/page.tsx
  modified:
    - src/components/resume-panel.tsx
    - src/components/jd-panel.tsx
    - src/app/page.tsx

key-decisions:
  - "Prefill route returns only { resumeText, jdText } — no analysisData, interviewData, or any other field"
  - "initialValue useEffect depends only on [initialValue] not [onReady] to avoid identity-change re-firing loop"
  - "Re-run button is <Link> wrapping <Button> — no router.push wrapper needed; Next.js Link does client-side nav"
  - "Detail page repeats STATUS_VARIANT/STATUS_LABELS constants inline — not imported from list page (sibling routes, UI-SPEC locked per-page)"
  - "Interview empty state uses &apos; entity for apostrophe per JSX lint conventions"

patterns-established:
  - "Prefill pattern: route returns minimal payload → useEffect in page.tsx fetches on searchParam → initialValue threads into panels"
  - "Server Component detail page: await params, await verifySession, getApplicationById with notFound() guard"
  - "No AnalysisPanel/InterviewPrepPanel in detail page — they mount SSE on render"

requirements-completed: [HIST-03, HIST-04, HIST-05]

duration: 4min
completed: 2026-05-26
---

# Phase 7 Plan 04: History UI Detail Page and Re-run Wiring Summary

**Detail page at /history/[id] renders saved analysis+interview prep read-only; Re-run button navigates to /?applicationId=ID which pre-populates home page panels via GET /api/applications/[id]/prefill**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-26T06:19:32Z
- **Completed:** 2026-05-26T06:23:21Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Created GET `/api/applications/[id]/prefill` — auth-gated (401/404/200), returns only `{ resumeText, jdText }`, no data leakage of analysisData or other sensitive fields
- Built `/history/[id]` as a Next.js 16 Server Component with Tabs (Analysis + Interview Prep), Re-run button, StatusSelect, and all five display components from Wave 1
- Wired the home page Re-run flow: `searchParams` unwrapped via `use()`, prefill fetch in `useEffect`, `initialValue` prop threads saved text into both input panels enabling the Analyse button immediately

## Task Commits

1. **Task 1: Prefill route + initialValue props** - `f0e57f3` (feat)
2. **Task 2: /history/[id] detail page** - `6145b4e` (feat)
3. **Task 3: Home page Re-run wiring** - `f1d7ae1` (feat)

## Files Created/Modified

- `src/app/api/applications/[id]/prefill/route.ts` — GET route; verifySession + getApplicationById IDOR guard; returns `{ resumeText, jdText }` only; 401 unauthenticated, 404 non-owner/missing
- `src/app/history/[id]/page.tsx` — Server Component detail page; awaits params + verifySession; notFound() on null; Tabs with Analysis and Interview Prep; all five display components; Re-run as Link+Button; locked copy strings from UI-SPEC
- `src/components/resume-panel.tsx` — added `initialValue?: string` prop + useEffect keyed on `[initialValue]`
- `src/components/jd-panel.tsx` — added `initialValue?: string` prop + useEffect keyed on `[initialValue]`
- `src/app/page.tsx` — added `use`, `useEffect`; searchParams as Promise + `use(searchParams)`; prefill useEffect; `initialValue` props on both panels; all existing state/JSX preserved

## Decisions Made

- Prefill route returns the minimum needed payload (`resumeText`, `jdText` only) — `analysisData`, `interviewData`, `jobTitle`, `company`, `status`, `matchScore` excluded to minimise information exposure (T-07-16)
- `initialValue` `useEffect` intentionally omits `onReady` from the dependency array — React setState setters are stable; including `onReady` would create an identity-change re-fire loop that is avoided by the eslint-disable comment
- Re-run uses `<Link href={...}><Button>` pattern rather than `router.push` — simpler, no extra wrapper component needed
- STATUS_VARIANT and STATUS_LABELS are repeated in the detail page rather than imported from the list page (sibling routes; UI-SPEC locks these per page)

## Deviations from Plan

None — plan executed exactly as written. The worktree was created from a pre-Wave-1 commit and required a `git rebase main` before execution (not a deviation; standard worktree setup).

## Issues Encountered

- Worktree was based on commit `1629ce2` (before all Phase 7 Wave 1 work). Rebased onto `main` (`5983cb1`) before starting. This is a setup issue, not a code issue — all Wave 1 artifacts were present after rebase.
- `npx next build` exits with a pre-existing DB connection error (`Failed to collect page data for /api/auth/[...all]` — no DB at build time). This error existed before Plan 07-04 changes (confirmed by stash test). TypeScript passes cleanly (`npx tsc --noEmit` exits 0).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All five HIST requirements are now closed (HIST-01 through HIST-05 span plans 07-01 to 07-04)
- Phase 7 is complete — Wave 1 (plans 07-01, 07-02, 07-03) and Wave 2 (plan 07-04) are both done
- Detail page is ready for navigation from the history list page (the `/history` list already links to `/history/[id]` per plan 07-01)
- Re-run flow is end-to-end: history detail → /?applicationId=ID → panels pre-filled → user can re-run analysis

---
*Phase: 07-history-ui*
*Completed: 2026-05-26*
