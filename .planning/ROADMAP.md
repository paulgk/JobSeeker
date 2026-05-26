# Roadmap: JobSeeker

**Created:** 2026-05-22
**Last Updated:** 2026-05-26

## Milestones

- ✅ **v1.0 MVP** — 3 phases, 15 plans (shipped 2026-05-25) → [Archive](.planning/milestones/v1.0-ROADMAP.md)
- 🔄 **v1.1 Persistence & History** — 4 phases (Phases 4–7)

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

## v1.1 Persistence & History

- [ ] **Phase 4: Auth Foundation** — Google OAuth + email/password via better-auth, proxy.ts rename, session cookie, userId in server context, /history route protected
- [ ] **Phase 5: Database Schema and DAL** — Neon Postgres provisioned, Drizzle schema (users/applications/snapshots with JSONB), dal.ts with all CRUD operations
- [ ] **Phase 6: Save After Analysis** — Auth guards on route handlers via verifySession(), /api/save endpoint, auto-save trigger after SSE completes, job title/company auto-extraction
- [ ] **Phase 7: History UI** — /history list page (metadata only), /history/[id] detail page (read-only panels), status PATCH endpoint, re-run navigation, AuthHeader component

---

## Phase Details

### Phase 4: Auth Foundation

**Goal**: Users can sign in with Google OAuth or email/password, stay signed in across sessions, and are blocked from /history without authentication
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):

  1. User can click "Sign in with Google", complete the OAuth flow, and land back in the app as an authenticated user
  2. User can register with email + password and sign in with those credentials on subsequent visits
  3. User can sign out and is returned to a signed-out state
  4. Unauthenticated user navigating to /history is redirected to the sign-in page
  5. Authenticated user session survives a browser refresh without re-authenticating
  6. Analysis run is blocked (returns 401) when the request carries no valid session

**Plans**: 3 plans
Plans:

- [x] 04-01-PLAN.md — Auth infrastructure: proxy.ts rename + session guard, auth.ts (memory adapter), auth-client.ts, dal.ts, catch-all route, .env.example
- [ ] 04-02-PLAN.md — Sign-in page: impeccable design + shadcn/ui implementation (email/password tabs + Google OAuth button)
- [x] 04-03-PLAN.md — SSE auth guards: verifySession() added to analyse, interview-questions, interview-critique route handlers

**UI hint**: yes

---

### Phase 5: Database Schema and DAL

**Goal**: A Neon Postgres database is provisioned, migrated, and accessible through a Data Access Layer that all subsequent phases consume
**Depends on**: Phase 4
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):

  1. Running `drizzle-kit migrate` against DATABASE_URL_UNPOOLED applies the schema with no errors
  2. dal.ts functions (verifySession, getApplications, getApplicationById, saveSnapshot, updateStatus) are importable and type-safe against the Drizzle schema
  3. The schema stores resume text and JD text per snapshot row (required for re-run in Phase 7)
  4. The applications table schema supports all five status values (Saved, Applied, Interviewing, Offer, Rejected)

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Schema foundation: db/schema.ts (applications + better-auth tables), db/index.ts (neon-http client), drizzle.config.ts, .env.example placeholders

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 05-02-PLAN.md — Provision Neon + run migration: human checkpoint for credentials, drizzle-kit generate + migrate, live-DB verification
- [ ] 05-03-PLAN.md — Adapter swap + DAL: memoryAdapter → drizzleAdapter in auth.ts, four typed CRUD functions in dal.ts with IDOR guards

---

### Phase 6: Save After Analysis

**Goal**: Every completed analysis is automatically persisted to the database under the authenticated user's account
**Depends on**: Phase 5
**Requirements**: SAVE-01, SAVE-02, SAVE-03
**Success Criteria** (what must be TRUE):

  1. After analysis SSE completes, the result is automatically saved without any user action — a new application record appears in the DB
  2. Each saved application record includes a job title and company name extracted from the JD text
  3. When interview prep completes, the Q+A data is merged into the existing application record (not a new record)
  4. All three existing LLM route handlers (/api/analyse, /api/interview-questions, /api/interview-critique) return 401 when called without a valid session

**Plans**: TBD
**UI hint**: yes

---

### Phase 7: History UI

**Goal**: Users can browse their saved applications, update application status, view the full saved analysis, and re-run analysis from any saved application
**Depends on**: Phase 6
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05
**Success Criteria** (what must be TRUE):

  1. User sees a /history list showing company name, job title, match score, current status badge, and date for every saved application — list loads without deserializing JSONB blobs
  2. User can change the status of any saved application (Saved / Applied / Interviewing / Offer / Rejected) and the change persists on refresh
  3. User can open a saved application and see the full analysis (score breakdown, action items, keyword gaps, accepted rewrites) in read-only panels
  4. User can see saved interview Q+A on the detail page when interview prep was run for that application
  5. User can click "Re-run" on a saved application — the analysis form is pre-populated with the stored resume text and JD text and a new analysis runs

**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1 — Input Pipeline | v1.0 | 4/4 | ✅ Complete | 2026-05-22 |
| 2 — Match Analysis and Resume Optimisation | v1.0 | 6/6 | ✅ Complete | 2026-05-22 |
| 3 — Interview Preparation | v1.0 | 5/5 | ✅ Complete | 2026-05-25 |
| 4 — Auth Foundation | v1.1 | 3/3 | ✅ Complete | 2026-05-25 |
| 5 — Database Schema and DAL | v1.1 | 1/3 | In Progress|  |
| 6 — Save After Analysis | v1.1 | 0/? | Not started | — |
| 7 — History UI | v1.1 | 0/? | Not started | — |

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
| DATA-01 | Phase 5 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 5 | Pending |
| SAVE-01 | Phase 6 | Pending |
| SAVE-02 | Phase 6 | Pending |
| SAVE-03 | Phase 6 | Pending |
| HIST-01 | Phase 7 | Pending |
| HIST-02 | Phase 7 | Pending |
| HIST-03 | Phase 7 | Pending |
| HIST-04 | Phase 7 | Pending |
| HIST-05 | Phase 7 | Pending |

**v1.0 requirements: 10 total. Covered: 10. Orphans: 0.**
**v1.1 requirements: 16 total. Covered: 16. Orphans: 0.**

---

*Created: 2026-05-22 | Last updated: 2026-05-26 — Phase 5 plans added (05-01, 05-02, 05-03)*
