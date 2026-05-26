---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: TBD
status: milestone_complete
stopped_at: v1.1 milestone archived — ready for v1.2 planning
last_updated: "2026-05-26T14:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# State: JobSeeker

**Last Updated:** 2026-05-26
**Session:** v1.1 milestone archived — ready for v1.2 planning

---

## Project Reference

**Core Value:** A job seeker pastes their resume and a JD and walks away with a smarter, tailored resume and a clear action plan to land the interview — and can return weeks later to revisit their analysis and prepare for interview calls.

**Architecture:** Next.js 16 App Router + TypeScript + Tailwind CSS v4 + shadcn/ui. All LLM calls via Route Handlers using Anthropic SDK directly. v1.1 adds better-auth (Google OAuth), Neon Postgres via @neondatabase/serverless, and Drizzle ORM. Deploy to Vercel.

**Current Focus:** v1.2 — TBD. Run `/gsd:new-milestone` to plan next milestone.

---

## Current Position

Milestone v1.1 archived. 5 phases (4–8), 19 plans executed and shipped. Ready for v1.2 planning.

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 1 — Input Pipeline | Users confirm resume and JD content is correctly captured | Complete |
| 2 — Match Analysis and Optimisation | Users see match score, action plan, keyword gaps, and rewritten sections | Complete |
| 3 — Interview Preparation | Users receive role-specific interview questions and prep strategy | Complete |
| 4 — Auth Foundation | Users can sign in with Google, stay signed in, and /history is protected | Complete |
| 5 — Database Schema and DAL | Neon Postgres provisioned, Drizzle schema migrated, DAL operational | Complete |
| 6 — Save After Analysis | Completed analysis is auto-saved; job title/company extracted; interview prep merged | Complete |
| 7 — History UI | Users can browse, view, update status, and re-run saved applications | Complete |
| 8 — History Enhancements | Inline editing, Edit-needed badge, inline interview prep, 401 redirect, save_error Alert | Complete |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 4/7 (v1.0 + Phase 4 complete) |
| Requirements implemented | 16/26 (v1.0 + AUTH-01 through AUTH-06) |
| Plans executed | 18 |

---
| Phase 07-history-ui P01 | 35 | 2 tasks | 5 files |
| Phase 07-history-ui P02 | 5min | 1 tasks | 1 files |

## Accumulated Context

### Key Decisions Made

| Decision | Outcome | Date |
|----------|---------|------|
| better-auth over next-auth | next-auth has blocking peer dep conflict with Next.js 16; better-auth 1.6.x is the current recommended replacement | 2026-05-25 |
| @neondatabase/serverless over @vercel/postgres | @vercel/postgres discontinued Dec 2024; Neon HTTP driver is stateless-correct for serverless | 2026-05-25 |
| JWT sessions (not DB sessions) | Single-user tool; no server-side revocation needed; avoids sessions table | 2026-05-25 |
| JSONB columns for analysis and interview data | Maps directly to existing Zod types; zero migration risk as prompts evolve | 2026-05-25 |
| verifySession() in route handlers (not auth() HOC) | auth() HOC wrapper breaks ReadableStream — documented in Auth.js issue #12485 | 2026-05-25 |
| proxy.ts replaces middleware.ts | Next.js 16 hard requirement; existing rate-limiting code moves there | 2026-05-25 |
| Metadata-only query for history list | Do not select resumeText, jdText, or full JSONB blobs in list query — performance constraint | 2026-05-25 |
| Auto-save on SSE completion | Save triggered automatically when analysis phase === 'done'; no explicit SaveButton | 2026-05-25 |
| Read-only components for history detail | AnalysisPanel is wired to live SSE; build separate display-only components for saved data | 2026-05-25 |
| Re-run via navigation (?applicationId=) | No new API surface; pre-populate existing page.tsx form state from DB values | 2026-05-25 |
| Progress bar dynamic width | Use inline style (style={{ width: score% }}) not dynamic Tailwind class — purged at build time | 2026-05-22 |
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
| AnalysisResult schema shape | Flat (<=3 nesting levels, no optional arrays), exactly 5 top-level fields: overallScore, components[], actionItems[], keywordGaps[], rewrites[] | 2026-05-22 |
| SYSTEM_PROMPT rubric encoding | Percentage values hardcoded as strings to prevent model renegotiation of scoring weights | 2026-05-22 |
| zodOutputFormat single arg | SDK helpers/zod zodOutputFormat takes one argument only — plan's second 'name' arg does not exist in API | 2026-05-22 |
| diff.tsx extension | Use .tsx not .ts for InlineDiff component — JSX requires .tsx; import path @/lib/diff unchanged | 2026-05-22 |
| SSE consumer JSON.parse | Wrap per-line JSON.parse in try/catch — malformed/partial lines silently skipped | 2026-05-22 |
| RewriteDiff undo pattern | Non-pending footer swaps callbacks: accepted renders "Undo Accept" calling onReject, rejected renders "Undo Reject" calling onAccept — no extra onUndo prop needed | 2026-05-22 |
| page.tsx client conversion | Converted page.tsx to 'use client' (simplest path) rather than a thin wrapper — acceptable since Phase 2 interactivity requires shared state | 2026-05-22 |
| Progress indeterminate | base-ui ProgressPrimitive.Root value={null} = indeterminate mode per its type definition | 2026-05-22 |

### Open Questions (from research)

1. **better-auth exact API surface at v1.6.x** — auth.api.getSession() is documented, but whether better-auth exposes a verifySession() convenience or requires manual wrapping in dal.ts should be verified against installed package TypeScript types at Phase 4.
2. **proxy.ts export syntax with better-auth** — better-auth uses toNextJsHandler(auth) for Route Handlers; the proxy export may differ from NextAuth's `export { auth as proxy }`. Verify at install time.
3. **JSONB score extraction for list view** — history list needs match score without deserializing full JSONB. Either extract score into a dedicated column during Phase 5 schema design, or use Drizzle JSONB expression. Decision at Phase 5.
4. **Snapshot save timing with partial interview data** — save payload schema must handle absent interview Q+A (user saved before running interview prep). interviewData is nullable JSONB — handle at Phase 6.
5. **Vercel tier** — Hobby has 10s timeout; streaming responses reset the clock. Confirm before deploying Phase 2 analysis endpoints.
6. **--legacy-peer-deps for better-auth install** — required due to packaging gap with Next.js 16 peer dep declaration. Cosmetic only — not a runtime issue. Apply at Phase 4 install.

### Critical Pitfalls to Watch

- **auth() HOC on SSE route handlers** — breaks ReadableStream (Auth.js issue #12485). Use verifySession() from dal.ts at handler body top. Affects /api/analyse, /api/interview-questions, /api/interview-critique.
- **@vercel/postgres / next-auth** — both wrong for this project. @vercel/postgres is discontinued. next-auth has blocking peer dep conflict with Next.js 16.
- **DB calls in proxy.ts** — proxy.ts runs on every request including static asset prefetches. Keep proxy.ts JWT-only; all real auth checks go through the DAL.
- **Duplicating AnalysisPanel on history detail page** — AnalysisPanel is wired to live SSE stream. Build separate display-only components for detail view.
- **History list query** — must NOT select resumeText, jdText, or full JSONB blobs. Metadata columns only.
- **DATABASE_URL vs DATABASE_URL_UNPOOLED** — use DATABASE_URL for app queries (Neon HTTP pooled); use DATABASE_URL_UNPOOLED for drizzle-kit migrations.
- Two-column PDF layouts produce garbled text — enforce parsed-text preview and 200-char minimum gate (Phase 1)
- Resume rewrites must be constrained to facts in the original — no hallucinated metrics (Phase 2)
- Match scores must use the defined rubric, not free-form model judgment (Phase 2)
- Streaming must be established in Phase 1 even for non-LLM endpoints — retrofitting is painful
- Prompt injection: wrap all user-supplied content in XML tags from the first LLM call (Phase 2)
- Rate limiting must be in place before any public link is shared (Phase 1)
- Use `unpdf` not raw `pdfjs-dist` — raw pdfjs-dist causes build failures in Next.js App Router
- Middleware runs in Edge Runtime — do not import Node.js-only modules (net, ioredis) in middleware.ts / proxy.ts
- Wave 2 plans 01-02 and 01-03 both modify page.tsx — 01-02 must finish before 01-03 begins

### Pending Todos

| Todo | Area | Created |
|------|------|---------|
| Review and polish UX with expert eye | ui | 2026-05-22 |

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-25:

| Category | Item | Status |
|----------|------|--------|
| todo | 2026-05-22-ux-review.md | pending — UX polish pass (layout, spacing, loading states, mobile, streaming feedback quality) |

### Blockers

None currently.

### Recent Activity

- 2026-05-26: Phase 8 complete. updateApplicationMeta DAL fn + PATCH /api/applications/[id]/metadata route; EditNeededBadge + EditableApplicationHeader (click-to-edit, auto-save, amber badge); InterviewPrepIsland (inline SSE on detail page); 401→/sign-in redirect + save_error Alert in both hooks. Build clean.
- 2026-05-25: Phase 4 complete. proxy.ts (Next.js 16 rename + /history guard), auth.ts (memory adapter + Google + email/password), dal.ts (verifySession), sign-in page, SSE route guards. AUTH-01 through AUTH-06 satisfied.
- 2026-05-25: v1.1 roadmap created. 4 phases (4–7), 16/16 v1.1 requirements mapped.
- 2026-05-25: Plan 03-05 complete. Phase 3 complete. AnalysisPanel gets optional onInterviewPrepReady CTA; page.tsx mounts InterviewPrepPanel behind showInterviewPrep gate. Full end-to-end interview prep flow connected. Build clean.
- 2026-05-22: Plan 02-06 complete. Phase 2 complete. AnalysisPanel wires useAnalysis into idle/streaming/done/error UI; page.tsx feeds panel onReady callbacks into shared state. Full end-to-end flow works. Build clean.
- 2026-05-22: Plan 02-05 complete. RewriteDiff controlled component: per-section diff card with Accept/Reject buttons, accepted/rejected badges, and undo support via callback swap.
- 2026-05-22: Plan 02-04 complete. Display components: ScoreCard (overall score + component breakdown with progress bars), ActionList (ranked items + impact badges), KeywordBadges (keyword gap badges with empty state).
- 2026-05-22: Plan 02-03 complete. Client data layer: InlineDiff component (src/lib/diff.tsx) using diffWords, useAnalysis hook (src/hooks/use-analysis.ts) with useReducer SSE consumer and per-rewrite accept/reject state.
- 2026-05-22: Plan 02-02 complete. Real Anthropic streaming route: client.messages.stream() with zodOutputFormat, callWithRetry (retry once at 6144 tokens), all errors as SSE error events, maxDuration=60 export.
- 2026-05-22: Plan 02-01 complete. Phase 2 Wave 1 foundation: @anthropic-ai/sdk + diff installed, AnalysisResultSchema + result SSE event, SYSTEM_PROMPT with locked rubric, buildUserPrompt(), progress/separator/scroll-area shadcn components.
- 2026-05-22: Plan 01-03 complete. JD panel live: URL fetch via /api/fetch-jd (cheerio, 8-domain blocklist, 10s timeout), paste fallback with TextPreview. Phase 1 complete.
- 2026-05-22: Plan 01-04 complete. SSE mock endpoint, Zod schemas, rate limiting middleware (20 req/min/IP), and wrapUserContent() sanitize helper all in place.
- 2026-05-22: Plan 01-02 complete. Resume panel live: PDF upload via /api/parse-resume, paste fallback, TextPreview component.
- 2026-05-22: Plan 01-01 complete. Next.js 16 scaffold live with shadcn/ui, all Phase 1 deps installed.
- 2026-05-22: Roadmap created. 3 phases, 10/10 v1 requirements mapped.
- 2026-05-21: Requirements defined (10 v1, 8 v2). Research completed.

---

## Session Continuity

**Last session:** 2026-05-26T14:00:00.000Z
**Stopped at:** v1.1 milestone archived — ROADMAP.md updated, PROJECT.md updated, REQUIREMENTS.md archived, git tag v1.1 created
**Resume file:** None

**Next action:** Run `/gsd:new-milestone` to plan v1.2

---

*State initialized: 2026-05-22*
