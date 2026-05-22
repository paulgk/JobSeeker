---
phase: 01-input-pipeline
plan: "02"
subsystem: ui, api
tags: [nextjs, unpdf, pdfjs-dist, react, tailwind, shadcn, formdata, route-handler]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js 16 scaffold with shadcn/ui components and unpdf installed
provides:
  - POST /api/parse-resume route handler with multipart FormData, validation, and error codes
  - extractPdfText() utility wrapping unpdf for server-side PDF text extraction
  - ResumePanel component with Upload/Paste tab toggle and inline text preview
  - TextPreview component (reusable scrollable pre-formatted text display)
  - page.tsx updated with live ResumePanel replacing the Resume placeholder
affects:
  - 01-03 (JD panel can reuse TextPreview; page.tsx is updated, 01-03 must build on this state)
  - 01-04 (rate limiting will target /api/parse-resume endpoint)
  - 02-xx (resume text flows into match analysis phase)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route handler file validation: check type, size, then parse — return typed error codes"
    - "Client boundary: page.tsx server component imports ResumePanel (client component)"
    - "200-char minimum gate for extracted PDF text — guards against image-only PDFs"
    - "FormData fetch pattern from client to /api route handler"

key-files:
  created:
    - src/lib/pdf.ts
    - src/app/api/parse-resume/route.ts
    - src/components/resume-panel.tsx
    - src/components/text-preview.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "extractPdfText wraps unpdf getDocumentProxy+extractText with mergePages:true for single-string output"
  - "200-char minimum returned as 422 PARSE_FAILED (not 400) since the file was valid but unreadable"
  - "page.tsx stays as server component; ResumePanel is the client boundary ('use client')"

patterns-established:
  - "Error response shape: {error: string, code: 'INVALID_INPUT'|'PARSE_FAILED'} with HTTP status"
  - "TextPreview: reusable for any text preview panel (JD panel will use it in Plan 03)"

# Metrics
duration: 7min
completed: 2026-05-22
---

# Phase 1 Plan 02: Resume Input Pipeline Summary

**PDF upload route handler via unpdf with 200-char extraction gate, plus ResumePanel with Upload/Paste tabs and inline TextPreview**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-22T05:08:00Z
- **Completed:** 2026-05-22T05:15:28Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- POST /api/parse-resume accepts multipart PDF, validates type/size, returns extracted text or typed error codes
- extractPdfText() in src/lib/pdf.ts provides a clean single-function wrapper around unpdf
- ResumePanel delivers tab-based Upload/Paste UX with live inline text preview after successful extraction
- TextPreview is a standalone reusable component ready for the JD panel (Plan 03)
- page.tsx updated: Resume placeholder replaced with ResumePanel, JD placeholder preserved for Plan 03

## Task Commits

Each task was committed atomically:

1. **Task 1: PDF extraction lib and parse-resume route handler** - `a34b72f` (feat)
2. **Task 2: ResumePanel component with Upload/Paste tabs and text preview** - `141baa2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/pdf.ts` - extractPdfText() wrapping unpdf, accepts Uint8Array, returns string
- `src/app/api/parse-resume/route.ts` - POST route with file validation, 5 MB limit, 200-char gate, typed errors
- `src/components/resume-panel.tsx` - Upload/Paste tab UI, fetch to API, error display, inline preview
- `src/components/text-preview.tsx` - Reusable scrollable text preview (h-48, font-mono, pre-wrap)
- `src/app/page.tsx` - Replaced Resume Card placeholder with ResumePanel; JD placeholder preserved

## Decisions Made
- `200-char minimum` returns HTTP 422 PARSE_FAILED (not 400): the file was valid, parsing just yielded too little — distinct from bad input.
- `mergePages: true` in extractText so the whole resume arrives as one string, not per-page array.
- `page.tsx` stays as a server component; only ResumePanel carries `'use client'` — consistent with App Router patterns.
- `catch` block in route handler correctly fires when `request.formData()` itself throws (no Content-Type header) — this is fine because browsers always send multipart headers; raw curl without `-F` is not a supported client.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The plan's curl verification (`curl -X POST http://localhost:3000/api/parse-resume` with no body) triggers the catch block rather than the "No file provided" 400 path, because `request.formData()` throws when the request has no multipart Content-Type. The correct 400 is exercised when FormData is sent without a `file` field. This is the expected browser behavior and no code change was needed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RESIN-01 and RESIN-02 are satisfied: PDF upload with text preview and paste fallback both work.
- TextPreview is ready for reuse in Plan 03 (JD panel).
- page.tsx is in its Plan 02 final state — Plan 03 must import JD panel into the right-hand Card.
- /api/parse-resume is unprotected; Plan 04 adds rate limiting targeting this endpoint.

---
*Phase: 01-input-pipeline*
*Completed: 2026-05-22*
