# JobSeeker

## What This Is

A web application that helps job seekers analyse a job description against their resume, receive a match score with actionable improvements, get AI-rewritten resume sections to review and accept, and prepare for interviews with role-specific questions and coaching — all in a single stateless session with no account required.

## Core Value

A job seeker pastes their resume and a JD and walks away with a smarter, tailored resume and a clear action plan to land the interview.

## Current State

**v1.0 shipped 2026-05-25.** Stateless single-session tool. No auth, no DB.

Tech stack: Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui. Anthropic SDK direct (claude-sonnet-4-6 + claude-haiku-4-5-20251001). Deployed to Vercel (not yet configured).

~2,700 LOC TypeScript across 15 plans, 3 phases. Build clean. Zero type errors.

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

### Active (v1.1 candidates)

- [ ] UX polish pass — spacing, mobile layout, streaming feedback quality, accept/reject interaction refinement
- [ ] Vercel deployment and production configuration (ANTHROPIC_API_KEY, rate limiting, environment)
- [ ] End-to-end testing with real resume + JD pairs across diverse formats
- [ ] Resume test corpus validation (single-column Word, two-column PDF, Canva export, DOCX with text boxes)

### v2 Requirements

- **OPT-V2-01**: Bullet-level rewrite suggestions with old vs new diff view and accept/reject per bullet
- **OPT-V2-02**: Full tailored resume version generated as a single document
- **MATCH-V2-01**: Side-by-side JD requirements vs resume evidence mapping (gap visualisation)
- **INTV-V2-01**: Resume-grounded answer coaching — suggested answers drawn from the user's own experience
- **INTV-V2-02**: Mock Q&A practice mode — interactive back-and-forth with feedback on user answers
- **RESIN-V2-01**: Upload Word (.docx) resume in addition to PDF

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

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 16 App Router | Streaming-first; RSC; Vercel-native | ✓ Correct — no issues |
| Route Handlers not Server Actions | Server Actions: 1 MB limit, no streaming | ✓ Correct — SSE works cleanly |
| unpdf (not raw pdfjs-dist) | Raw pdfjs-dist causes Next.js build failures | ✓ Correct — no build issues |
| Stateless v1 — no auth, no DB | Validates demand before adding auth complexity | ✓ Correct — demo-quality feel |
| Score rubric hardcoded in system prompt | Prevents model renegotiation of scoring weights | ✓ Correct — consistent scores |
| zodOutputFormat single-arg | SDK helper takes one arg only — plan's second 'name' arg doesn't exist | ✓ Fixed during execution |
| Zod v4 .issues not .errors | .errors doesn't exist in Zod v4 | ✓ Caught in research |
| runtime = nodejs (not edge) | Edge runtime: 30s timeout; Node.js: 60s — needed for LLM streaming | ✓ Correct |
| UUID cookie for rate limiting | 24hr TTL — stateless rate limit + migration path to accounts | ✓ Correct |
| Upstash dynamic import | Avoids Edge errors when env vars absent at init | ✓ Correct |
| Inline style for progress bar width | Dynamic Tailwind classes purged at build time | ✓ Caught during execution |
| diff.tsx extension (not .ts) | JSX requires .tsx; import path unchanged | ✓ Caught during execution |
| page.tsx as 'use client' | Simplest path for shared state across Phase 2 interactive components | ✓ Acceptable tradeoff |
| claude-sonnet-4-6 for question generation | Sonnet-tier needed for JD-grounded structured output | ✓ Correct |
| claude-haiku-4-5-20251001 for critique | Haiku-tier sufficient for free-text coaching; cheaper | ✓ Correct |
| rationale field in InterviewQuestionSchema | Primary enforcement mechanism for JD grounding — forces model to justify each question | ✓ Correct |
| submitCritique(index, draftAnswer) parameter | Avoids stale closure reading state.questions[i].draftAnswer | ✓ Correct |

## Constraints

- **Scope**: Stateless v1 — no login, no persistence across sessions
- **AI dependency**: Claude API is the core engine for analysis, rewriting, and coaching
- **Audience**: Demo quality must be high enough to impress; not throwaway prototype
- **Cost**: Haiku for coaching (cheap), Sonnet for structured analysis and questions (accurate)

---
*Last updated: 2026-05-25 after v1.0 milestone*
