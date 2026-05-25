# Retrospective: JobSeeker

---

## v1.0 MVP — 2026-05-22 to 2026-05-25

**Duration:** 4 days  
**Phases:** 3  
**Plans:** 15  
**Requirements shipped:** 10/10  

### What shipped

- PDF resume upload with text preview, plus paste fallback
- JD input via paste or URL fetch (cheerio, 8-domain blocklist)
- Match score (0–100%) with 4-component rubric breakdown (required skills 40%, experience 25%, domain 20%, education 15%)
- Prioritised action item list ranked by impact
- Keyword gap suggestions drawn from the JD
- AI-rewritten resume sections with before/after diff and per-section accept/reject
- Role-specific interview questions (JD-grounded via rationale enforcement)
- Preparation strategy tailored to seniority and domain
- Per-question mock answer coaching via Haiku
- SSE streaming throughout — no blank waiting screens
- UUID cookie rate limiting (20 req/min/IP) before any public exposure

### What worked well

**Route Handlers + SSE from day one.** Establishing the streaming architecture in Phase 1 (mock endpoint) before any LLM calls paid off massively. Phase 2 and 3 slotted in without any restructuring.

**Locked rubric in system prompt.** Hardcoding the scoring percentages as strings in the system prompt prevented model renegotiation and produced consistent, interpretable scores across test runs.

**`rationale` field as grounding enforcement.** Making the model justify each question with a specific JD citation forced genuinely role-specific output rather than recycled STAR prompts.

**Zod schema validation with retry.** The `callWithRetry` pattern (retry once at 6144 tokens with a corrective prompt) was cheap insurance that paid off on the first real end-to-end run.

**`useReducer` for SSE state.** Both Phase 2 (`useAnalysis`) and Phase 3 (`useInterviewPrep`) used `useReducer` + discriminated union state. Readable, testable, no prop drilling.

**`unpdf` over raw `pdfjs-dist`.** The research phase flagged this upfront — raw pdfjs-dist causes Next.js App Router build failures. Zero build issues throughout.

### What to improve for v1.1

**UX polish.** The UI is functional but unpolished. Loading states, spacing, mobile layout, and streaming feedback quality all need work before this is shareable. Deferred as a tracked todo.

**Missing 01-input-pipeline PLAN.md files in milestones archive.** The Phase 1 PLAN.md files were already absent from the `phases/` directory before archival — they weren't in the tracked working set. The SUMMARYs are present; the PLANs appear to have been written directly to a different path or not tracked. Low priority: SUMMARY files have the execution record.

**Interview questions take 95–101s end-to-end.** Sonnet + zodOutputFormat for structured output on a complex schema is slow. Consider: streaming partial JSON display, timeout warning at 30s, or separating the schema into smaller per-call chunks.

**No Vercel deployment yet.** The app has never run anywhere other than localhost. `ANTHROPIC_API_KEY` is confirmed; rate limiting is in place; but Vercel project, domain, and env var configuration still needed.

### Key decisions that proved correct

| Decision | Why it was right |
|----------|-----------------|
| Stateless v1, no auth | Validated the core loop in days, not weeks |
| Node.js runtime, not Edge | 60s timeout headroom; Edge's 30s would have killed Sonnet streaming |
| `page.tsx` as `'use client'` | Simplest shared-state path; no RSC complexity for an interactive tool |
| `submitCritique(index, draftAnswer)` parameter | Avoids stale closure; pattern reusable for any async submission |
| Haiku for critique, Sonnet for structured output | Right model at right cost for each task |

### Decisions to revisit in v1.1+

| Decision | What to reconsider |
|----------|--------------------|
| Single `page.tsx` client component | As features grow, split into smaller client islands |
| `callWithRetry` at 6144 tokens | Token threshold was a guess; instrument to find real failure distribution |
| cheerio JD URL fetch | Works for simple pages; headless browser needed for JS-rendered job boards |

---

*Written: 2026-05-25*
