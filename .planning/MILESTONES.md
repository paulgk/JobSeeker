# Milestones

## v1.0 MVP (Shipped: 2026-05-25)

**Phases completed:** 3 phases, 15 plans, 21 tasks

**Key accomplishments:**

- Next.js 16 App Router bootstrapped with Tailwind v4, shadcn/ui (Radix/Nova), and all Phase 1 dependencies including unpdf/pdfjs-dist, zod, and Upstash — two-panel skeleton home page live at localhost:3000.
- PDF upload route handler via unpdf with 200-char extraction gate, plus ResumePanel with Upload/Paste tabs and inline TextPreview
- One-liner:
- SSE mock endpoint, Zod schema library, rate limiting middleware (20 req/min/IP), and XML-tag prompt injection helper — all four patterns Phase 2 consumes directly.
- Anthropic SDK + diff installed, AnalysisResultSchema with 5-field flat shape, and SYSTEM_PROMPT with locked 40/25/20/15 rubric and anti-hallucination constraints
- Real Anthropic streaming route replacing mock: client.messages.stream() with zodOutputFormat, retry-once on non-end_turn, all errors surfaced as SSE error events
- Word-level InlineDiff component (green/red spans via diffWords) and useAnalysis hook with fetch+ReadableStreamDefaultReader SSE consumer, useReducer state machine, and client-side accept/reject rewrite controls
- Three pure presentational components built: ScoreCard (overall + per-component breakdown with progress bars and rationale), ActionList (rank-sorted items with impact badges), and KeywordBadges (priority-ordered gap badges with empty-state handling).
- Controlled RewriteDiff card component: section name heading, InlineDiff word-level diff, and per-section Accept/Reject buttons with accepted/rejected status badges
- AnalysisPanel wires useAnalysis state into idle/streaming/done/error UI branches; page.tsx feeds ResumePanel/JobDescriptionPanel onReady into shared state, closing the Phase 2 end-to-end flow
- schemas.ts additions (appended after `// ── Shared error shape ──`):
- One-liner:

---
