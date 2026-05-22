# State: JobSeeker

**Last Updated:** 2026-05-22
**Session:** Plan 01-03 executed (Phase 1 complete)

---

## Project Reference

**Core Value:** A job seeker pastes their resume and a JD and walks away with a smarter, tailored resume and a clear action plan to land the interview.

**Architecture:** Next.js 16 App Router + TypeScript + Tailwind CSS v4 + shadcn/ui. All LLM calls via Route Handlers using Anthropic SDK directly. Stateless v1 — no auth, no DB. Deploy to Vercel.

**Current Focus:** Phase 1 — Input Pipeline

---

## Current Position

| Field | Value |
|-------|-------|
| Current Phase | 1 — Input Pipeline |
| Current Plan | 01-03 complete (Phase 1 COMPLETE) |
| Phase Status | Phase 1 Complete |
| Overall Progress | 1/3 phases complete (4/4 plans in Phase 1 done) |

```
Phase 1 Plans: [01-01 ████] [01-02 ████] [01-03 ████] [01-04 ████]
Phase 2:       [  todo  ]
Phase 3:       [  todo  ]
```

---

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 — Input Pipeline | Users confirm resume and JD content is correctly captured | Complete |
| 2 — Match Analysis and Optimisation | Users see match score, action plan, keyword gaps, and rewritten sections | Not Started |
| 3 — Interview Preparation | Users receive role-specific interview questions and prep strategy | Not Started |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 1/3 |
| Requirements implemented | 2/10 (JDIN-01, JDIN-02) |
| Plans executed | 4 |

---

## Accumulated Context

### Key Decisions Made

| Decision | Outcome | Date |
|----------|---------|------|
| Stack | Next.js 16 App Router + TypeScript + Tailwind v4 + Anthropic SDK direct | 2026-05-21 |
| PDF parsing library | unpdf (wraps pdfjs-dist, avoids Next.js build failures) | 2026-05-21 |
| LLM call mechanism | Route Handlers with streaming (not Server Actions — 1 MB limit, no streaming) | 2026-05-21 |
| Stateless v1 | No auth, no DB persistence across sessions | 2026-05-21 |
| Score rubric | Required skills 40%, experience level 25%, domain match 20%, education 15% | 2026-05-21 |
| Session approach | UUID cookie (24hr TTL) for rate limiting identity and future account migration | 2026-05-22 |
| shadcn/ui preset | Radix/Nova (default non-interactive init — acceptable, consistent style) | 2026-05-22 |
| PDF error shape | {error, code} with 400/413/422; 200-char gate returns 422 PARSE_FAILED (not 400) | 2026-05-22 |
| Client boundary | page.tsx stays server component; ResumePanel carries 'use client' as the client boundary | 2026-05-22 |
| Zod v4 error API | Use .issues not .errors on ZodError — .errors doesn't exist in Zod v4 | 2026-05-22 |
| analyse route runtime | runtime = nodejs (not edge) for 60s SSE timeout headroom for Phase 2 LLM calls | 2026-05-22 |
| Upstash dynamic import | @upstash/ratelimit and @upstash/redis imported dynamically inside checkUpstash() to avoid Edge errors when env vars absent | 2026-05-22 |

### Open Questions (from research)

1. **Vercel tier** — Hobby has 10s timeout; streaming responses reset the clock. Confirm before deploying Phase 2 analysis endpoints.
2. **Anonymous session IDs** — Pure stateless vs lightweight UUID cookie (24hr TTL) for incremental migration path to accounts. Decide before Phase 1 ships.
3. **Claude model IDs** — Run `npx @anthropic-ai/sdk list-models` before writing any prompts. Use dated model IDs in production, not aliases.
4. **JD URL scraping scope** — Define which job board formats (Greenhouse, Lever, Workday) are "supported" before Phase 1 ships. LinkedIn/Indeed require headless browsers — explicitly out of scope.
5. **Resume test corpus** — Validate parsing against at least 10 real-world formats (single-column Word, two-column PDF, Canva export, image-PDF, DOCX with text boxes) before public exposure.

### Critical Pitfalls to Watch

- Two-column PDF layouts produce garbled text — enforce parsed-text preview and 200-char minimum gate (Phase 1)
- Resume rewrites must be constrained to facts in the original — no hallucinated metrics (Phase 2)
- Match scores must use the defined rubric, not free-form model judgment (Phase 2)
- Streaming must be established in Phase 1 even for non-LLM endpoints — retrofitting is painful
- Prompt injection: wrap all user-supplied content in XML tags from the first LLM call (Phase 2)
- Rate limiting must be in place before any public link is shared (Phase 1)
- Use `unpdf` not raw `pdfjs-dist` — raw pdfjs-dist causes build failures in Next.js App Router
- Middleware runs in Edge Runtime — do not import Node.js-only modules (net, ioredis) in middleware.ts
- Wave 2 plans 01-02 and 01-03 both modify page.tsx — 01-02 must finish before 01-03 begins

### Blockers

None currently.

### Recent Activity

- 2026-05-22: Plan 01-03 complete. JD panel live: URL fetch via /api/fetch-jd (cheerio, 8-domain blocklist, 10s timeout), paste fallback with TextPreview. Phase 1 complete.
- 2026-05-22: Plan 01-04 complete. SSE mock endpoint, Zod schemas, rate limiting middleware (20 req/min/IP), and wrapUserContent() sanitize helper all in place.
- 2026-05-22: Plan 01-02 complete. Resume panel live: PDF upload via /api/parse-resume, paste fallback, TextPreview component.
- 2026-05-22: Plan 01-01 complete. Next.js 16 scaffold live with shadcn/ui, all Phase 1 deps installed.
- 2026-05-22: Roadmap created. 3 phases, 10/10 v1 requirements mapped.
- 2026-05-21: Requirements defined (10 v1, 8 v2). Research completed.

---

## Session Continuity

**Last session:** 2026-05-22T05:21:41Z
**Stopped at:** Completed 01-03-PLAN.md (JD panel, URL scraper, fetch-jd route) — Phase 1 complete
**Resume file:** None

**Next action:** Phase 2 — Match Analysis and Optimisation. Both input panels are live and provide `onReady` callbacks for wiring into shared state.

---

*State initialized: 2026-05-22*
