# Phase 3: Interview Preparation - Research

**Researched:** 2026-05-25
**Domain:** Anthropic SDK structured output, SSE streaming, React per-item state, prompt engineering for JD-grounded questions
**Confidence:** HIGH (all SDK patterns verified from live codebase; model IDs verified against official Anthropic docs 2026-05-25)

---

## Summary

Phase 3 adds interview preparation below the existing AnalysisPanel. The feature has two distinct LLM interactions: (1) batch generation of 5–8 role-specific questions with model answers — one Sonnet call; (2) per-question streaming critique of the user's draft answer — one Haiku call per submission. The UX is progressive: a CTA button triggers question generation; each question card expands to show a model answer and a textarea; submitting the textarea streams inline critique.

The Anthropic SDK 0.98.0 already installed supports both patterns identically to Phase 2. `zodOutputFormat` + `client.messages.stream()` handles the batch generation; a plain `client.messages.create({ stream: true })` raw text stream is cleaner for the single-turn critique (no schema needed — it is free-form feedback). The critique route uses Haiku (`claude-haiku-4-5-20251001`) for cost control, which is appropriate: it does not need structured output, just coherent streaming text.

The key engineering decision is reducer shape for 5–8 questions each with independent expand/critique states. The analysis hook (`use-analysis.ts`) uses a single per-phase object. Interview prep needs per-question arrays — different enough that a new `use-interview-prep.ts` hook is the right choice. Sharing state would require merging incompatible reducer shapes and create unnecessary coupling.

**Primary recommendation:** Separate `use-interview-prep.ts` hook with a flat reducer managing question-level state arrays. Separate `/api/interview-questions` route (Sonnet, structured output) and `/api/interview-critique` route (Haiku, streaming text). New `InterviewPrepPanel` component parallel to `AnalysisPanel`, rendered in `page.tsx` below it after analysis completes.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Question generation (batch LLM) | API / Backend | — | LLM call with API key; must not run in browser |
| Per-question critique (streaming LLM) | API / Backend | — | Stateless streaming response; API key hidden server-side |
| Question + critique state management | Browser / Client | — | UI state (expanded, draft text, critique) lives in React reducer |
| Progressive disclosure (expand/collapse) | Browser / Client | — | Local UI interaction; no server round-trip |
| SSE stream consumption | Browser / Client | — | ReadableStream reader in hook, same pattern as use-analysis.ts |
| Prompt construction + XML sanitisation | API / Backend | — | `wrapUserContent()` must wrap all user-supplied text before LLM call |

---

## Standard Stack

### Core

All libraries below are already installed. Phase 3 requires zero new npm packages.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.98.0 | Anthropic client — batch question generation + critique streaming | Already installed, locked pattern |
| `zod` | 4.4.3 | Schema for `InterviewPrepResultSchema` + request bodies | Already in use; `zodOutputFormat()` takes one arg, returns `json_schema` format object |
| Next.js Route Handlers | 16.2.6 | `/api/interview-questions` and `/api/interview-critique` | Established pattern; `export const runtime = 'nodejs'` required |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn `textarea` | installed | Draft answer input per question | Already in `src/components/ui/textarea.tsx` |
| shadcn `card` | installed | Question card container | `src/components/ui/card.tsx` exists |
| shadcn `button` | installed | CTA trigger + submit per question | Already used throughout |
| shadcn `badge` | installed | Question category label | Already in `src/components/ui/badge.tsx` |
| shadcn `progress` | installed | Streaming progress indicator | Already installed in Phase 2 |

### No new packages needed

The full feature is implementable with the existing stack. The critique route uses raw streaming text (no `diff`, no extra schema helpers).

**Installation:**
```bash
# Nothing to install
```

---

## Package Legitimacy Audit

No new packages are introduced in this phase. All dependencies are already installed and audited in previous phases.

---

## Architecture Patterns

### System Architecture Diagram

```
User (browser)
    │
    ├─── clicks "Prepare for interview" CTA
    │         │
    │         ▼
    │   POST /api/interview-questions
    │   { resumeText, jdText, matchContext? }
    │         │
    │         ├─ Sonnet 4.6 (zodOutputFormat)
    │         │  → SSE: start, chunk*, result, done
    │         ▼
    │   use-interview-prep: QUESTIONS_RESULT action
    │   → state: { phase: 'done', questions: [...] }
    │         │
    │         ▼
    │   InterviewPrepPanel renders 5-8 QuestionCard components
    │         │
    │         ├─── user expands card → sees model answer + textarea
    │         │
    │         └─── user submits draft answer
    │                   │
    │                   ▼
    │             POST /api/interview-critique
    │             { question, modelAnswer, draftAnswer }
    │                   │
    │                   ├─ Haiku 4.5 (raw streaming text)
    │                   │  → SSE: start, chunk*, done
    │                   ▼
    │             per-question critique state updated inline
    │             → critique text streams into QuestionCard
```

### Recommended Project Structure

```
src/
├── app/api/
│   ├── interview-questions/route.ts   # Sonnet, zodOutputFormat, SSE
│   └── interview-critique/route.ts   # Haiku, raw text stream, SSE
├── lib/
│   ├── schemas.ts                     # +InterviewPrepResultSchema, +request schemas
│   └── interview-prompt.ts            # QUESTIONS_SYSTEM_PROMPT, buildQuestionsPrompt()
│                                      # CRITIQUE_SYSTEM_PROMPT, buildCritiquePrompt()
├── components/
│   ├── interview-prep-panel.tsx       # Orchestrator; consumes use-interview-prep
│   └── question-card.tsx              # Single question: expand, model answer, textarea, critique
└── hooks/
    └── use-interview-prep.ts          # Separate hook; see reducer shape below
```

### Pattern 1: Batch Question Generation Route

Identical structure to `/api/analyse/route.ts`. Key differences:

```typescript
// src/app/api/interview-questions/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextRequest } from 'next/server'
import { InterviewQuestionsRequestSchema, InterviewPrepResultSchema, type InterviewPrepResult } from '@/lib/schemas'
import { QUESTIONS_SYSTEM_PROMPT, buildQuestionsPrompt } from '@/lib/interview-prompt'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = 'claude-sonnet-4-6'   // [VERIFIED: platform.claude.com/docs/en/about-claude/models/overview]

// callWithRetry, sseEvent, encoder — exact same shape as analyse/route.ts
// POST handler — exact same shape: Zod validation → build prompt → stream → SSE events
```

Source: `/Volumes/Ext/GenAI/JobSeeker/src/app/api/analyse/route.ts` (verified pattern)

### Pattern 2: Per-Question Critique Route (streaming text, no structured output)

The critique route does not need `zodOutputFormat` — the output is free-form markdown feedback. Use `client.messages.stream()` with `stream.on('text', ...)` and no `output_config`:

```typescript
// src/app/api/interview-critique/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30   // Critique is shorter than question gen

const MODEL = 'claude-haiku-4-5-20251001'   // [VERIFIED: platform.claude.com/docs/en/about-claude/models/overview]

export async function POST(request: NextRequest) {
  // ... Zod validate body (question, modelAnswer, draftAnswer)
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEvent({ type: 'start' }))
      try {
        const llmStream = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: CRITIQUE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildCritiquePrompt(question, modelAnswer, draftAnswer) }],
          // No output_config — free-form text
        })
        llmStream.on('text', (text) => {
          controller.enqueue(sseEvent({ type: 'chunk', content: text }))
        })
        await llmStream.finalMessage()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Critique failed'
        controller.enqueue(sseEvent({ type: 'error', message }))
      } finally {
        controller.enqueue(sseEvent({ type: 'done' }))
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

Source: Pattern adapted from `/Volumes/Ext/GenAI/JobSeeker/src/app/api/analyse/route.ts` [VERIFIED: codebase]

### Pattern 3: Hook Reducer Shape

The key design is that each question needs its own independent state. The reducer tracks an array of `QuestionState` objects indexed by position:

```typescript
// src/hooks/use-interview-prep.ts
'use client'

import { useReducer, useCallback } from 'react'
import type { InterviewPrepResult } from '@/lib/schemas'

export type QuestionState = {
  expanded: boolean
  draftAnswer: string
  critiquePhase: 'idle' | 'streaming' | 'done' | 'error'
  critiqueText: string  // accumulates chunk content; shown as streaming text
  critiqueError: string
}

export type PrepState =
  | { phase: 'idle' }
  | { phase: 'streaming'; progress: string }
  | { phase: 'done'; result: InterviewPrepResult; questions: QuestionState[] }
  | { phase: 'error'; message: string }

type Action =
  | { type: 'STREAM_START' }
  | { type: 'CHUNK'; content: string }
  | { type: 'QUESTIONS_RESULT'; data: InterviewPrepResult }
  | { type: 'ERROR'; message: string }
  | { type: 'TOGGLE_EXPAND'; index: number }
  | { type: 'SET_DRAFT'; index: number; text: string }
  | { type: 'CRITIQUE_START'; index: number }
  | { type: 'CRITIQUE_CHUNK'; index: number; content: string }
  | { type: 'CRITIQUE_DONE'; index: number }
  | { type: 'CRITIQUE_ERROR'; index: number; message: string }

// Reducer helpers:
// QUESTIONS_RESULT → initialise questions[] with all QuestionState set to { expanded: false, draftAnswer: '', critiquePhase: 'idle', ... }
// CRITIQUE_CHUNK → map over questions[], only update index that matches — same pattern as ACCEPT_REWRITE in use-analysis.ts
// SET_DRAFT → update draftAnswer at index (controlled input)

export function useInterviewPrep() {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' })

  const startPrep = useCallback(async (resumeText: string, jdText: string) => {
    // Fetch /api/interview-questions, consume SSE — same loop as use-analysis.ts
    // Dispatch STREAM_START, CHUNK, QUESTIONS_RESULT, ERROR
  }, [])

  const submitCritique = useCallback(async (index: number, question: string, modelAnswer: string) => {
    if (state.phase !== 'done') return
    const draft = state.questions[index].draftAnswer
    // Fetch /api/interview-critique, consume SSE
    // Dispatch CRITIQUE_START, CRITIQUE_CHUNK, CRITIQUE_DONE, CRITIQUE_ERROR
  }, [state])

  const toggleExpand = useCallback((index: number) => {
    dispatch({ type: 'TOGGLE_EXPAND', index })
  }, [])

  const setDraft = useCallback((index: number, text: string) => {
    dispatch({ type: 'SET_DRAFT', index, text })
  }, [])

  return { state, startPrep, submitCritique, toggleExpand, setDraft }
}
```

**Key difference from `use-analysis.ts`:** `submitCritique` can be called multiple times (once per question, possibly re-submitted). The reducer must handle CRITIQUE_START on a question that already has `critiquePhase: 'done'` — it resets that question's critique state to idle then streaming.

### Pattern 4: Component Decomposition

```
InterviewPrepPanel   ('use client', receives resumeText + jdText as props)
  │  owns: useInterviewPrep() hook
  │  renders: CTA button (idle) | progress indicator (streaming) | question list (done) | error (error)
  │
  └── QuestionCard  (one per question, index-keyed)
        props: question data, questionState, onToggle, onDraftChange, onSubmitCritique
        renders:
          ├── header: question text + category badge + expand chevron
          └── [when expanded]:
                ├── model answer section (static text, styled)
                ├── textarea (controlled via draftAnswer + onDraftChange)
                ├── "Get feedback" button → onSubmitCritique
                └── [when critiquePhase != idle]: critique streaming/done display
```

`QuestionCard` receives all state as props — no internal state. The hook owns truth. This mirrors how `RewriteDiff` receives `rewrite` + callbacks from `useAnalysis` via `AnalysisPanel`.

Source: `src/components/rewrite-diff.tsx`, `src/components/analysis-panel.tsx` [VERIFIED: codebase]

### Pattern 5: Page Wiring

`page.tsx` already passes `resumeText` and `jdText` to `AnalysisPanel` when `analysing === true`. The interview prep section appears below after analysis completes. `page.tsx` needs a second state flag `showInterviewPrep` that becomes true when the user clicks the interview CTA.

The interview CTA renders inside `AnalysisPanel` (when `state.phase === 'done'`) — not in `page.tsx`. `AnalysisPanel` calls an `onRequestInterviewPrep` callback prop. This avoids lifting the CTA click into `page.tsx` or adding analysis-state awareness to `page.tsx`.

```typescript
// page.tsx additions
const [showInterviewPrep, setShowInterviewPrep] = useState(false)

// After AnalysisPanel:
{showInterviewPrep && (
  <InterviewPrepPanel resumeText={resumeText} jdText={jdText} />
)}

// AnalysisPanel props addition:
<AnalysisPanel
  resumeText={resumeText}
  jdText={jdText}
  onInterviewPrepReady={() => setShowInterviewPrep(true)}
/>
```

### Anti-Patterns to Avoid

- **Extending `use-analysis.ts`:** Adding interview prep state to the analysis hook creates a monolith with incompatible state shapes and requires the analysis hook to import interview types. Keep hooks single-responsibility.
- **Auto-starting question generation:** The UX decision is explicit CTA trigger. Do not use `useEffect` to auto-start like `AnalysisPanel` does.
- **Single combined LLM call (questions + critique in one call):** Critique is interactive and user-triggered on a per-question basis. A single upfront call cannot generate personalised critique. Keep them separate.
- **Storing critique in the schema result:** Critique text is ephemeral UI state — it belongs in the hook reducer, not in the server-generated `InterviewPrepResult` schema.
- **Dynamic Tailwind class widths for progress:** Confirmed pitfall from Phase 2 (STATE.md). Use `style={{ width: ... }}` for any width derived from a runtime value, not `w-[${n}%]` (purged at build).

---

## Recommended Zod Schemas

Add these to `src/lib/schemas.ts`. They follow the existing flat-schema convention (max 3 nesting levels, no optional arrays — use empty arrays instead).

```typescript
// ── Interview Preparation (Phase 3 LLM call) ──────────────────────────────────

export const InterviewQuestionsRequestSchema = z.object({
  resumeText: z.string().min(200, 'Resume must be at least 200 characters'),
  jdText: z.string().min(50, 'Job description must be at least 50 characters'),
})
export type InterviewQuestionsRequest = z.infer<typeof InterviewQuestionsRequestSchema>

const InterviewQuestionSchema = z.object({
  question: z.string(),          // The interview question text
  category: z.enum(['behavioural', 'technical', 'situational', 'role-specific']),
  rationale: z.string(),         // Why this question is relevant to THIS JD (1-2 sentences)
  modelAnswer: z.string(),       // A strong answer — 150-250 words, grounded in JD context
})

export const InterviewPrepResultSchema = z.object({
  questions: z.array(InterviewQuestionSchema).min(5).max(8),
  prepStrategy: z.object({
    seniorityLevel: z.string(),      // e.g. "Senior Individual Contributor"
    domainContext: z.string(),        // e.g. "Fintech / payments infrastructure"
    tips: z.array(z.string()),        // 3-5 preparation tips tailored to seniority + domain
  }),
})
export type InterviewPrepResult = z.infer<typeof InterviewPrepResultSchema>

// SSE event shapes emitted by /api/interview-questions
export const InterviewQuestionsEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('chunk'), content: z.string() }),
  z.object({ type: z.literal('result'), data: InterviewPrepResultSchema }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('done') }),
])

// Request body for /api/interview-critique
export const InterviewCritiqueRequestSchema = z.object({
  question: z.string().min(10),
  modelAnswer: z.string().min(50),
  draftAnswer: z.string().min(20, 'Answer must be at least 20 characters'),
})
export type InterviewCritiqueRequest = z.infer<typeof InterviewCritiqueRequestSchema>
```

**Schema design decisions:**

1. **One call for both questions and prep strategy.** Questions and prep tips are both derived from the same JD + resume input. A second call would add 5-10s latency with no benefit. `InterviewPrepResultSchema` wraps both.

2. **`rationale` field per question.** This field is the enforcement mechanism for JD-grounding — the model must state why *this specific JD* prompted this question. Without it, the model defaults to generic STAR prompts that could apply to any job. Including it in the schema forces reasoning at generation time.

3. **`category` enum instead of freeform.** Constrains the model to four meaningful archetypes; prevents it from inventing its own taxonomy. `'role-specific'` is the bucket for questions that are purely derived from the JD's technical requirements.

4. **`prepStrategy` flat (not array of objects).** Tips are a `string[]` — simpler than `{ tip: string, rationale: string }[]`, and the planner does not need machine-readable structure on tips.

5. **No `modelAnswer` length constraint in Zod.** Zod string length limits on LLM output can cause schema validation failures if the model writes a thorough answer. The system prompt enforces 150-250 words verbally.

Source: Existing schema patterns in `/Volumes/Ext/GenAI/JobSeeker/src/lib/schemas.ts` [VERIFIED: codebase]; `zodOutputFormat` verified to accept this shape [VERIFIED: node -e runtime test]

---

## Prompt Engineering for JD-Grounded Questions

The system prompt must prevent generic STAR recycling. The two enforcement mechanisms are: (1) schema-enforced `rationale` field (model cannot output a question without justifying its JD connection), and (2) explicit negative constraints in the system prompt.

### QUESTIONS_SYSTEM_PROMPT

```typescript
// src/lib/interview-prompt.ts

export const QUESTIONS_SYSTEM_PROMPT = `You are an expert technical recruiter and career coach.
Generate a set of interview questions for the exact role described in the job description.

GROUNDING RULE (strictly enforced):
- Every question must reference specific requirements, technologies, responsibilities, or context
  from the job description provided. Generic STAR questions that could apply to any job are NOT allowed.
- The rationale field must quote or paraphrase specific language from the job description that
  motivated this question. A rationale like "leadership experience" is not acceptable;
  "the JD requires managing a team of 5-8 engineers across two time zones" is acceptable.

QUESTION CATEGORIES:
- behavioural: past behaviour as a predictor of future performance (specific to this role's challenges)
- technical: domain knowledge, tools, frameworks, or methods named in the JD
- situational: hypothetical scenarios drawn from the role's actual responsibilities
- role-specific: anything uniquely specific to this job that defies the above categories

QUESTION VOLUME: Generate exactly 5-8 questions. Err toward 7-8 for senior roles (staff+, principal, director).

MODEL ANSWER CONSTRAINTS:
- Each modelAnswer should be 150-250 words.
- Answers should follow the STAR structure where applicable but must be tailored to the JD's context.
- Do not invent company-specific details. Answers should be adaptable templates, not fabrications.

PREP STRATEGY:
- Infer the seniority level from the JD title, years of experience required, and scope of responsibilities.
- Infer the domain from the industry, product type, and technical stack mentioned.
- Tips must be tailored to the inferred seniority and domain. A "practice whiteboard coding" tip is
  only appropriate if the JD mentions technical interviews. A "prepare a leadership philosophy" tip
  is only appropriate for people-manager roles.`

export function buildQuestionsPrompt(resumeText: string, jdText: string): string {
  const safeResume = wrapUserContent(resumeText, 'resume')
  const safeJd = wrapUserContent(jdText, 'job_description')
  return `Generate interview preparation for the following resume and job description.\n\n${safeResume}\n\n${safeJd}`
}
```

### CRITIQUE_SYSTEM_PROMPT

```typescript
export const CRITIQUE_SYSTEM_PROMPT = `You are an expert interview coach reviewing a candidate's draft answer.

TASK:
- Read the interview question and the model answer provided.
- Read the candidate's draft answer.
- Provide honest, constructive critique in 3 sections:
  1. **What works** — specific strengths in the draft (be concrete, not generic praise)
  2. **What to improve** — specific gaps, missing STAR elements, or missed JD relevance
  3. **One rewrite suggestion** — a single improved sentence or passage the candidate can directly use

TONE: Warm but direct. The candidate is nervous. Be honest about weaknesses but end on an actionable note.

LENGTH: 150-200 words total. Do not pad.

FORMAT: Plain markdown (bold headers only). No bullet-point lists — write in short paragraphs.`

export function buildCritiquePrompt(
  question: string,
  modelAnswer: string,
  draftAnswer: string
): string {
  const safeQuestion = wrapUserContent(question, 'interview_question')
  const safeModel = wrapUserContent(modelAnswer, 'model_answer')
  const safeDraft = wrapUserContent(draftAnswer, 'candidate_draft')
  return `Critique the following interview answer.\n\n${safeQuestion}\n\n${safeModel}\n\n${safeDraft}`
}
```

**Why `wrapUserContent` on all three critique inputs:** The question and model answer come from a previous LLM call — they are not attacker-controlled. However, the `draftAnswer` is user-typed. Wrapping all three is cheap, consistent, and prevents any edge-case where a previous LLM output contained adversarial content (unlikely but possible with injection-focused inputs). [VERIFIED: `wrapUserContent` signature in `/Volumes/Ext/GenAI/JobSeeker/src/lib/sanitize.ts`]

---

## Model Selection

| Route | Model | Model ID | Rationale |
|-------|-------|----------|-----------|
| `/api/interview-questions` | Claude Sonnet 4.6 | `claude-sonnet-4-6` | Sonnet required per ROADMAP; question quality + rationale depth benefits from higher-capability model; one call per session |
| `/api/interview-critique` | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Cost-sensitive; potentially multiple calls per session (one per question); Haiku produces adequate short-form critique; 200k context window fits the prompt |

Model IDs verified against official Anthropic documentation (platform.claude.com/docs/en/about-claude/models/overview, 2026-05-25). [VERIFIED: platform.claude.com]

**Note on the analyse route model:** The existing `analyse/route.ts` uses `claude-haiku-4-5-20251001` for analysis. The ROADMAP specifies "Sonnet-tier model for question generation" but "Haiku-tier acceptable for tips." Since questions and tips are generated in a single call, Sonnet is the correct model for that call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE stream consumption | Custom event parser | Copy the loop from `use-analysis.ts` | The buffer-split-parse loop is already tested and handles partial chunks correctly |
| Schema validation | Manual JSON parsing of LLM output | `zodOutputFormat()` + `finalMessage().parsed_output` | Same pattern as Phase 2; catches malformed output, enables retry |
| XML injection defense | String escaping | `wrapUserContent()` from `sanitize.ts` | Already implemented and handles the edge cases |
| Retry on schema failure | Manual retry logic | Copy `callWithRetry()` from `analyse/route.ts` | Identical pattern; schema failure is the same risk |
| Streaming text accumulation | Custom text buffer | `llmStream.on('text', cb)` | SDK handles chunk ordering; the SSE dispatch is the only integration point |
| Per-item state arrays | Complex nested state | Array index dispatch pattern (e.g. `CRITIQUE_CHUNK; index`) | Same pattern as `ACCEPT_REWRITE; index` in `use-analysis.ts` |

**Key insight:** Every primitive in Phase 3 has a tested counterpart in Phase 2. The goal is pattern reuse, not reimplementation.

---

## Common Pitfalls

### Pitfall 1: Generic Questions Despite Prompt Instructions

**What goes wrong:** The model generates STAR-template questions ("Tell me about a time you demonstrated leadership") that ignore the JD.

**Why it happens:** Without a schema-enforced `rationale` field, the model is never forced to ground its questions in the JD. The system prompt warning alone is insufficient.

**How to avoid:** The `rationale` field in `InterviewQuestionSchema` is the primary enforcement mechanism. The model must output a rationale for every question; if it cannot ground a question in the JD, it will either skip that question or write a weak rationale (which the user can see). Secondary enforcement: the system prompt explicitly says "Generic STAR questions that could apply to any job are NOT allowed."

**Warning signs:** All questions start with "Tell me about a time..." — trigger a schema validation retry or add a prompt correction in `callWithRetry`.

### Pitfall 2: Per-Question Critique State Mutation Bug

**What goes wrong:** `CRITIQUE_CHUNK` dispatches to the wrong question, or all questions show the same critique text.

**Why it happens:** The reducer must map over `state.questions` and return a new array with only `index` updated. Using `state.questions[index] = ...` mutates state directly. Using `.filter()` instead of `.map()` removes items.

**How to avoid:** Follow the `ACCEPT_REWRITE` pattern from `use-analysis.ts` exactly:

```typescript
case 'CRITIQUE_CHUNK': {
  if (state.phase !== 'done') return state
  return {
    ...state,
    questions: state.questions.map((q, i) =>
      i === action.index
        ? { ...q, critiqueText: q.critiqueText + action.content }
        : q
    ),
  }
}
```

**Warning signs:** All cards show the same critique; first card's critique appears in wrong card.

### Pitfall 3: `submitCritique` Closure Staleness

**What goes wrong:** `submitCritique` captures a stale `state.questions[index].draftAnswer` from when it was created, not the current value.

**Why it happens:** `useCallback` with an empty or incomplete dependency array. In `use-analysis.ts`, `start` only reads props passed in — no hook state. `submitCritique` reads `state.questions[index].draftAnswer` from hook state.

**How to avoid:** Either (a) pass `draftAnswer` as a parameter to `submitCritique(index, draftAnswer)` — the component reads it from the `QuestionCard` textarea's current value — or (b) include `state` in `useCallback` deps. Option (a) is cleaner: the component controls the draft text, so it can pass the current value directly.

**Warning signs:** Critique always reflects initial (empty) draft text; user edits the textarea but critique is blank or stale.

### Pitfall 4: Re-submitting Critique Without Reset

**What goes wrong:** User clicks "Get feedback" a second time; the old critique text persists and new chunks append to it, or the submit button is disabled indefinitely.

**Why it happens:** `CRITIQUE_START` does not reset `critiqueText` to `''`.

**How to avoid:** `CRITIQUE_START` reducer case must reset both `critiquePhase` to `'streaming'` and `critiqueText` to `''`:

```typescript
case 'CRITIQUE_START': {
  if (state.phase !== 'done') return state
  return {
    ...state,
    questions: state.questions.map((q, i) =>
      i === action.index
        ? { ...q, critiquePhase: 'streaming', critiqueText: '', critiqueError: '' }
        : q
    ),
  }
}
```

### Pitfall 5: Zod Schema Complexity Limit

**What goes wrong:** `zodOutputFormat` rejects the schema or the model cannot comply, causing retry loops.

**Why it happens:** Deeply nested schemas or schemas with many optional fields exceed the model's reliable structured output capability. The Phase 2 RESEARCH.md noted "Keep the schema FLAT (≤3 levels nesting)."

**How to avoid:** `InterviewPrepResultSchema` has 3 nesting levels: `result → questions[] → { question, category, rationale, modelAnswer }` and `result → prepStrategy → { seniorityLevel, domainContext, tips[] }`. This is within the confirmed safe boundary. Do not add a 4th level (e.g., no `{ tips: [{ text: string, priority: number }] }`).

**Warning signs:** Schema validation fails consistently; `stop_reason !== 'end_turn'` on first attempt triggers retry.

---

## Code Examples

### SSE Consumer Loop (copy from use-analysis.ts)

```typescript
// Source: /Volumes/Ext/GenAI/JobSeeker/src/hooks/use-analysis.ts (verified)
const reader = res.body.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n\n')
  buffer = lines.pop() ?? ''
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    let event: { type: string; content?: string; data?: InterviewPrepResult; message?: string }
    try {
      event = JSON.parse(line.slice(6))
    } catch {
      continue
    }
    // dispatch based on event.type
  }
}
```

### Retry Pattern (copy from analyse route)

```typescript
// Source: /Volumes/Ext/GenAI/JobSeeker/src/app/api/analyse/route.ts (verified)
async function callWithRetry(
  userPrompt: string,
  onText: (t: string) => void,
  attempt = 0
): Promise<InterviewPrepResult> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: attempt === 0 ? 4096 : 6144,
    system: QUESTIONS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    output_config: { format: zodOutputFormat(InterviewPrepResultSchema) },
  })
  stream.on('text', onText)
  const final = await stream.finalMessage()
  if (final.stop_reason !== 'end_turn' && attempt < 1) {
    onText('\n[Retrying for better accuracy...]\n')
    return callWithRetry(userPrompt, onText, attempt + 1)
  }
  if (!final.parsed_output) {
    throw new Error(`Schema validation failed: stop_reason=${final.stop_reason}`)
  }
  return final.parsed_output
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JSON extraction from LLM stream | `zodOutputFormat` + `finalMessage().parsed_output` | SDK 0.60+ | Schema-guaranteed output; no fragile JSON.parse on partial content |
| Separate LLM calls for questions vs strategy | Single call returning both | This phase | Halves latency; questions and strategy share the same JD context |
| Storing per-item UI state in component | Array-indexed reducer in hook | React hooks era | Enables replay, undo, and derived state without prop drilling |

---

## Open Questions

1. **Match analysis context in question generation**
   - What we know: The ROADMAP says "Phase 2 (match analysis context is useful but not strictly required)"
   - What's unclear: Should the question generation prompt receive the analysis result (score, action items, keyword gaps) to further personalise questions?
   - Recommendation: Skip for v1 — the JD alone is sufficient for grounding. Adding analysis results increases prompt size, increases cost, and the UX confirmed that interview prep is triggered independently from analysis. This is a v2 enhancement (INTV-V2-01 territory).

2. **Critique for re-answer (user submits multiple times)**
   - What we know: The reducer pattern handles re-submission by resetting `critiquePhase` to `'streaming'` on `CRITIQUE_START`
   - What's unclear: Should "Get feedback" re-enable after the first critique, or be one-shot per session?
   - Recommendation: Allow re-submission. The `QuestionCard` button should be enabled when `critiquePhase !== 'streaming'`, including when `critiquePhase === 'done'`. Label: "Get feedback" → "Revise feedback" after first critique.

---

## Environment Availability

Step 2.6: This phase introduces no new external dependencies. All tools and services are already available and confirmed from Phases 1 and 2.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@anthropic-ai/sdk` | Both API routes | Yes | 0.98.0 | — |
| `ANTHROPIC_API_KEY` env var | Both API routes | Yes (confirmed Phase 2) | — | — |
| Node.js runtime | Route Handlers | Yes | confirmed Phase 1 | — |
| Zod | Schema validation | Yes | 4.4.3 | — |

---

## Validation Architecture

Nyquist validation is enabled (config.json has no `workflow.nyquist_validation: false`). However, LLM calls cannot be unit-tested without mocking or live API access. The testing strategy for this phase is:

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No formal test framework detected in project |
| Config file | none |
| Quick run command | `npx tsc --noEmit` (type-check only) |
| Full suite command | `npx tsc --noEmit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| INTV-01 | Questions reference actual JD content, not generic STAR prompts | manual | Verified by reading generated questions against JD; enforced via prompt + schema `rationale` field |
| INTV-02 | Prep tips match seniority and domain | manual | Verified by reading `prepStrategy` output against JD title/requirements |

### Wave 0 Gaps

None — no test framework is installed in the project, consistent with Phases 1 and 2. Manual verification is the current quality gate.

---

## Security Domain

Security enforcement applies. This phase introduces two new route handlers that accept user input. The threat surface is the same as Phase 2.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Stateless v1 — no user accounts |
| V3 Session Management | No | Stateless v1 |
| V4 Access Control | No | No privileged operations |
| V5 Input Validation | Yes | Zod schema on all request bodies; `wrapUserContent()` on all user text before LLM |
| V6 Cryptography | No | No secrets stored; API key in env var only |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via resume/JD text | Tampering | `wrapUserContent()` wraps all three critique inputs and both question-gen inputs |
| Prompt injection via draftAnswer | Tampering | `wrapUserContent()` with `candidate_draft` tag |
| Oversized payloads | Denial of service | Zod `.min()` / `.max()` on string fields; existing rate limiter applies to all routes |
| Replay / scraping of LLM output | Information Disclosure | Stateless; no server-side caching of results |

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 3 |
|-----------|------------------|
| Think before coding — state assumptions explicitly | Research first; this document is the output |
| Simplicity first — minimum code that solves the problem | Separate hook and routes; no shared state with Phase 2 unless there is a clear reason |
| Surgical changes — touch only what you must | `schemas.ts` gets new types appended; `page.tsx` gets minimal additions; `AnalysisPanel` gets one new callback prop; nothing else changes |
| No features beyond what was asked | No persistence, no account, no share-results — v2 scope |
| Read `node_modules/next/dist/docs/` before writing code | Route Handler streaming pattern confirmed from `streaming.md` [VERIFIED: local docs] |

**From AGENTS.md:** "This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."
Confirmed: Route Handler SSE pattern unchanged in Next.js 16.2.6 from Phase 2 patterns. `export const runtime = 'nodejs'`, `ReadableStream`, `X-Accel-Buffering: no` headers all confirmed in `streaming.md`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Match analysis context (score, keyword gaps) is not passed to question generation — JD alone is sufficient for INTV-01 | Open Questions | Questions may be less personalised than they could be; addressed in v2 |
| A2 | No test framework exists in the project — TypeScript type-check is the only automated gate | Validation Architecture | If a test framework is added before Phase 3 executes, the plan should add test files |

**All other claims are verified against the live codebase or official documentation.**

---

## Sources

### Primary (HIGH confidence)

- `/Volumes/Ext/GenAI/JobSeeker/src/app/api/analyse/route.ts` — Route Handler SSE pattern, `callWithRetry`, model ID `claude-haiku-4-5-20251001`
- `/Volumes/Ext/GenAI/JobSeeker/src/hooks/use-analysis.ts` — SSE consumer loop, reducer shape, per-item state pattern
- `/Volumes/Ext/GenAI/JobSeeker/src/lib/schemas.ts` — Existing schema conventions (flat, ≤3 levels, no optional arrays)
- `/Volumes/Ext/GenAI/JobSeeker/src/lib/sanitize.ts` — `wrapUserContent()` signature and usage
- `/Volumes/Ext/GenAI/JobSeeker/src/lib/analysis-prompt.ts` — System prompt style reference
- `/Volumes/Ext/GenAI/JobSeeker/.planning/STATE.md` — Locked decisions (Zod v4 `.issues`, `zodOutputFormat` single arg, flat schema rule)
- `platform.claude.com/docs/en/about-claude/models/overview` — Verified model IDs `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` (2026-05-25)
- `/Volumes/Ext/GenAI/JobSeeker/node_modules/next/dist/docs/01-app/02-guides/streaming.md` — Next.js 16 Route Handler streaming pattern confirmed
- `node -e` runtime verification — `zodOutputFormat` accepts `InterviewPrepResultSchema` (returns `{ type: 'json_schema' }`)

### Secondary (MEDIUM confidence)

- WebSearch: Anthropic model ID naming convention for 4.6-generation models (dateless format confirmed)

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project and verified
- Architecture: HIGH — directly derived from Phase 2 patterns with no novel primitives
- Schema design: HIGH — runtime-verified with `zodOutputFormat` and Zod 4.4.3
- Prompt engineering: MEDIUM — system prompt constraints are principled but LLM compliance is probabilistic; `rationale` field is the key enforcement mechanism
- Pitfalls: HIGH — sourced from STATE.md accumulated decisions and Phase 2 RESEARCH.md

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (model IDs are pinned snapshots — stable; SDK API unlikely to change)
