# JobSeeker

## What This Is

A web application that helps job seekers at any stage — active hunters, passive explorers, and career changers — analyse job descriptions against their resume, get tailored match feedback, generate improved resume versions, and prepare for interviews with role-specific questions. Starts as a personal demo tool with a clean, no-account flow; designed to grow into a multi-user product with community and coaching features.

## Core Value

A job seeker pastes their resume and a JD and walks away with a smarter, tailored resume and a clear action plan to land the interview.

## Requirements

### Validated

- [x] User can upload a PDF/Word resume and have it parsed into structured content — Validated in Phase 1: Input Pipeline
- [x] User can paste a job description or provide a URL for the app to fetch and parse — Validated in Phase 1: Input Pipeline
- [x] App produces a combined match output: score, gap list, side-by-side JD vs resume mapping, and prioritised action items — Validated in Phase 2: Match Analysis and Resume Optimisation
- [x] App generates keyword suggestions for the user to apply themselves — Validated in Phase 2: Match Analysis and Resume Optimisation
- [x] App rewrites specific resume sections/bullet points to better match the JD (user reviews and accepts) — Validated in Phase 2: Match Analysis and Resume Optimisation
- [x] App generates JD-specific interview questions based on the role requirements — Validated in Phase 3: Interview Preparation
- [x] App coaches answers to those questions using the user's own resume content — Validated in Phase 3: Interview Preparation

### Active

- [ ] App produces a complete tailored resume version for the specific JD
- [ ] App provides a mock Q&A practice mode with feedback

### Out of Scope (v1)

- User accounts / authentication — starting stateless; add when demand justifies it
- HR freelancer marketplace — v2+ matured feature
- Life coach / community of freelancers — v2+ matured feature
- Resume builder (structured editor inside app) — upload-first; editing inside app is optional follow-on
- Billing / payments — not needed until community/coaching features land

## Context

- Demo + personal use first; architecture should support multi-user later without a rewrite
- No tech stack decided yet — stack choice is part of research phase
- AI features are central, not bolted on: match analysis, resume rewriting, and interview coaching all run through LLM
- JD URL fetching adds scraping/parsing complexity — treat as an enhancement over paste
- Resume parsing from PDF/Word needs reliable extraction (whitespace, column layouts are tricky)

## Constraints

- **Scope**: Stateless v1 — no login, no persistence across sessions
- **AI dependency**: Claude API is the core engine for analysis, rewriting, and coaching
- **Audience**: Demo quality must be high enough to impress; not throwaway prototype

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stateless v1 (no accounts) | Start simple, validate demand before adding auth complexity | — Pending |
| Progressive resume tuning (suggestions → rewrites → full version) | Meets users at different levels of trust and effort | — Pending |
| Upload-first resume input (not build-in-app) | Faster path to value; users already have resumes | — Pending |

---
*Last updated: 2026-05-25 — Phase 3 (Interview Preparation) complete. All v1 core requirements shipped.*
