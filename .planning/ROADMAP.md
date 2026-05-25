# Roadmap: JobSeeker

**Created:** 2026-05-22
**Last Updated:** 2026-05-25

## Milestones

- ✅ **v1.0 MVP** — 3 phases, 15 plans (shipped 2026-05-25) → [Archive](.planning/milestones/v1.0-ROADMAP.md)

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

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1 — Input Pipeline | v1.0 | 4/4 | ✅ Complete | 2026-05-22 |
| 2 — Match Analysis and Resume Optimisation | v1.0 | 6/6 | ✅ Complete | 2026-05-22 |
| 3 — Interview Preparation | v1.0 | 5/5 | ✅ Complete | 2026-05-25 |

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

**v1 requirements: 10 total. Covered: 10. Orphans: 0.**

---

*Created: 2026-05-22 | Last updated: 2026-05-25 after v1.0 milestone*
