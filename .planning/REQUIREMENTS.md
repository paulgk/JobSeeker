# Requirements: JobSeeker

**Defined:** 2026-05-21
**Core Value:** A job seeker pastes their resume and a JD and walks away with a smarter, tailored resume and a clear action plan to land the interview.

## v1 Requirements

### Resume Input

- [x] **RESIN-01**: User can upload a PDF resume and see a preview of the parsed text before analysis
- [x] **RESIN-02**: User can paste resume text directly as a fallback or primary input method

### JD Input

- [x] **JDIN-01**: User can paste a job description as text
- [x] **JDIN-02**: User can provide a URL and the app fetches and extracts the JD text (best-effort; graceful error on JS-rendered or blocked pages)

### Match Analysis

- [x] **MATCH-01**: App produces a match score (0–100%) based on a consistent rubric comparing resume to JD
- [x] **MATCH-02**: App produces a prioritised action item list ranked by impact on the match score

### Resume Optimisation

- [x] **OPT-01**: App generates a keyword suggestion list — words/phrases from the JD missing in the resume — that the user can apply themselves
- [x] **OPT-02**: App rewrites one or more resume sections (e.g. summary, experience) to better match the JD, with user review before accepting

### Interview Prep

- [x] **INTV-01**: App generates JD-specific interview questions tailored to the role's requirements (not a generic list)
- [x] **INTV-02**: App provides interview tips and preparation strategy tailored to this role type

## v2 Requirements

### Resume Optimisation (advanced)

- **OPT-V2-01**: Bullet-level rewrite suggestions with old vs new diff view and accept/reject per bullet
- **OPT-V2-02**: Full tailored resume version generated as a single document

### Match Analysis (advanced)

- **MATCH-V2-01**: Side-by-side JD requirements vs resume evidence mapping (gap visualisation)

### Interview Prep (advanced)

- **INTV-V2-01**: Resume-grounded answer coaching — suggested answers drawn from the user's own experience
- **INTV-V2-02**: Mock Q&A practice mode — interactive back-and-forth with feedback on user answers

### Resume Input (advanced)

- **RESIN-V2-01**: Upload Word (.docx) resume in addition to PDF

### Community & Coaching

- **COMM-01**: Connect to an HR freelancer for paid 1:1 guidance
- **COMM-02**: Community of life coaches and HR guides

### Persistence

- **PERSIST-01**: User account — saved resume profile so re-upload is not required each session
- **PERSIST-02**: Application tracker — store and revisit past JD analyses

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app resume builder (structured editor) | Scope explosion; commodity space; upload-first is faster to value |
| Forced account creation | Kills demo flow; stateless v1 confirmed |
| LinkedIn / Indeed URL scraping | Requires headless browser infra; negative ROI for v1 |
| Billing / payments | Not needed until community/coaching features land |
| Mobile app | Web-first; mobile later |
| ATS submission | Out of scope; separate product domain |
| Keyword stuffing mode | Anti-feature; backfires with modern screening systems |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RESIN-01 | Phase 1 — Input Pipeline | Complete |
| RESIN-02 | Phase 1 — Input Pipeline | Complete |
| JDIN-01 | Phase 1 — Input Pipeline | Complete |
| JDIN-02 | Phase 1 — Input Pipeline | Complete |
| MATCH-01 | Phase 2 — Match Analysis and Resume Optimisation | Pending |
| MATCH-02 | Phase 2 — Match Analysis and Resume Optimisation | Pending |
| OPT-01 | Phase 2 — Match Analysis and Resume Optimisation | Pending |
| OPT-02 | Phase 2 — Match Analysis and Resume Optimisation | Pending |
| INTV-01 | Phase 3 — Interview Preparation | Complete |
| INTV-02 | Phase 3 — Interview Preparation | Complete |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-05-21*
*Last updated: 2026-05-22 — traceability updated after roadmap creation; OPT-02 correctly placed in Phase 2*
