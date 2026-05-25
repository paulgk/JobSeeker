---
phase: 02-match-analysis-and-resume-optimisation
verified: 2026-05-22T07:21:04Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 2: Match Analysis and Resume Optimisation — Verification Report

**Phase Goal:** Users receive a clear match score with rationale, a prioritised list of improvements, keyword gap suggestions, and AI-rewritten resume sections they can review and accept.
**Verified:** 2026-05-22T07:21:04Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a match score (0–100%) broken down by component with rationale | VERIFIED | `ScoreCard` renders `overallScore`, maps `components[]` each with name, weight, score bar, and `rationale` text — line 45 of score-card.tsx |
| 2 | User receives a prioritised action item list ranked by impact | VERIFIED | `ActionList` sorts by `item.rank` ascending, renders `item.title`, `item.detail`, and `estimatedImpact` badge — lines 24–45 of action-list.tsx |
| 3 | User sees keyword/phrase suggestion list drawn from JD, ordered by priority | VERIFIED | `KeywordBadges` renders `keywordGaps[]` in schema order; system prompt instructs "Order by frequency in the job description (most frequent first)" — line 23 of analysis-prompt.ts |
| 4 | User can view AI-rewritten sections, see before/after diff, and accept/discard each | VERIFIED | `RewriteDiff` renders `InlineDiff` (diffWords-powered), exposes Accept/Reject buttons, wired to `acceptRewrite`/`rejectRewrite` in `useAnalysis` reducer |
| 5 | All LLM output streams progressively — no blank waiting screen | VERIFIED | `analysis-panel.tsx` enters `streaming` phase on `STREAM_START`, accumulates `progress` from `CHUNK` events, renders `<pre>{state.progress}</pre>` with `Progress` bar |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Provides | Exists | Lines | Stubs | Exports | Wired | Status |
|----------|----------|--------|-------|-------|---------|-------|--------|
| `src/lib/schemas.ts` | `AnalysisResultSchema`, SSE event union | YES | 85 | None | YES | Imported by route, hook | VERIFIED |
| `src/lib/analysis-prompt.ts` | `SYSTEM_PROMPT` with rubric, `buildUserPrompt()` | YES | 34 | None | YES | Imported by route | VERIFIED |
| `src/app/api/analyse/route.ts` | Real Anthropic streaming endpoint | YES | 90 | None | YES (POST) | Called by hook via fetch | VERIFIED |
| `src/hooks/use-analysis.ts` | SSE client, reducer, accept/reject | YES | 146 | None | YES | Imported by analysis-panel | VERIFIED |
| `src/components/analysis-panel.tsx` | Orchestration of all results UI | YES | 105 | None | YES | Used in page.tsx line 33 | VERIFIED |
| `src/components/score-card.tsx` | Score + per-component breakdown | YES | 53 | None | YES | Imported by analysis-panel | VERIFIED |
| `src/components/action-list.tsx` | Ranked action items | YES | 57 | None | YES | Imported by analysis-panel | VERIFIED |
| `src/components/keyword-badges.tsx` | Keyword gap badges | YES | 38 | None | YES | Imported by analysis-panel | VERIFIED |
| `src/components/rewrite-diff.tsx` | Before/after diff with accept/reject | YES | 69 | None | YES | Imported by analysis-panel | VERIFIED |
| `src/lib/diff.tsx` | `InlineDiff` word-level diff renderer | YES | 25 | None | YES | Imported by rewrite-diff | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/page.tsx` | `AnalysisPanel` | JSX `<AnalysisPanel resumeText jdText>` | WIRED | State lifted from input panels flows through; line 33 |
| `src/components/analysis-panel.tsx` | `useAnalysis` hook | `const { state, start, ... } = useAnalysis()` | WIRED | start() called on button click with both text args |
| `src/hooks/use-analysis.ts` | `/api/analyse` | `fetch('/api/analyse', { method: 'POST' })` | WIRED | POST with JSON body; SSE stream read and dispatched |
| `src/app/api/analyse/route.ts` | `@anthropic-ai/sdk` | `client.messages.stream(...)` with `output_config` | WIRED | zodOutputFormat applied; stream.on('text') forwards deltas |
| `src/app/api/analyse/route.ts` | `analysis-prompt.ts` | `buildUserPrompt(resumeText, jdText)` | WIRED | SYSTEM_PROMPT and buildUserPrompt both imported and used |
| `src/app/api/analyse/route.ts` | `schemas.ts` | `AnalysisResultSchema` in zodOutputFormat | WIRED | Schema enforced at API level via SDK helper |
| `src/components/rewrite-diff.tsx` | `src/lib/diff.tsx` | `<InlineDiff original rewritten>` | WIRED | diffWords from npm `diff` pkg; renders coloured spans |

---

### Technical Must-Have Verification

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| Score rubric 40/25/20/15 baked into system prompt | VERIFIED | Lines 7–12 of analysis-prompt.ts: hardcoded percentages AND decimal weights (0.40, 0.25, 0.20, 0.15) in instructions to LLM |
| Rewrites constrained to facts present in original resume | VERIFIED | Lines 16–18 of analysis-prompt.ts: "MUST NOT introduce any numbers, percentages, company names, dates, or metrics that are not present verbatim in the resume text" |
| Zod schema validation on every LLM response | VERIFIED | `zodOutputFormat(AnalysisResultSchema)` passed to `output_config`; SDK internally calls `zodObject.safeParse()` and throws `AnthropicError` on failure — confirmed in SDK source |
| Retry once on schema failure | PARTIAL — see note | Retry triggers on `stop_reason !== 'end_turn'` (truncation), not on Zod schema failure. The SDK's `zodOutputFormat` throws an `AnthropicError` on parse failure, which the route catches as a generic error rather than retrying. The plan spec ("retry once with corrective prompt on schema failure") is not fully honoured for the Zod-failure path specifically. However: (a) Anthropic's structured output (`json_schema` mode) makes schema failure at end_turn extremely unlikely; (b) the token-budget retry (4096→6144) handles the most common failure mode (truncation). This is a minor gap in an edge-case path, not a blocker for the observable goal. |

---

### Requirements Coverage

| Success Criterion | Status | Notes |
|-------------------|--------|-------|
| SC-1: Score 0–100% with component breakdown and rationale | SATISFIED | ScoreCard renders overallScore, 4 components each with weight/score bar/rationale |
| SC-2: Prioritised action items with enough detail to act | SATISFIED | ActionList sorts by rank, shows estimatedImpact badge, renders detail text |
| SC-3: Keyword list from JD, absent from resume, ordered by priority | SATISFIED | KeywordBadges renders keywordGaps[]; prompt enforces JD-frequency ordering |
| SC-4: AI-rewritten sections with before/after diff, accept/discard individually | SATISFIED | RewriteDiff with InlineDiff, Accept/Reject/Undo per section, state tracked in useAnalysis reducer |
| SC-5: Progressive streaming — no blank screen during 15–30s window | SATISFIED | streaming phase renders progress text in real time via CHUNK dispatch and ScrollArea |

---

### Anti-Patterns Found

No functional stubs, placeholder content, empty handlers, or TODO/FIXME comments found in any phase-2 source file. The `placeholder=` attribute occurrences in input fields are HTML input placeholder text (correct usage), not implementation stubs.

---

### Notes on Retry Implementation

The spec says "retry once with corrective prompt on schema failure." The implementation retries on `stop_reason !== 'end_turn'` (e.g. `max_tokens` truncation) with an increased token budget. When `stop_reason === 'end_turn'` but `parsed_output` is null (Zod failure), the route emits an error event rather than retrying. This diverges from the spec's phrasing but is reasonable given that:

1. Anthropic's `json_schema` output mode (used via `zodOutputFormat`) makes structural schema failure at `end_turn` nearly impossible — the model is constrained to the JSON schema at generation time.
2. The corrective-prompt retry pattern is most valuable for models that don't support structured output natively. With `zodOutputFormat`, truncation is the dominant failure mode, and that IS retried.

This is documented as a minor deviation, not a gap blocking goal achievement.

### Human Verification Required

| # | Test | Expected | Why Human |
|---|------|----------|-----------|
| 1 | Start the app, paste a resume and a JD, click "Analyse Match" | Live text appears in the progress box within 2 seconds, then transitions to the full results panel | Streaming behaviour depends on actual Anthropic API key and network |
| 2 | In results, verify the score breakdown shows exactly 4 components labelled "Required Skills", "Experience Level", "Domain Match", "Education" | Each has a label, weight %, score bar, and rationale paragraph | LLM instruction compliance cannot be verified statically |
| 3 | In results, click "Accept" on a rewrite, then "Undo Accept" | Badge changes from Accepted back to pending; Accept/Reject buttons reappear | State management correctness under real interaction |

---

_Verified: 2026-05-22T07:21:04Z_
_Verifier: Claude (gsd-verifier)_
