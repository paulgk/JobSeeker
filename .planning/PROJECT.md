# JobSeeker

## Current State: v1.1 SHIPPED — 2026-05-26

**v1.1 shipped.** Google-authenticated app with persistent analysis history. Users sign in with Google OAuth or email/password, run analysis, and all results are auto-saved to a Neon Postgres database. Users can browse history, update application status, view saved analysis read-only, edit company/role inline, trigger interview prep from the detail page, and re-run analysis from any saved application.

Tech stack: Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui. Anthropic SDK direct (claude-sonnet-4-6 + claude-haiku-4-5-20251001). better-auth 1.6.11. Neon Postgres + Drizzle ORM. Deployed to Vercel (not yet configured).

~4,500 LOC TypeScript across 34 plans, 8 phases. Build clean. Zero type errors.

## Next Milestone Goals

Define with `/gsd:new-milestone`. Likely candidates from backlog:

- UX polish pass (deferred from v1.1) — layout, spacing, mobile, loading states, streaming feedback quality
- Delete application from history (HIST-V2-03)
- Notes field per application (HIST-V2-02)
- Score trend chart (HIST-V2-01)

---

## What This Is

A web application that helps job seekers analyse a job description against their resume, receive a match score with actionable improvements, get AI-rewritten resume sections to review and accept, and prepare for interviews with role-specific questions and coaching — all backed by persistent history so users can return weeks later.

## Core Value

A job seeker pastes their resume and a JD and walks away with a smarter, tailored resume and a clear action plan to land the interview — and can return weeks later to revisit their analysis and prepare for interview calls.

## Requirements

### Validated (v1.0)

- ✓ User can upload a PDF resume and see a preview of the parsed text before analysis — v1.0
- ✓ User can paste resume text directly as a fallback or primary input method — v1.0
- ✓ User can paste a job description as text — v1.0
- ✓ User can provide a URL and the app fetches and extracts the JD text (best-effort; graceful error on JS-rendered or blocked pages) — v1.0
- ✓ App produces a match score (0–100%) based on a consistent rubric comparing resume to JD — v1.0
- ✓ App produces a prioritised action item list ranked by impact on the match score — v1.0
- ✓ App generates a keyword suggestion list drawn from the JD and absent from the resume — v1.0
- ✓ App rewrites one or more resume sections to better match the JD, with user review before accepting — v1.0
- ✓ App generates JD-specific interview questions tailored to the role's requirements — v1.0
- ✓ App provides interview tips and preparation strategy tailored to this role type — v1.0

### Validated (v1.1)

- ✓ AUTH-01: Google OAuth sign-in — v1.1
- ✓ AUTH-02: Email/password sign-in and registration — v1.1
- ✓ AUTH-03: Sign out — v1.1
- ✓ AUTH-04: /history requires authentication — v1.1
- ✓ AUTH-05: Analysis requires authentication — v1.1
- ✓ AUTH-06: Session persists across browser refresh — v1.1
- ✓ DATA-01: Neon Postgres + Drizzle ORM — v1.1
- ✓ DATA-02: Schema covers users, applications, analysis/interview JSONB — v1.1
- ✓ DATA-03: Resume text and JD text stored per record for re-run — v1.1
- ✓ SAVE-01: Analysis auto-saved on SSE completion — v1.1
- ✓ SAVE-02: Job title and company auto-extracted and stored — v1.1
- ✓ SAVE-03: Interview prep merged into same application record — v1.1
- ✓ HIST-01: History list with company, role, score, status, date — v1.1
- ✓ HIST-02: Status update (Saved/Applied/Interviewing/Offer/Rejected) — v1.1
- ✓ HIST-03: Detail page with read-only analysis — v1.1
- ✓ HIST-04: Saved interview Q+A visible on detail page — v1.1
- ✓ HIST-05: Re-run from saved application — v1.1
- ✓ HIST-EDIT-01: Inline company name editing on detail page — v1.1
- ✓ HIST-EDIT-02: Inline job title editing on detail page — v1.1
- ✓ HIST-INTV-01: Inline interview prep trigger from detail page — v1.1
- ✓ HIST-WORKFLOW-01: Expired session → /sign-in redirect — v1.1
- ✓ HIST-WORKFLOW-02: Save failure visible as Alert (not console.warn) — v1.1

### Active (v1.2 — TBD)

*Define with `/gsd:new-milestone`*

### v2 Requirements

- **OPT-V2-01**: Bullet-level rewrite suggestions with old vs new diff view and accept/reject per bullet
- **OPT-V2-02**: Full tailored resume version generated as a single document
- **MATCH-V2-01**: Side-by-side JD requirements vs resume evidence mapping (gap visualisation)
- **INTV-V2-01**: Resume-grounded answer coaching — suggested answers drawn from the user's own experience
- **INTV-V2-02**: Mock Q&A practice mode — interactive back-and-forth with feedback on user answers
- **RESIN-V2-01**: Upload Word (.docx) resume in addition to PDF
- **HIST-V2-01**: Score trend chart per application
- **HIST-V2-02**: Notes field per application
- **HIST-V2-03**: Delete saved application from history

### Out of Scope

| Feature | Reason |
|---------|--------|
| In-app resume builder (structured editor) | Scope explosion; commodity space; upload-first is faster to value |
| Forced account creation | Kills demo flow; stateless v1 confirmed |
| LinkedIn / Indeed URL scraping | Requires headless browser infra; negative ROI for v1 |
| Billing / payments | Not needed until community/coaching features land |
| Mobile app | Web-first; mobile later |
| ATS submission | Out of scope; separate product domain |
| Keyword stuffing mode | Anti-feature; backfires with modern screening systems |
| Shared analysis links | Requires signed URL or public access control — v2+ |
| Kanban board view | List + status badges is sufficient for v1.x |
| Multiple resume versions per application | Adds schema complexity without core value in v1.x |
| Export to PDF / download | Deferred; not part of history use-case |

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 16 App Router | Streaming-first; RSC; Vercel-native | ✓ Correct — no issues |
| Route Handlers not Server Actions | Server Actions: 1 MB limit, no streaming | ✓ Correct — SSE works cleanly |
| unpdf (not raw pdfjs-dist) | Raw pdfjs-dist causes Next.js build failures | ✓ Correct — no build issues |
| Stateless v1 — no auth, no DB | Validates demand before adding auth complexity | ✓ Correct — clean migration |
| Score rubric hardcoded in system prompt | Prevents model renegotiation of scoring weights | ✓ Correct — consistent scores |
| zodOutputFormat single-arg | SDK helper takes one arg only | ✓ Fixed during execution |
| Zod v4 .issues not .errors | .errors doesn't exist in Zod v4 | ✓ Caught in research |
| runtime = nodejs (not edge) | Edge runtime: 30s timeout; Node.js: 60s — needed for LLM streaming | ✓ Correct |
| UUID cookie for rate limiting | 24hr TTL — stateless rate limit + migration path to accounts | ✓ Correct |
| Upstash dynamic import | Avoids Edge errors when env vars absent at init | ✓ Correct |
| Inline style for progress bar width | Dynamic Tailwind classes purged at build time | ✓ Caught during execution |
| page.tsx as 'use client' | Simplest path for shared state across Phase 2 interactive components | ✓ Acceptable tradeoff |
| claude-sonnet-4-6 for question generation | Sonnet-tier needed for JD-grounded structured output | ✓ Correct |
| claude-haiku-4-5-20251001 for critique | Haiku-tier sufficient for free-text coaching; cheaper | ✓ Correct |
| better-auth over next-auth | next-auth has blocking peer dep conflict with Next.js 16 | ✓ Correct |
| @neondatabase/serverless | @vercel/postgres discontinued Dec 2024; Neon HTTP stateless-correct | ✓ Correct |
| JWT sessions (not DB sessions) | Single-user tool; no server-side revocation needed | ✓ Correct |
| JSONB for analysis/interview data | Maps to existing Zod types; zero migration risk as prompts evolve | ✓ Correct |
| verifySession() inline (not HOC wrapper) | HOC breaks ReadableStream (Auth.js #12485) | ✓ Critical catch |
| proxy.ts replaces middleware.ts | Next.js 16 hard requirement | ✓ Correct |
| window.location.href for 401 redirect | SSE hooks have no router instance; hard navigation is correct | ✓ Correct |

## Constraints

- **AI dependency**: Claude API is the core engine for analysis, rewriting, and coaching
- **Audience**: Demo quality must be high enough to impress; not throwaway prototype
- **Cost**: Haiku for coaching (cheap), Sonnet for structured analysis and questions (accurate)
- **UI/UX**: All frontend design work via the impeccable skill

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Current State

---
*Last updated: 2026-05-26 — v1.1 shipped*
