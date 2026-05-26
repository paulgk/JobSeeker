# Phase 8: History Enhancements - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the history experience: let users correct auto-extracted metadata, trigger interview prep directly from saved applications, visually flag unknown values, and fix workflow gaps (401 redirect + save-error visibility).

No new pages. All changes are on existing surfaces: `/history` list, `/history/[id]` detail, and the home-page SSE consumer.

</domain>

<decisions>
## Implementation Decisions

### Inline Editing — Company Name & Job Title

- **D-01:** Editing is available on the **detail page only** (`/history/[id]`). The history list row stays read-only — it is already dense with score, status, and date. This matches the existing pattern where `StatusSelect` lives on both surfaces but complex editing belongs on the detail view.
- **D-02:** **Click-to-edit inline** — the company name (`<h1>`) and job title (`<p>`) on the detail page become editable on click (convert to `<input>`). No separate Edit button.
- **D-03:** **Auto-save on blur or Enter** — no Save/Cancel buttons. Saves via `PATCH /api/applications/[id]/metadata` (new endpoint, mirrors the `/status` PATCH pattern). Errors shown inline (e.g., red ring).
- **D-04:** Needs a new DAL function `updateApplicationMeta(userId, id, { jobTitle, company })` with IDOR guard, and a new Route Handler `PATCH /api/applications/[id]/metadata`.
- **D-05:** Detail page header (company + job title block) becomes a `'use client'` island component — detail page itself stays a Server Component. Pattern mirrors `StatusSelect`.

### Unknown State Highlighting

- **D-06:** When `company === 'Unknown Company'` or `jobTitle === 'Unknown Role'`, show an **orange "Edit needed" badge** next to the value on both the history list row and the detail page header.
- **D-07:** The badge signals that the LLM extraction failed and the user should fill in the correct values. On the list, badge is read-only (no editing there). On the detail, clicking the badge or the field starts inline edit.

### Interview Prep Trigger from Detail Page

- **D-08:** **Run interview prep inline on the detail page** — no navigation away. When `app.interviewData` is null, the Interview Prep tab shows a "Start Interview Prep" button instead of the link-back-to-home placeholder.
- **D-09:** Clicking "Start Interview Prep" streams Q+A directly into the tab (SSE, same as the home-page flow). On completion, auto-saves to the same application record via `updateInterviewData()`.
- **D-10:** The interview trigger component is a `'use client'` island that receives `applicationId` and `resumeText`/`jdText` as props from the Server Component. It calls the existing `/api/interview-questions` Route Handler with `applicationId` in the body.
- **D-11:** The `/api/interview-questions` route already accepts `applicationId` and calls `updateInterviewData()` on completion — no route changes needed. Confirm at planning.

### Workflow Fixes

- **D-12:** **401 → sign-in redirect** — in `use-analysis.ts`, when the `/api/analyse` response is 401, redirect to `/sign-in` (using `window.location.href`) instead of showing "Failed to connect". Same fix for `use-interview-prep.ts` on `/api/interview-questions`.
- **D-13:** **Save-error visibility** — when the SSE `save_error` event fires in `use-analysis.ts`, surface it as a visible toast or inline banner (not just `console.warn`). The existing `shadcn/ui` Sonner toast library (if installed) or a simple inline banner suffices. Check what's installed.

### Claude's Discretion
- Exact styling of the inline edit input (ring color, font size) — match existing detail-page heading styles
- Toast vs inline banner for save_error — use whatever toast mechanism shadcn/ui provides; if Sonner is not installed, a dismissible inline `<div>` is acceptable
- Exact "Edit needed" badge color token — use the closest available amber/orange from the existing design system

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing history surfaces (read before touching)
- `src/app/history/page.tsx` — History list page (Server Component, RSC)
- `src/app/history/[id]/page.tsx` — Application detail page (Server Component)
- `src/components/status-select.tsx` — Reference pattern: client island that PATCHes an API route + optimistic update
- `src/app/api/applications/[id]/status/route.ts` — Reference pattern: PATCH Route Handler with IDOR guard

### DAL (extend, don't rewrite)
- `src/lib/dal.ts` — All DAL functions live here; add `updateApplicationMeta()` following the existing pattern
- `src/lib/db/schema.ts` — No schema changes needed (company/jobTitle are already varchar columns)

### SSE client hooks (workflow fix targets)
- `src/hooks/use-analysis.ts` — Fix: 401 → redirect; save_error → visible UI
- `src/hooks/use-interview-prep.ts` — Fix: 401 → redirect

### Interview prep route (confirm applicationId handling)
- `src/app/api/interview-questions/route.ts` — Check that it already accepts applicationId and calls updateInterviewData

### Design system
- `src/components/ui/` — shadcn/ui components; check what toast mechanism is present (Sonner or otherwise)
- `.planning/phases/07-history-ui/07-UI-SPEC.md` — UI spec for history pages; follow established visual language

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusSelect` (`src/components/status-select.tsx`): Client island pattern — receives id + initial value as props, PATCHes an API route, holds local state. **Inline edit fields should follow this exact pattern.**
- `useAnalysis` hook (`src/hooks/use-analysis.ts`): SSE consumer with save_error handling — already wired; needs the 401 redirect and save_error UI surfacing.
- `useInterviewPrep` hook (`src/hooks/use-interview-prep.ts`): SSE consumer for interview questions — used on home page; can be reused on detail page island with applicationId prop.
- `Badge` (`src/components/ui/badge.tsx`): Used for status labels. Use the same component for the "Edit needed" badge with appropriate variant.

### Established Patterns
- **IDOR guard**: `and(eq(applications.id, id), eq(applications.userId, userId))` in all DAL queries — replicate in `updateApplicationMeta`.
- **PATCH Route Handler pattern**: `/api/applications/[id]/status/route.ts` — enum validation + DAL call + 204/400/403/404 responses. Mirror for `/api/applications/[id]/metadata`.
- **`verifySession()` in route handlers**: Auth guard is always at the top of the handler body (not an HOC wrapper, which breaks ReadableStream).
- **Server Component + client island**: Detail page is Server Component; interactive slices are `'use client'` islands receiving props. `StatusSelect` is the established reference.
- **`Math.round()` on matchScore**: Already fixed in `/api/analyse/route.ts` — do not revert.

### Integration Points
- Detail page header: becomes a client island for inline editing (company + jobTitle)
- Interview Prep tab empty state: becomes a client island that triggers the interview SSE stream
- `use-analysis.ts` error handler: add 401 branch and save_error UI
- `use-interview-prep.ts` error handler: add 401 branch

</code_context>

<specifics>
## Specific Ideas

- "Click-to-edit" inline UX — user explicitly chose this (Notion/Linear-style)
- "Auto-save on blur/Enter" — matches `StatusSelect` auto-save behavior, no extra buttons
- "Warning badge" for unknown values — user wants explicit visual signal, not just muted text
- Interview prep inline on detail page — user deferred to Claude; design judgment says inline is better than navigation away

</specifics>

<deferred>
## Deferred Ideas

- Delete application from history (HIST-V2-03 in v2 backlog)
- Score trend chart per application (HIST-V2-01)
- Notes field per application (HIST-V2-02)
- Bullet-level rewrite suggestions (OPT-V2-01)

</deferred>

---

*Phase: 8-history-enhancements*
*Context gathered: 2026-05-26*
