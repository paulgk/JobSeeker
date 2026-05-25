# Requirements: JobSeeker

**Defined:** 2026-05-25
**Milestone:** v1.1 — Persistence & History
**Core Value:** A job seeker pastes their resume and a JD and walks away with a smarter, tailored resume and a clear action plan to land the interview — and can return weeks later to revisit their analysis and prepare for interview calls.

## v1.1 Requirements

### Authentication

- [x] **AUTH-01**: User can sign in with Google OAuth
- [x] **AUTH-02**: User can sign in with email and password (register + login)
- [x] **AUTH-03**: User can sign out
- [x] **AUTH-04**: Unauthenticated users are redirected to sign-in before accessing /history
- [x] **AUTH-05**: Analysis (run) requires authentication — anonymous analysis is not permitted
- [x] **AUTH-06**: User session persists across browser refresh

### Data Layer

- [ ] **DATA-01**: Neon Postgres database provisioned and connected via Drizzle ORM
- [ ] **DATA-02**: Schema covers users, applications, and analysis snapshots (score, action items, keyword gaps, accepted rewrites, interview Q+A)
- [ ] **DATA-03**: Resume text and JD text stored per snapshot (required for re-run)

### Save & History

- [ ] **SAVE-01**: Analysis result is auto-saved to history when analysis completes successfully
- [ ] **SAVE-02**: Job title and company name are auto-extracted from the JD text and stored with each saved application
- [ ] **SAVE-03**: Interview prep result is saved to the same application record when interview prep completes

### History UI

- [ ] **HIST-01**: User sees a history list showing all saved applications with company name, job title, match score, status tag, and date
- [ ] **HIST-02**: User can update the status of a saved application (Saved / Applied / Interviewing / Offer / Rejected)
- [ ] **HIST-03**: User can open a saved application and see the full read-only analysis (score breakdown, action items, keyword gaps, accepted rewrites)
- [ ] **HIST-04**: User can see saved interview prep Q+A from the application detail view (when interview prep was run)
- [ ] **HIST-05**: User can re-run analysis from a saved application — resume text and JD text are pre-populated into the analysis form and a new analysis runs

## v2 Requirements

### History Enhancements

- **HIST-V2-01**: Score trend chart per application — compare multiple analysis runs over time
- **HIST-V2-02**: Notes field per application — free-text notes (interview feedback, contact names)
- **HIST-V2-03**: Delete saved application from history

### Analysis Enhancements

- **OPT-V2-01**: Bullet-level rewrite suggestions with old vs new diff view and accept/reject per bullet
- **OPT-V2-02**: Full tailored resume version generated as a single document
- **MATCH-V2-01**: Side-by-side JD requirements vs resume evidence mapping (gap visualisation)
- **INTV-V2-01**: Resume-grounded answer coaching — suggested answers drawn from the user's own experience
- **INTV-V2-02**: Mock Q&A practice mode — interactive back-and-forth with feedback on user answers
- **RESIN-V2-01**: Upload Word (.docx) resume in addition to PDF

## Out of Scope

| Feature | Reason |
|---------|--------|
| Email/password accounts | Google OAuth only for v1.1; no password reset complexity |
| Shared analysis links | Requires signed URL or public access control — v2+ |
| Kanban board view | Teal/Huntr anti-pattern for this use case; list + status badges is sufficient |
| Multiple resume versions per application | Adds schema complexity without core value in v1.1 |
| Export to PDF / download | Deferred; not part of history use-case |
| Admin / user management | Personal tool; single user |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 4 | Complete |
| AUTH-02 | Phase 4 | Complete |
| AUTH-03 | Phase 4 | Complete |
| AUTH-04 | Phase 4 | Complete |
| AUTH-05 | Phase 4 | Complete |
| AUTH-06 | Phase 4 | Complete |
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

**Coverage:**
- v1.1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-25*
*Last updated: 2026-05-25 — traceability populated by roadmapper (Phases 4–7)*
