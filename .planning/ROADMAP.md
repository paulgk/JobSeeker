# Roadmap: JobSeeker

**Created:** 2026-05-22
**Last Updated:** 2026-05-26

## Milestones

- ✅ **v1.0 MVP** — 3 phases, 15 plans (shipped 2026-05-25) → [Archive](.planning/milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Persistence & History** — 5 phases (Phases 4–8), 19 plans (shipped 2026-05-26) → [Archive](.planning/milestones/v1.1-ROADMAP.md)

---

## Phases

<details>
<summary>✅ v1.0 MVP — SHIPPED 2026-05-25</summary>

### Phase 1 — Input Pipeline

**Goal:** Users can get their resume and a job description into the system and confirm the content is correct before any analysis runs.

**Requirements:** RESIN-01, RESIN-02, JDIN-01, JDIN-02

**Plans:**

- [x] 01-01-PLAN.md — Project scaffold: Next.js 16, Tailwind v4, shadcn/ui, two-panel home page skeleton
- [x] 01-02-PLAN.md — Resume input: PDF upload route handler (unpdf), paste textarea, text preview UI
- [x] 01-03-PLAN.md — JD input: paste textarea, URL fetch route handler (cheerio), error handling, preview UI
- [x] 01-04-PLAN.md — Infrastructure patterns: SSE mock endpoint, Zod schemas, rate limiting middleware, XML sanitize helper

---

### Phase 2 — Match Analysis and Resume Optimisation

**Goal:** Users receive a clear match score with rationale, a prioritised list of improvements, keyword gap suggestions, and AI-rewritten resume sections they can review and accept.

**Requirements:** MATCH-01, MATCH-02, OPT-01, OPT-02

**Plans:**

- [x] 02-01-PLAN.md — Foundation: install SDK/diff/shadcn, extend schemas, analysis-prompt.ts
- [x] 02-02-PLAN.md — Analyse route: real Anthropic streaming + structured output + retry-once
- [x] 02-03-PLAN.md — Client data layer: InlineDiff utility + useAnalysis SSE hook with accept/reject reducer
- [x] 02-04-PLAN.md — Display components: ScoreCard, ActionList, KeywordBadges
- [x] 02-05-PLAN.md — Rewrite diff: before/after diff with per-section accept/reject
- [x] 02-06-PLAN.md — Integration: AnalysisPanel + page.tsx wiring, end-to-end streamed flow

---

### Phase 3 — Interview Preparation

**Goal:** Users receive a set of interview questions specific to the role they applied for and a tailored preparation strategy that reflects this role type.

**Requirements:** INTV-01, INTV-02

**Plans:**

- [x] 03-01-PLAN.md — Foundation: interview schemas, interview-prompt.ts with system prompts and builders
- [x] 03-02-PLAN.md — API routes: interview-questions/route.ts (Sonnet) + interview-critique/route.ts (Haiku)
- [x] 03-03-PLAN.md — Client data layer: use-interview-prep.ts hook with full 10-action reducer
- [x] 03-04-PLAN.md — Display components: InterviewPrepPanel (phase-gated orchestrator) + QuestionCard
- [x] 03-05-PLAN.md — Integration: AnalysisPanel callback + page.tsx showInterviewPrep wiring

</details>

---

<details>
<summary>✅ v1.1 Persistence & History — SHIPPED 2026-05-26</summary>

### Phase 4 — Auth Foundation

**Goal:** Users can sign in with Google OAuth or email/password, stay signed in across sessions, and are blocked from /history without authentication.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Plans:**

- [x] 04-01-PLAN.md — Auth infrastructure: proxy.ts rename + session guard, auth.ts (memory adapter), auth-client.ts, dal.ts, catch-all route, .env.example
- [x] 04-02-PLAN.md — Sign-in page: impeccable design + shadcn/ui implementation (email/password tabs + Google OAuth button)
- [x] 04-03-PLAN.md — SSE auth guards: verifySession() added to analyse, interview-questions, interview-critique route handlers

---

### Phase 5 — Database Schema and DAL

**Goal:** A Neon Postgres database is provisioned, migrated, and accessible through a Data Access Layer that all subsequent phases consume.

**Requirements:** DATA-01, DATA-02, DATA-03

**Plans:**

- [x] 05-01-PLAN.md — Schema foundation: db/schema.ts (applications + better-auth tables), db/index.ts (neon-http client), drizzle.config.ts, .env.example placeholders
- [x] 05-02-PLAN.md — Provision Neon + run migration: human checkpoint for credentials, drizzle-kit generate + migrate, live-DB verification
- [x] 05-03-PLAN.md — Adapter swap + DAL: memoryAdapter → drizzleAdapter in auth.ts, four typed CRUD functions in dal.ts with IDOR guards

---

### Phase 6 — Save After Analysis

**Goal:** Every completed analysis is automatically persisted to the database under the authenticated user's account.

**Requirements:** SAVE-01, SAVE-02, SAVE-03

**Plans:**

- [x] 06-01-PLAN.md — DAL + schemas + extraction helper: updateInterviewData() in dal.ts, save_error/applicationId schema extensions, new src/lib/extract-job-meta.ts
- [x] 06-02-PLAN.md — Auth guard upgrade: capture userId from verifySession() in analyse and interview-questions routes; confirm critique route guard
- [x] 06-03-PLAN.md — Analyse route save logic: extractJobMeta() + saveApplication() + applicationId in result event + save_error non-fatal path
- [x] 06-04-PLAN.md — Client threading: use-analysis captures applicationId, AnalysisPanel onSaved/onAnalysisStart, page.tsx savedApplicationId state, InterviewPrepPanel prop, use-interview-prep fetch body
- [x] 06-05-PLAN.md — Interview save: interview-questions route calls updateInterviewData() after result; full TypeScript verification

---

### Phase 7 — History UI

**Goal:** Users can browse their saved applications, update application status, view the full saved analysis, and re-run analysis from any saved application.

**Requirements:** HIST-01, HIST-02, HIST-03, HIST-04, HIST-05

**Plans:**

- [x] 07-01-PLAN.md — /history list page + AuthHeader + StatusSelect + shadcn select + DAL newest-first ordering
- [x] 07-02-PLAN.md — PATCH /api/applications/[id]/status route (enum validation + DAL IDOR guard)
- [x] 07-03-PLAN.md — Read-only display components (ScoreCardDisplay, ActionListDisplay, KeywordBadgesDisplay re-exports; RewriteDiffReadOnly and QuestionCardDisplay stripped of streaming/interactive code)
- [x] 07-04-PLAN.md — /history/[id] detail page (Tabs + read-only panels), GET /api/applications/[id]/prefill, ResumePanel/JobDescriptionPanel initialValue prop, home page searchParams + use() + prefill fetch for Re-run

---

### Phase 8 — History Enhancements

**Goal:** Polish history UI with inline editing, inline interview prep trigger, and workflow bug fixes.

**Requirements:** HIST-EDIT-01, HIST-EDIT-02, HIST-INTV-01, HIST-WORKFLOW-01, HIST-WORKFLOW-02

**Plans:**

- [x] 08-01-PLAN.md — Metadata edit backend: updateApplicationMeta() DAL function + PATCH /api/applications/[id]/metadata route
- [x] 08-02-PLAN.md — Inline editing UI: EditableApplicationHeader (click-to-edit, auto-save), EditNeededBadge (amber), history list badge rendering
- [x] 08-03-PLAN.md — InterviewPrepIsland: inline SSE interview prep from detail page, replaces "Go back" link empty state
- [x] 08-04-PLAN.md — Workflow fixes: 401→/sign-in redirect in both SSE hooks, save_error Alert in AnalysisPanel

</details>

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1 — Input Pipeline | v1.0 | 4/4 | ✅ Complete | 2026-05-22 |
| 2 — Match Analysis and Resume Optimisation | v1.0 | 6/6 | ✅ Complete | 2026-05-22 |
| 3 — Interview Preparation | v1.0 | 5/5 | ✅ Complete | 2026-05-25 |
| 4 — Auth Foundation | v1.1 | 3/3 | ✅ Complete | 2026-05-25 |
| 5 — Database Schema and DAL | v1.1 | 3/3 | ✅ Complete | 2026-05-26 |
| 6 — Save After Analysis | v1.1 | 5/5 | ✅ Complete | 2026-05-26 |
| 7 — History UI | v1.1 | 4/4 | ✅ Complete | 2026-05-26 |
| 8 — History Enhancements | v1.1 | 4/4 | ✅ Complete | 2026-05-26 |

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| RESIN-01 | Phase 1 | ✅ v1.0 |
| RESIN-02 | Phase 1 | ✅ v1.0 |
| JDIN-01 | Phase 1 | ✅ v1.0 |
| JDIN-02 | Phase 1 | ✅ v1.0 |
| MATCH-01 | Phase 2 | ✅ v1.0 |
| MATCH-02 | Phase 2 | ✅ v1.0 |
| OPT-01 | Phase 2 | ✅ v1.0 |
| OPT-02 | Phase 2 | ✅ v1.0 |
| INTV-01 | Phase 3 | ✅ v1.0 |
| INTV-02 | Phase 3 | ✅ v1.0 |
| AUTH-01 | Phase 4 | ✅ v1.1 |
| AUTH-02 | Phase 4 | ✅ v1.1 |
| AUTH-03 | Phase 4 | ✅ v1.1 |
| AUTH-04 | Phase 4 | ✅ v1.1 |
| AUTH-05 | Phase 4 | ✅ v1.1 |
| AUTH-06 | Phase 4 | ✅ v1.1 |
| DATA-01 | Phase 5 | ✅ v1.1 |
| DATA-02 | Phase 5 | ✅ v1.1 |
| DATA-03 | Phase 5 | ✅ v1.1 |
| SAVE-01 | Phase 6 | ✅ v1.1 |
| SAVE-02 | Phase 6 | ✅ v1.1 |
| SAVE-03 | Phase 6 | ✅ v1.1 |
| HIST-01 | Phase 7 | ✅ v1.1 |
| HIST-02 | Phase 7 | ✅ v1.1 |
| HIST-03 | Phase 7 | ✅ v1.1 |
| HIST-04 | Phase 7 | ✅ v1.1 |
| HIST-05 | Phase 7 | ✅ v1.1 |
| HIST-EDIT-01 | Phase 8 | ✅ v1.1 |
| HIST-EDIT-02 | Phase 8 | ✅ v1.1 |
| HIST-INTV-01 | Phase 8 | ✅ v1.1 |
| HIST-WORKFLOW-01 | Phase 8 | ✅ v1.1 |
| HIST-WORKFLOW-02 | Phase 8 | ✅ v1.1 |

**v1.0 requirements: 10 total. Covered: 10. Orphans: 0.**
**v1.1 requirements: 22 total (17 planned + 5 Phase 8 bonus). Covered: 22. Orphans: 0.**

---

*Created: 2026-05-22 | Last updated: 2026-05-26 — v1.1 complete, Phase 8 bonus scope added*
