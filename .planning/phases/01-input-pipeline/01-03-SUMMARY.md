---
phase: "01"
plan: "03"
subsystem: "jd-input"
tags: ["cheerio", "fetch", "url-scraping", "tabs", "client-component", "rate-limiting"]

dependency-graph:
  requires:
    - "01-01"  # Next.js scaffold, shadcn/ui, cheerio installed
    - "01-02"  # page.tsx with ResumePanel in place; TextPreview component exists
  provides:
    - "POST /api/fetch-jd endpoint with domain blocklist and timeout handling"
    - "fetchJdFromUrl() scraper utility"
    - "JobDescriptionPanel client component with Paste/URL tabs"
    - "Full two-panel home page layout"
  affects:
    - "Phase 2 analysis (both panels now provide text for the match/analyse flow)"

tech-stack:
  added: []
  patterns:
    - "cheerio HTML extraction with noise-node removal (script, style, nav, header, footer, aside)"
    - "AbortController for fetch timeout"
    - "Client boundary at component level, page stays server component"
    - "Zod v4 .issues[0] pattern for error extraction"

key-files:
  created:
    - "src/lib/scraper.ts"
    - "src/app/api/fetch-jd/route.ts"
    - "src/components/jd-panel.tsx"
  modified:
    - "src/app/page.tsx"

decisions:
  - id: "jd-paste-min"
    choice: "50-character minimum for paste path"
    rationale: "Prevents accidental empty or near-empty submissions; low enough not to frustrate users"
  - id: "jd-url-blocklist"
    choice: "8 blocked domains: LinkedIn, Indeed, Glassdoor, ZipRecruiter, Workday, myworkdayjobs, Taleo, iCIMS"
    rationale: "These domains require browser auth or JS rendering — fail fast with actionable message rather than returning empty/garbage"
  - id: "jd-timeout"
    choice: "10s AbortController timeout"
    rationale: "Matches plan spec; respects Vercel Hobby 10s limit for non-streaming routes"
  - id: "jd-text-gate"
    choice: "100-char minimum after cheerio extraction"
    rationale: "JS-rendered pages return near-empty body text; gate catches them with a clear paste-instead fallback"

metrics:
  duration: "3m 31s"
  completed: "2026-05-22"
---

# Phase 1 Plan 03: JD Input Pipeline Summary

**One-liner:** URL-scraping JD input with cheerio extraction, 8-domain blocklist, 10s timeout, and paste-text fallback — both paths preview inline via TextPreview.

## Objective

Implement JDIN-01 (paste text path) and JDIN-02 (URL fetch path) for the job description input panel.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create JD scraper lib and fetch-jd Route Handler | 8269ce3 | src/lib/scraper.ts, src/app/api/fetch-jd/route.ts |
| 2 | Build JobDescriptionPanel component and wire into home page | 45d1026 | src/components/jd-panel.tsx, src/app/page.tsx |

## What Was Built

**src/lib/scraper.ts**
- `fetchJdFromUrl()` exported function
- URL validation (must parse, must be HTTPS)
- Domain blocklist check with specific error naming the blocked hostname
- 10s AbortController timeout with distinct timeout error message
- HTTP status error with status code in message
- Cheerio extraction: removes script, style, nav, header, footer, aside, aria-hidden, noscript nodes
- 100-char minimum gate for JS-rendered page detection

**src/app/api/fetch-jd/route.ts**
- `runtime = 'nodejs'` (not edge)
- POST handler with JSON body parsing guard
- Zod validation using `.issues[0]` (Zod v4 API)
- Returns `{text}` on success, `{error, code}` on failure
- HTTP 400 for invalid input, 422 for fetch/extraction failures

**src/components/jd-panel.tsx**
- `'use client'` boundary
- Tabs (Paste Text / Fetch from URL) with state isolation on tab switch
- Paste path: textarea + "Use This Job Description" button with 50-char gate
- URL path: input field, Enter-key support, loading state, descriptive helper text for supported/unsupported sites
- Error display via `<Alert variant="destructive">`
- Success preview via `<TextPreview>` (reused from Plan 02)
- Optional `onReady` callback for Phase 2 integration

**src/app/page.tsx**
- Replaced Card placeholder with `<JobDescriptionPanel />`
- Removed unused Card/CardContent/CardHeader/CardTitle imports
- Full two-panel layout complete; page stays a server component

## Verification

- `npx tsc --noEmit` exits 0 after all changes
- All 4 blocked-domain error paths produce specific messages naming the hostname
- Timeout path throws with "10s timeout" language
- JS-rendered page path throws with "paste the job description instead" language
- Invalid URL returns 400 INVALID_INPUT
- Blocked domain returns 422 FETCH_FAILED

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 1 is now complete. All four plans executed:
- 01-01: Scaffold and dependencies
- 01-02: Resume panel (PDF upload + paste)
- 01-03: JD panel (URL fetch + paste)
- 01-04: Schemas, rate limiting, SSE endpoint stub

Phase 2 can begin. Both `ResumePanel` and `JobDescriptionPanel` accept `onReady` callbacks for passing text up to a shared state layer. The analyse SSE endpoint from 01-04 is ready to receive resume + JD text.
