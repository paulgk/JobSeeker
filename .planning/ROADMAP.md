# Roadmap: JobSeeker

**Created:** 2026-05-22
**Depth:** Standard
**Coverage:** 10/10 v1 requirements mapped

## Overview

JobSeeker lets a job seeker paste their resume and a job description and walk away with a match score, a prioritised action plan, an improved resume, and interview preparation — all in a single stateless session. The build order is dictated by hard dependencies: inputs must work before analysis, analysis must work before interview prep.

---

## Phases

### Phase 1 — Input Pipeline

**Goal:** Users can get their resume and a job description into the system and confirm the content is correct before any analysis runs.

**Dependencies:** None — this is the foundation.

**Requirements:** RESIN-01, RESIN-02, JDIN-01, JDIN-02

**Success Criteria:**

1. User uploads a PDF resume and sees a readable plain-text preview of the parsed content before proceeding.
2. User can paste resume text directly and proceed without uploading a file.
3. User can paste a job description as text and have it ready for analysis.
4. User provides a URL and the app returns the extracted JD text, or shows a clear, actionable error if the page cannot be fetched.

**Technical Notes (from research):**
- pdfjs-dist for PDF parsing; abort with a clear error if extracted text is under 200 characters
- All LLM calls via Next.js Route Handlers (not Server Actions — 1 MB limit, no streaming)
- Streaming architecture established in this phase even though Phase 1 has no LLM calls — mock Claude endpoint wired up so Phase 2 can slot in without restructuring
- XML-tag prompt injection defense established before any LLM call reaches production
- Zod validation pattern locked in for all future API responses
- IP-based rate limiting in place before any external sharing

**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold: Next.js 16, Tailwind v4, shadcn/ui, next.config.ts, two-panel home page skeleton
- [x] 01-02-PLAN.md — Resume input: PDF upload route handler (unpdf), paste textarea, text preview UI (RESIN-01, RESIN-02)
- [x] 01-03-PLAN.md — JD input: paste textarea, URL fetch route handler (cheerio), error handling, preview UI (JDIN-01, JDIN-02)
- [x] 01-04-PLAN.md — Infrastructure patterns: SSE mock endpoint, Zod schemas, rate limiting middleware, XML sanitize helper

---

### Phase 2 — Match Analysis and Resume Optimisation

**Goal:** Users receive a clear match score with rationale, a prioritised list of improvements, keyword gap suggestions, and AI-rewritten resume sections they can review and accept.

**Dependencies:** Phase 1 (parsed resume and JD text)

**Requirements:** MATCH-01, MATCH-02, OPT-01, OPT-02

**Success Criteria:**

1. User sees a match score (0–100%) broken down by component (required skills, experience level, domain match, education) with a brief rationale for each — not a black-box number.
2. User receives a prioritised action item list ranked by expected impact on the match score, with enough detail to act on each item without further guidance.
3. User sees a keyword and phrase suggestion list drawn from the JD and absent from their resume, ordered by priority — not raw frequency.
4. User can view AI-rewritten versions of one or more resume sections, see exactly what changed in a before/after diff, and accept or discard each rewrite individually.
5. All LLM output streams progressively to the UI — no blank waiting screens during the 15–30 second generation window.

**Technical Notes (from research):**
- Score rubric: required skills 40%, experience level 25%, domain match 20%, education 15% — baked into the system prompt, not left to the model's discretion
- Rewrites must be constrained to facts, numbers, and terms present in the original resume (no hallucinated metrics)
- Zod schema validation on every LLM response; retry once with corrective prompt on schema failure
- Verify current Claude model IDs before writing any prompts (`npx @anthropic-ai/sdk list-models`); use dated model IDs, not aliases

**Plans:** 6 plans

Plans:
- [ ] 02-01-PLAN.md — Foundation: install SDK/diff/shadcn, extend schemas (AnalysisResultSchema + result event), analysis-prompt.ts (MATCH-01, MATCH-02, OPT-01, OPT-02)
- [ ] 02-02-PLAN.md — Analyse route: replace mock with real Anthropic streaming + structured output + retry-once (MATCH-01, MATCH-02, OPT-01, OPT-02)
- [ ] 02-03-PLAN.md — Client data layer: InlineDiff utility + useAnalysis SSE hook with accept/reject reducer (OPT-02)
- [ ] 02-04-PLAN.md — Display components: ScoreCard, ActionList, KeywordBadges (MATCH-01, MATCH-02, OPT-01)
- [ ] 02-05-PLAN.md — Rewrite diff: before/after diff with per-section accept/reject (OPT-02)
- [ ] 02-06-PLAN.md — Integration: AnalysisPanel + page.tsx wiring, end-to-end streamed flow (MATCH-01, MATCH-02, OPT-01, OPT-02)

---

### Phase 3 — Interview Preparation

**Goal:** Users receive a set of interview questions specific to the role they applied for and a tailored preparation strategy that reflects this role type — not generic advice.

**Dependencies:** Phase 1 (JD content), Phase 2 (match analysis context is useful but not strictly required)

**Requirements:** INTV-01, INTV-02

**Success Criteria:**

1. User sees a list of interview questions that are visibly specific to the job description — referencing the role's actual requirements, not recycled STAR prompts that would apply to any job.
2. User receives preparation tips and a coaching strategy that match the seniority level and domain of the role (e.g., tips for a senior IC role differ from a people-manager role).

**Technical Notes (from research):**
- Questions must be grounded explicitly in JD content — enforce in system prompt
- Sonnet-tier model for question generation; Haiku-tier acceptable for tips (confirm at implementation time)

---

## Progress

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 — Input Pipeline | Users confirm resume and JD content is correctly captured | RESIN-01, RESIN-02, JDIN-01, JDIN-02 | Complete |
| 2 — Match Analysis and Resume Optimisation | Users see match score, action plan, keyword gaps, and rewritten sections | MATCH-01, MATCH-02, OPT-01, OPT-02 | Planned |
| 3 — Interview Preparation | Users receive role-specific interview questions and prep strategy | INTV-01, INTV-02 | Not Started |

---

## Coverage Validation

| Requirement | Phase | Mapped |
|-------------|-------|--------|
| RESIN-01 | Phase 1 | Yes |
| RESIN-02 | Phase 1 | Yes |
| JDIN-01 | Phase 1 | Yes |
| JDIN-02 | Phase 1 | Yes |
| MATCH-01 | Phase 2 | Yes |
| MATCH-02 | Phase 2 | Yes |
| OPT-01 | Phase 2 | Yes |
| OPT-02 | Phase 2 | Yes |
| INTV-01 | Phase 3 | Yes |
| INTV-02 | Phase 3 | Yes |

**v1 requirements: 10 total. Mapped: 10. Orphans: 0.**

---

*Created: 2026-05-22*
