# Phase 2: Match Analysis and Resume Optimisation - Research

**Researched:** 2026-05-22
**Domain:** Anthropic SDK streaming, structured JSON output, React diff UI, stateless client state
**Confidence:** HIGH (SDK patterns verified against official docs and SDK examples; model IDs verified against live API docs)

---

## Summary

Phase 2 replaces the mock SSE block in `/api/analyse` with a real Anthropic SDK streaming call that produces structured JSON output (score, action items, keyword gaps, rewrites). The client streams this JSON progressively, parses it on completion, and renders a results panel with a before/after diff for accepted rewrites.

The Anthropic SDK 0.98.x supports `output_config.format` with `zodOutputFormat()` natively. Streaming and structured output combine: text deltas stream in real-time, `finalMessage().parsed_output` delivers the validated object at the end. This eliminates the need for fragile prompt-level JSON extraction. Install the SDK first — it is not yet in package.json.

Claude model IDs were verified against the live models overview page (2026-05-22). The recommended model for this use case is **`claude-haiku-4-5-20251001`** (fastest, cheapest, 200k context, adequate for analysis tasks) with **`claude-sonnet-4-6`** as the fallback if quality proves insufficient. Do not use aliases — use the exact ID strings.

For the diff view, avoid `react-diff-viewer` (abandoned, 2020) and `react-diff-viewer-continued` (React 19 compatibility unconfirmed). Use the `diff` npm package (v9, actively maintained) to compute word-level diffs and render a custom Tailwind component. This is fewer than 50 lines and zero compatibility risk.

**Primary recommendation:** One LLM call with `output_config` structured output + streaming. Collect the full JSON via `finalMessage().parsed_output`, forward text deltas as SSE chunks for the progress indicator, then emit a single `result` SSE event with the validated payload.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.98.0 (latest) | Anthropic API client with streaming helpers | Official SDK, needed for `output_config` + `zodOutputFormat()` |
| `zod` | 4.4.3 (already installed) | Schema validation for LLM response | Already in use; Zod v4 integrates with `zodOutputFormat()` |
| `diff` | 9.0.0 | Word-level text diffing | Actively maintained, no React peer dep, zero compatibility risk |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | 1.16.0 (already installed) | Icons (check, x, chevron) for accept/reject UI | Already in project |
| shadcn `progress` | latest | Visual progress bar during streaming | Add via `npx shadcn@latest add progress` |
| shadcn `separator` | latest | Section dividers in results panel | Add via `npx shadcn@latest add separator` |
| shadcn `scroll-area` | latest | Scrollable results container | Add via `npx shadcn@latest add scroll-area` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `diff` + custom component | `react-diff-viewer-continued` | react-diff-viewer-continued has unconfirmed React 19 support, emotion CSS-in-JS, and is a fork-of-a-fork; `diff` is simpler and risk-free |
| `output_config` structured output | Manual JSON extraction from stream | `output_config` provides schema-guaranteed output, retry-on-failure is simpler; manual extraction requires fragile regex/JSON.parse on partial content |
| Single LLM call | 4 sequential calls | Sequential calls: 4x latency, 4x opportunity for failure; one call is 15-30s vs 60-120s |
| `client.messages.stream()` | `client.messages.create({ stream: true })` | `.stream()` gives `.finalMessage()` with `parsed_output`; `create({stream:true})` is lower-level async iterator without accumulation |

**Installation:**
```bash
npm install @anthropic-ai/sdk diff
npx shadcn@latest add progress separator scroll-area
```

---

## Architecture Patterns

### One Call vs Multiple Calls

**Use one call.** The requirements (score + action items + keyword gaps + rewrites) are all derived from the same two inputs (resumeText, jdText) with no inter-step dependencies. Multiple sequential calls would multiply latency (15-30s × 4 = 60-120s), multiply failure surface, and produce no quality benefit. The only reason to split is if the output schema exceeds model capacity — it does not for this use case.

**Pattern:** Single `client.messages.stream()` call with `output_config: { format: zodOutputFormat(AnalysisResultSchema) }`. Stream text deltas to the UI as a progress signal. On `finalMessage()`, access `parsed_output` for the validated result object. Emit that as a `result` SSE event.

### SSE Event Protocol (extends existing schema)

The existing `AnalyseResponseEventSchema` uses `start / chunk / error / done`. Phase 2 adds a `result` event type carrying the validated analysis payload:

```
start    → analysis has begun
chunk    → text delta for progress indicator (raw LLM text, not shown as structured data)
result   → validated AnalysisResult JSON (emitted once before done)
error    → { message: string }
done     → stream complete
```

The `chunk` events stream the raw JSON text as it builds — useful for a "thinking" animation. The `result` event carries the final parsed object the UI actually renders.

### Recommended Project Structure

```
src/
├── app/api/analyse/route.ts         # Replace mock block with real LLM call
├── lib/
│   ├── schemas.ts                   # Add AnalysisResultSchema, extend AnalyseResponseEventSchema
│   ├── analysis-prompt.ts           # System + user prompt builders (isolated for testing)
│   └── diff.ts                      # Word-level diff utility using `diff` package
├── components/
│   ├── analysis-panel.tsx           # 'use client' — main results container, consumes SSE
│   ├── score-card.tsx               # Score display with per-component breakdown
│   ├── action-list.tsx              # Prioritised action items
│   ├── keyword-badges.tsx           # Keyword gap badges
│   └── rewrite-diff.tsx             # Before/after diff with accept/reject per section
└── hooks/
    └── use-analysis.ts              # SSE consumer hook; manages stream state
```

### Pattern 1: Anthropic SDK Streaming in a Next.js Route Handler

The key bridge: use `client.messages.stream()` event listeners inside a `ReadableStream` constructor.

```typescript
// Source: official SDK docs + community-verified pattern
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const stream = client.messages.stream({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userPrompt }],
  output_config: { format: zodOutputFormat(AnalysisResultSchema, 'analysis_result') },
})

const encoder = new TextEncoder()
const readable = new ReadableStream({
  async start(controller) {
    stream.on('text', (text) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`))
    })
    stream.on('error', (err) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`))
      controller.close()
    })
    const final = await stream.finalMessage()
    if (final.parsed_output) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'result', data: final.parsed_output })}\n\n`))
    }
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
    controller.close()
  },
})

return new Response(readable, {
  headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  },
})
```

### Pattern 2: Zod Schema for LLM Response

The Zod schema defines what the LLM must produce. Keep it flat — avoid deep nesting, avoid optional arrays (use empty arrays instead, since Zod v4's `output_config` has constraints on optional parameters: max 24 total).

```typescript
// Source: Anthropic structured outputs docs + Zod v4 constraints
import { z } from 'zod'

const ScoreComponentSchema = z.object({
  name: z.string(),           // e.g. "Required Skills"
  weight: z.number(),         // e.g. 0.40
  score: z.number(),          // 0-100
  rationale: z.string(),      // 1-2 sentence explanation
})

const ActionItemSchema = z.object({
  rank: z.number(),           // 1-N by impact
  title: z.string(),
  detail: z.string(),
  estimatedImpact: z.enum(['high', 'medium', 'low']),
})

const RewriteSectionSchema = z.object({
  sectionName: z.string(),    // e.g. "Professional Summary"
  originalText: z.string(),   // verbatim from resume
  rewrittenText: z.string(),  // improved version
})

export const AnalysisResultSchema = z.object({
  overallScore: z.number(),             // 0-100
  components: z.array(ScoreComponentSchema),
  actionItems: z.array(ActionItemSchema),
  keywordGaps: z.array(z.string()),    // ordered by priority
  rewrites: z.array(RewriteSectionSchema),
})
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>
```

**Zod v4 constraint:** Use `.issues` not `.errors` on `ZodError`. The `.errors` property does not exist in Zod v4 — this is already documented in the project's locked decisions.

### Pattern 3: Retry-Once on Schema Failure

`output_config` with `zodOutputFormat` makes schema failure rare. When it occurs (e.g., model hit max_tokens), the `stop_reason` on `finalMessage()` tells you why. Retry with a corrective prompt only if `stop_reason !== 'end_turn'`:

```typescript
// Source: official structured outputs docs (stop_reason: "refusal" or "max_tokens" = schema incomplete)
async function callWithRetry(prompt: string, attempt = 0): Promise<AnalysisResult> {
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: attempt === 0 ? 4096 : 6144,  // more tokens on retry
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(AnalysisResultSchema, 'analysis_result') },
  })
  const final = await stream.finalMessage()
  if (final.stop_reason !== 'end_turn' && attempt < 1) {
    return callWithRetry(prompt, attempt + 1)
  }
  if (!final.parsed_output) {
    throw new Error(`Schema validation failed: stop_reason=${final.stop_reason}`)
  }
  return final.parsed_output
}
```

Note: do not pass the stream itself to the readable controller when using this retry pattern. Use `finalMessage()` only after the retry decision; emit SSE events in a wrapper that only starts after `callWithRetry` resolves. For the streaming-during-generation UX, accept that the first call's text deltas are discarded on retry (retry is the rare path — ~1%).

### Pattern 4: Word-Level Diff with `diff` Package

No React library needed. The `diff` package produces an array of change objects. Render them inline:

```typescript
// Source: diff package docs (v9)
import { diffWords } from 'diff'

function DiffView({ original, rewritten }: { original: string; rewritten: string }) {
  const parts = diffWords(original, rewritten)
  return (
    <p className="text-sm leading-relaxed">
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.added   ? 'bg-green-100 text-green-900' :
            part.removed ? 'bg-red-100 text-red-900 line-through' :
            ''
          }
        >
          {part.value}
        </span>
      ))}
    </p>
  )
}
```

### Pattern 5: Accept/Reject State (Client-Side, No Persistence)

The v1 is stateless. All state lives in a `useReducer` in the client component. No server round-trip needed for accept/reject:

```typescript
type RewriteState = {
  status: 'pending' | 'accepted' | 'rejected'
  section: RewriteSectionSchema
}

type AnalysisState =
  | { phase: 'idle' }
  | { phase: 'streaming'; progress: string }
  | { phase: 'done'; result: AnalysisResult; rewrites: RewriteState[] }
  | { phase: 'error'; message: string }
```

Actions: `STREAM_START`, `CHUNK` (appends to `progress`), `RESULT` (transitions to done), `ERROR`, `ACCEPT_REWRITE(index)`, `REJECT_REWRITE(index)`.

### Anti-Patterns to Avoid

- **Parsing JSON mid-stream:** Do not attempt to `JSON.parse` partial SSE chunks. The JSON is incomplete until `finalMessage()` resolves. Stream raw text for the progress indicator only.
- **Nesting Zod schemas beyond 3 levels:** `output_config` has schema complexity limits. Keep the schema flat; the constraints above (≤24 optional params) are safe.
- **Using model aliases like `claude-sonnet-4-6` as the primary model:** These resolve to a pinned snapshot; acceptable. However, for Haiku, the ID is `claude-haiku-4-5-20251001` — there is no dateless alias for Haiku in the current generation.
- **Streaming with Edge runtime:** The route already has `runtime = 'nodejs'`. Do not change it. Node runtime on Vercel Hobby now has a 300s default max duration (fluid compute is enabled by default as of 2026). The 10s Hobby limit described in older docs is outdated.
- **Using `client.messages.create({ stream: true })` instead of `client.messages.stream()`:** The former returns a raw async iterator without `.finalMessage()` or `parsed_output`. Stick with `.stream()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation of LLM output | Custom validator or regex JSON extraction | `zodOutputFormat()` + `output_config` | Grammar-constrained output guarantees schema compliance; edge cases in custom parsing are numerous |
| Word-level text diff | Character-by-character comparison | `diff` package `diffWords()` | Myers diff algorithm handles edge cases (whitespace, punctuation splits) that naive approaches miss |
| SSE client parsing | Custom EventSource reconnect logic | Standard browser `EventSource` API or manual `fetch` + `ReadableStreamDefaultReader` | The route uses POST (EventSource is GET-only), so use `fetch` + streaming reader; do not re-implement SSE framing |
| Retry backoff | `setTimeout` exponential loop | The SDK has built-in retries for network/429/5xx (maxRetries=2 default); Phase 2 retry is only for schema failures (not SDK-level) | Mixing SDK retries with manual retries causes double-retry |

**Key insight:** The `output_config` + `zodOutputFormat()` pattern eliminates the hardest problem in this phase (reliably extracting structured data from a streaming LLM response). Everything else is straightforward plumbing.

---

## Common Pitfalls

### Pitfall 1: Anthropic SDK Not Installed

**What goes wrong:** `import Anthropic from '@anthropic-ai/sdk'` fails at build time. The SDK is not in `package.json`.
**Why it happens:** Phase 1 used mock SSE; no real LLM calls were made.
**How to avoid:** First task in Phase 2 implementation: `npm install @anthropic-ai/sdk`.
**Warning signs:** TypeScript error on import, `MODULE_NOT_FOUND` at runtime.

### Pitfall 2: `zod/v4` vs `zod` Import in `zodOutputFormat`

**What goes wrong:** The official SDK streaming example imports `from 'zod/v4'`. The project imports `from 'zod'`. With Zod 4.x installed, both resolve to the same module, but confirm this before shipping.
**Why it happens:** Zod 4 changed the package export paths. The `/v4` subpath is available for explicit pinning.
**How to avoid:** Use `from 'zod'` consistently (Zod 4.4.3 is the installed version). If `zodOutputFormat` errors, check that it imports from the same Zod instance.
**Warning signs:** "Expected ZodType" errors from `zodOutputFormat`.

### Pitfall 3: Schema Failure Silent on `max_tokens` Exceeded

**What goes wrong:** `finalMessage().parsed_output` is `undefined` when the model hits max_tokens mid-JSON. No error is thrown.
**Why it happens:** `stop_reason` is `"max_tokens"` rather than `"end_turn"`. The JSON is truncated and fails grammar validation silently.
**How to avoid:** Always check `final.stop_reason === 'end_turn'` before using `parsed_output`. Retry once with increased `max_tokens`. Set initial `max_tokens` to 4096; retry with 6144.
**Warning signs:** `parsed_output` is `null` or `undefined` on long resumes.

### Pitfall 4: Vercel Buffering the SSE Stream

**What goes wrong:** Client receives all SSE events at once when the stream completes, not progressively.
**Why it happens:** Vercel's infrastructure buffers responses without the buffering-disable header. The existing route already has the fix.
**How to avoid:** Keep `'X-Accel-Buffering': 'no'` in response headers (already present in the existing route).
**Warning signs:** UI shows nothing for 20s, then all results appear instantly.

### Pitfall 5: Controller Closed Before `finalMessage()` Returns

**What goes wrong:** The SSE stream closes before the `result` event is sent.
**Why it happens:** Calling `controller.close()` inside the `stream.on('message', ...)` callback fires before `parsed_output` is available. Use `await stream.finalMessage()` to block until fully parsed.
**How to avoid:** Structure as shown in Pattern 1: emit text chunks via `stream.on('text', ...)`, then `await stream.finalMessage()` for the result, then close. Never close in the `message` event listener.

### Pitfall 6: Hallucinated Metrics in Rewrites

**What goes wrong:** The rewritten resume section contains fabricated numbers ("Increased revenue by 47%") not present in the original.
**Why it happens:** Claude extrapolates from context without explicit constraints.
**How to avoid:** System prompt must include explicit instruction: "Rewrites MUST NOT introduce any numbers, percentages, company names, dates, or metrics that are not present verbatim in the provided resume. If the original section contains no quantified achievements, the rewrite must not add any."
**Warning signs:** Numbers in rewritten sections that don't appear in the original.

### Pitfall 7: `react-diff-viewer-continued` Peer Dep Conflict

**What goes wrong:** npm install fails or React 19 peer dependency conflict when installing `react-diff-viewer-continued`.
**Why it happens:** The library has an open GitHub issue (Feb 2025) about React 19 support; peer deps may still list React 18.
**How to avoid:** Do not use `react-diff-viewer-continued`. Use the `diff` package with the custom 30-line component shown above.

---

## Code Examples

### System Prompt Pattern (Anti-Hallucination + Rubric)

```typescript
// Source: Anthropic hallucination reduction docs + structured output docs
const SYSTEM_PROMPT = `You are an expert resume coach and hiring manager. 
Analyse the provided resume against the job description and return a structured analysis.

SCORING RUBRIC (apply exactly as specified, do not deviate):
- Required Skills: 40% of total score
- Experience Level: 25% of total score  
- Domain Match: 20% of total score
- Education: 15% of total score

REWRITE CONSTRAINTS (strictly enforced):
- Rewrites MUST NOT introduce any numbers, percentages, company names, dates, or metrics 
  that are not present verbatim in the resume text provided.
- If the original section has no quantified achievements, the rewrite must not add any.
- Only use words, technologies, and terms that appear in either the resume or job description.

KEYWORD GAPS:
- List keywords and phrases from the job description that are absent from the resume.
- Order by frequency in the job description (most frequent first).
- Limit to 15 items maximum.

ACTION ITEMS:
- Rank by expected impact on the match score (highest impact first).
- Each item must be actionable within 30 minutes of effort.`
```

### User Prompt Pattern (XML tag injection defense)

```typescript
// Source: sanitize.ts wrapUserContent helper already in project
import { wrapUserContent } from '@/lib/sanitize'

function buildUserPrompt(resumeText: string, jdText: string): string {
  const safeResume = wrapUserContent(resumeText, 'resume')
  const safeJd = wrapUserContent(jdText, 'job_description')
  return `Analyse the following resume against the job description.\n\n${safeResume}\n\n${safeJd}`
}
```

### SSE Client-Side Consumption (fetch + ReadableStream)

```typescript
// Standard browser fetch streaming — EventSource is GET-only, can't POST
async function streamAnalysis(resumeText: string, jdText: string, dispatch: Dispatch) {
  dispatch({ type: 'STREAM_START' })
  const res = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jdText }),
  })
  if (!res.ok || !res.body) {
    dispatch({ type: 'ERROR', message: 'Failed to connect' })
    return
  }
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
      const event = JSON.parse(line.slice(6))
      if (event.type === 'chunk') dispatch({ type: 'CHUNK', content: event.content })
      if (event.type === 'result') dispatch({ type: 'RESULT', data: event.data })
      if (event.type === 'error') dispatch({ type: 'ERROR', message: event.message })
    }
  }
}
```

### Diff Component

```typescript
// Source: diff package v9 API (no React peer dep)
import { diffWords, Change } from 'diff'

export function InlineDiff({ original, rewritten }: { original: string; rewritten: string }) {
  const parts: Change[] = diffWords(original, rewritten)
  return (
    <span className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.added
              ? 'bg-green-100 text-green-800 rounded px-0.5'
              : part.removed
              ? 'bg-red-100 text-red-800 line-through rounded px-0.5'
              : 'text-foreground'
          }
        >
          {part.value}
        </span>
      ))}
    </span>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JSON extraction from LLM text (regex/JSON.parse) | `output_config.format` + `zodOutputFormat()` grammar-constrained output | Anthropic structured outputs release (late 2025) | Near-100% JSON validity; eliminates retry complexity |
| `tool_choice: { type: 'tool', name: 'json' }` forced tool use | `output_config: { format: { type: 'json_schema', ... } }` | Same release | Cleaner API; no fake tool wrapper needed |
| Vercel Hobby 10s function timeout | 300s default with fluid compute | Vercel fluid compute GA (2025-2026) | Hobby plan now viable for 15-30s streaming LLM calls |
| `output_format` parameter + beta header | `output_config.format` (no beta header) | Graduated from beta | Simpler; old beta header still accepted during transition |

**Deprecated/outdated:**
- `anthropic-beta: structured-outputs-2025-11-13` header: no longer required; `output_config` works without it
- `output_format` parameter: replaced by `output_config.format`; still accepted during transition but don't use for new code
- Claude Sonnet 4 (`claude-sonnet-4-20250514`) and Claude Opus 4: deprecated, retiring June 15 2026

---

## Current Claude Model IDs

Verified against https://platform.claude.com/docs/en/about-claude/models/overview on 2026-05-22.

**Recommended for Phase 2:**

| Model | API ID | Input | Output | Context | Notes |
|-------|--------|-------|--------|---------|-------|
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | $1/MTok | $5/MTok | 200k | **Recommended** — fastest, cheapest, adequate for analysis |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | $3/MTok | $15/MTok | 1M | Fallback if Haiku quality insufficient |
| Claude Opus 4.7 | `claude-opus-4-7` | $5/MTok | $25/MTok | 1M | Overkill for this use case |

**Use `claude-haiku-4-5-20251001` as the model ID in code.** Do not use aliases. The Haiku model has no dateless alias in the current generation; you must use the full dated ID.

**Expected latency:** Haiku: 10-20s for a typical resume+JD pair. Sonnet 4.6: 20-40s. Both are within the "15-30 second generation window" specified in requirements.

---

## Vercel Deployment Considerations

**Hobby plan (as of 2026 with fluid compute):** 300s default max duration. The 10s limit described in older documentation no longer applies when fluid compute is enabled (enabled by default). The existing route has `runtime = 'nodejs'` which is correct.

**`maxDuration` export:** Add `export const maxDuration = 60` to the route to set an explicit ceiling well above the expected 15-30s generation time, preventing runaway calls from consuming quota.

**Do not switch to Edge runtime** for the analyse route. Structured output with `zodOutputFormat` requires the full Zod package, which is fine on Node but adds overhead on Edge.

---

## shadcn/ui Components Needed

**Already installed:** card, tabs, textarea, button, alert, badge, text-preview

**Add for Phase 2:**
```bash
npx shadcn@latest add progress    # streaming progress bar
npx shadcn@latest add separator   # section dividers in results panel
npx shadcn@latest add scroll-area # scrollable results list
```

**Build custom (not from shadcn):**
- Score card with component breakdown bars: use existing `card` + Tailwind width utilities
- Action item list: use existing `card` + `badge` for impact level
- Keyword gap badges: use existing `badge` component
- Before/after diff viewer: custom component using `diff` package (shown above)
- Accept/reject buttons: use existing `button` component with `variant="outline"` and `variant="default"`

---

## Open Questions

1. **ANTHROPIC_API_KEY environment variable**
   - What we know: the SDK reads `process.env.ANTHROPIC_API_KEY` by default
   - What's unclear: whether the key is already in `.env.local` or needs to be set up
   - Recommendation: add as first task — the route will 401 without it

2. **Output token budget for rewrites**
   - What we know: Haiku max output is 64k tokens; typical analysis response is ~1000-2000 tokens
   - What's unclear: how many rewrite sections to generate (requirements say "one or more")
   - Recommendation: limit to 2 sections max in v1 (summary + most relevant experience section); instruct this in system prompt

3. **Streaming progress UX during retry**
   - What we know: on schema failure, the retry discards the first call's streaming text
   - What's unclear: whether to show the user that a retry is happening
   - Recommendation: emit a `chunk` event with text `[Retrying for better accuracy...]` before the retry begins; this is the rare path

---

## Sources

### Primary (HIGH confidence)
- `https://platform.claude.com/docs/en/about-claude/models/overview` — model IDs and pricing verified 2026-05-22
- `https://platform.claude.com/docs/en/api/sdks/typescript` — streaming API patterns, `client.messages.stream()`, event types
- `https://platform.claude.com/docs/en/build-with-claude/structured-outputs` — `output_config.format`, `zodOutputFormat()`, streaming with structured output, schema limitations
- `https://github.com/anthropics/anthropic-sdk-typescript/blob/main/examples/structured-outputs-streaming.ts` — verified streaming + structured output code pattern
- `https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md` — MessageStream event types, `.finalMessage()`, `parsed_output`
- `https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations` — prompt techniques for constraining output to source material
- `https://vercel.com/docs/functions/configuring-functions/duration` — Vercel function timeout limits (300s Hobby with fluid compute)
- `https://zod.dev/basics` — Zod v4 `.issues` vs `.errors` confirmed

### Secondary (MEDIUM confidence)
- npm `diff` package v9.0.0 — word-level diff via `diffWords()`, no React peer dep
- Community SSE pattern for bridging Anthropic SDK stream into `ReadableStream` (verified against official SDK docs)

### Tertiary (LOW confidence)
- React 19 incompatibility of `react-diff-viewer-continued` (based on open GitHub issue Feb 2025, not conclusive)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK version, model IDs, Zod version all verified from live sources
- Architecture (one call): HIGH — verified from SDK docs; `output_config` + streaming confirmed to work together
- Streaming pattern: HIGH — verified from official SDK example + helpers.md
- Diff library: HIGH — `diff` v9 is actively maintained, no compatibility risk; recommendation to avoid react-diff-viewer-continued is MEDIUM (based on open issue)
- Vercel limits: HIGH — verified from official docs with 2026-02-27 last-updated date

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (30 days; model IDs are stable snapshots; SDK version may update)
