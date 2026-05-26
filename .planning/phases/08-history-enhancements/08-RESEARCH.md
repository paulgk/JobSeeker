# Phase 8: History Enhancements — Research

**Researched:** 2026-05-26
**Domain:** Next.js 16 RSC + client islands, shadcn/ui base-ui, Drizzle ORM, SSE hooks
**Confidence:** HIGH — all findings are direct code reads, no external lookups needed

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Editing on detail page only (`/history/[id]`); list row stays read-only
- D-02: Click-to-edit inline (convert h1/p to input on click); no Edit button
- D-03: Auto-save on blur or Enter; PATCH `/api/applications/[id]/metadata`; errors inline
- D-04: New DAL fn `updateApplicationMeta(userId, id, { jobTitle, company })` with IDOR guard; new Route Handler
- D-05: Detail page header becomes `'use client'` island; detail page stays Server Component
- D-06: Orange "Edit needed" badge when `company === 'Unknown Company'` or `jobTitle === 'Unknown Role'`
- D-07: Badge on both list row AND detail page header; list badge is read-only, detail badge starts inline edit
- D-08: Interview prep inline on detail page; "Start Interview Prep" button replaces current link
- D-09: SSE stream inline in tab; auto-saves via `updateInterviewData()` on completion
- D-10: Client island receives `applicationId`, `resumeText`, `jdText` from Server Component; calls `/api/interview-questions`
- D-11: Confirm at planning whether `/api/interview-questions` already handles `applicationId` (see verdict below)
- D-12: 401 → `window.location.href = '/sign-in'` in both `use-analysis.ts` and `use-interview-prep.ts`
- D-13: `save_error` SSE event → visible toast or inline banner; use whatever toast mechanism is installed

### Claude's Discretion
- Exact inline edit input styling (ring color, font size) — match detail-page heading styles
- Toast vs inline banner for save_error — use whatever shadcn/ui provides; fallback to dismissible `<div>`
- Exact "Edit needed" badge color token — use closest available amber/orange from design system

### Deferred Ideas (OUT OF SCOPE)
- Delete application from history (HIST-V2-03)
- Score trend chart per application (HIST-V2-01)
- Notes field per application (HIST-V2-02)
- Bullet-level rewrite suggestions (OPT-V2-01)
</user_constraints>

---

## A. StatusSelect Pattern — Client Island Reference

**File:** `src/components/status-select.tsx`

The canonical client island pattern:

```tsx
'use client'

export function StatusSelect({ id, initialStatus }: { id: string; initialStatus: ApplicationStatus }) {
  const [status, setStatus] = useState(initialStatus)       // local optimistic state
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleChange(newStatus: ApplicationStatus) {
    const prev = status
    setStatus(newStatus)           // optimistic update
    setError(null)
    setSaving(true)
    const res = await fetch(`/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setSaving(false)
    if (!res.ok) {
      setStatus(prev)              // revert on failure
      setError("Couldn't save status. Try again.")
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select value={status} onValueChange={(v) => handleChange(v as ApplicationStatus)} disabled={saving}>
        ...
      </Select>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}
```

**Pattern summary for `EditableHeader`:**
- Props: `id: string`, `initialCompany: string`, `initialJobTitle: string`
- State: `company`, `jobTitle`, `saving`, `error` (nullable string)
- On blur/Enter: fire PATCH, revert on failure, show inline error
- No Cancel — just revert to `initialX` value from props on error (or keep edit state if user wants to retry)
- `onClick={(e) => e.stopPropagation()}` wrapper is needed only if inside a `<Link>` — the detail page header is NOT inside a Link, so this can be omitted

---

## B. DAL — updateApplicationMeta

**Schema columns** (`src/lib/db/schema.ts`, lines 90-106):
- `company: text('company').notNull()` — plain `text`, no length limit
- `jobTitle: text('jobTitle').notNull()` — plain `text`, no length limit
- No schema migration needed (both exist already)

**Template function** (`src/lib/dal.ts`, lines 74-83):

```ts
export async function updateApplicationStatus(
  userId: string,
  id: string,
  status: ApplicationStatus
): Promise<void> {
  await db
    .update(applications)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
}
```

**IDOR guard pattern:** `.where(and(eq(applications.id, id), eq(applications.userId, userId)))` — the `and()` compound condition ensures the row belongs to the authenticated user. Returns 0 rows silently if not found (no throw). The status route handles this as success (204) because the outcome is idempotent.

**New function to write:**

```ts
export async function updateApplicationMeta(
  userId: string,
  id: string,
  data: { jobTitle: string; company: string }
): Promise<void> {
  await db
    .update(applications)
    .set({ jobTitle: data.jobTitle, company: data.company, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
}
```

Note: `verifySession` is already imported in `dal.ts`. The new fn does NOT call `verifySession` — the Route Handler calls it. This matches the pattern of all existing DAL functions.

---

## C. PATCH Route — /api/applications/[id]/metadata

**Reference:** `src/app/api/applications/[id]/status/route.ts` (full file, 43 lines)

Exact shape to mirror:

```ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth guard (inline — HOC wrappers break ReadableStream)
  let userId: string
  try {
    const session = await verifySession()
    userId = session.userId
  } catch {
    return new Response(null, { status: 401 })
  }

  // 2. Await params (Next.js 16 — params is a Promise)
  const { id } = await params

  // 3. Parse + validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status } = body as { status: unknown }
  if (!VALID_STATUSES.includes(status as ApplicationStatus)) {
    return Response.json({ error: 'Invalid status value' }, { status: 400 })
  }

  // 4. DAL call (IDOR guard is inside DAL)
  await updateApplicationStatus(userId, id, status as ApplicationStatus)

  // 5. 204 No Content
  return new Response(null, { status: 204 })
}
```

**For the metadata route, validation changes to:** check `company` and `jobTitle` are non-empty strings (trim whitespace). Return 400 if either is blank. No enum check needed.

**Response for missing record:** The existing DAL pattern silently updates 0 rows (no error thrown) so the route returns 204 even if `id` doesn't exist or belongs to another user. This is the established behavior — preserve it. The IDOR guard in the WHERE clause handles security; no 404 is needed.

**File path to create:** `src/app/api/applications/[id]/metadata/route.ts`

---

## D. Unknown-Value Badge

### Where company/jobTitle are rendered

**List page** (`src/app/history/page.tsx`):
- Line 66: `<span className="text-base font-semibold text-foreground truncate block">{app.company}</span>`
- Line 68: `<span className="text-sm text-muted-foreground truncate block">{app.jobTitle}</span>`
- The badge needs to be inserted after each span (or inline). The entire row is a `<Link>` wrapper so the badge must be non-interactive (no click handler that stops propagation — it's list-only, read-only per D-07).

**Detail page** (`src/app/history/[id]/page.tsx`):
- Line 48: `<h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">{app.company}</h1>`
- Line 49: `<p className="text-base text-muted-foreground truncate mt-1">{app.jobTitle}</p>`
- Lines 48-49 will move into the new `EditableHeader` client island; the badge lives inside that island.

### Badge component (`src/components/ui/badge.tsx`)

Uses `@base-ui/react` primitives + `cva`. Available variants:
- `default` — primary (near-white on dark)
- `secondary` — muted surface
- `destructive` — red tint
- `outline` — border only, foreground text
- `ghost` — hover-only muted
- `link` — underline link style

**No `warning` variant exists.** No amber/orange CSS custom property exists in `globals.css`.

**Available color token closest to amber/orange:** `--chart-1: oklch(0.72 0.12 68)` (light mode) — this is the warm gold used for high match scores. In dark mode `--chart-1: oklch(0.87 0 0)` (neutral white, no chroma).

**Recommendation (Claude's discretion):** Use Tailwind's built-in `amber-500` utility class (`text-amber-500 bg-amber-500/10 border-amber-500/20`) via an inline `className` override on Badge, since no design-system warning token exists. This matches the D-06 requirement (orange/amber) without adding a new CSS variable.

```tsx
<Badge
  variant="outline"
  className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
>
  Edit needed
</Badge>
```

---

## E. Interview Prep — Hook and Route

### useInterviewPrep hook (`src/hooks/use-interview-prep.ts`)

**Exported function:** `useInterviewPrep()` — takes NO arguments.

**`startPrep` signature** (line 127):
```ts
const startPrep = useCallback(async (resumeText: string, jdText: string, applicationId?: string) => {
```

`applicationId` is already an optional third parameter. The hook already conditionally includes it in the POST body (line 135):
```ts
body: JSON.stringify({ resumeText, jdText, ...(applicationId ? { applicationId } : {}) }),
```

The `InterviewPrepIsland` client island just needs to call `startPrep(resumeText, jdText, applicationId)`.

**`submitCritique` is also on this hook** — the detail page island may want to expose that functionality too (or the island can be scoped to just the start-prep flow; critique is a separate concern).

### /api/interview-questions/route.ts — D-11 VERDICT

**CONFIRMED: No route changes needed.**

Evidence:
1. `InterviewQuestionsRequestSchema` (schemas.ts line 93): `applicationId: z.string().optional()` — field is in the Zod schema.
2. Route handler (route.ts line 88-95): After emitting the `result` SSE event, it checks `parsed.data.applicationId` and calls `updateInterviewData(userId, parsed.data.applicationId, result)` inside a try/catch.
3. Silently swallows save failures — does NOT emit a `save_error` event (unlike `/api/analyse`). The Q+A is already delivered; only DB persistence is affected.

**One minor note:** The route does NOT emit a `save_error` event on persistence failure (the catch block is empty, unlike the analyse route which emits `save_error`). This means D-13 (`save_error` visibility) applies only to `use-analysis.ts`, not `use-interview-prep.ts` for the persistence path.

---

## F. Workflow Fixes — Exact Locations

### use-analysis.ts

**401 check location** (`src/hooks/use-analysis.ts`, lines 94-97):
```ts
if (!res.ok || !res.body) {
  dispatch({ type: 'ERROR', message: 'Failed to connect' })
  return
}
```
`!res.ok` catches 401 but treats it the same as any other error. There is no `res.status === 401` branch.

**Fix:** Add a 401 branch before the generic `!res.ok` check:
```ts
if (res.status === 401) {
  window.location.href = '/sign-in'
  return
}
if (!res.ok || !res.body) {
  dispatch({ type: 'ERROR', message: 'Failed to connect' })
  return
}
```

**save_error handler** (`src/hooks/use-analysis.ts`, lines 126-130):
```ts
if (event.type === 'save_error' && event.message !== undefined) {
  // save_error is non-fatal — analysis result is still in done state
  // Future: dispatch a SAVE_ERROR action to show a banner. For Phase 6, log only.
  console.warn('Analysis save failed:', event.message)
}
```

The comment explicitly deferred this to a future phase. **This is the target for D-13.**

**Fix options (Claude's discretion):**
- Option A (no new deps): Add a `saveError: string | null` state field to the reducer; dispatch a new `SAVE_ERROR` action; render it in the UI as a dismissible `<Alert variant="default">` from `src/components/ui/alert.tsx`.
- Option B (add Sonner): Install `sonner`, add `<Toaster />` to layout, call `toast.warning('Analysis save failed')` from the hook. Sonner is not in `package.json` — would require install.

**Recommendation:** Option A. No new package needed; `Alert` is already installed. The hook currently has no way to surface non-fatal state to the UI other than adding state — that's the right approach.

### use-interview-prep.ts

**401 check location** (`src/hooks/use-interview-prep.ts`, lines 142-145):
```ts
if (!res.ok || !res.body) {
  dispatch({ type: 'ERROR', message: 'Failed to connect' })
  return
}
```

Same pattern as `use-analysis.ts` — 401 falls through to generic error. Same fix applies.

**No `save_error` handling exists** in this hook (the route swallows save errors silently, so no SSE event is emitted for the interview route).

---

## G. Toast Mechanism

**Sonner: NOT installed.** Not in `package.json` dependencies.

**Available toast infrastructure:** None. No `toast.tsx`, no `sonner.tsx`, no `useToast` anywhere in `src/`.

**Available for inline banner:** `src/components/ui/alert.tsx` — exports `Alert`, `AlertTitle`, `AlertDescription`, `AlertAction`. Variants: `default` (card surface) and `destructive` (red tint).

**Recommendation for D-13 (save_error):** Add a `saveError: string | null` field to `AnalysisState` (a new `done+saveError` sub-state or a parallel field). When `save_error` fires, set it. Render a dismissible `<Alert>` above/below the result panels. No new packages.

**If Sonner is desired:** `npm install sonner` + add `<Toaster />` to `src/app/layout.tsx`. Import path would be `import { toast } from 'sonner'`. This would be a new dependency — the CONTEXT.md discretion area allows it but the simpler inline `<Alert>` requires nothing new.

---

## H. Detail Page Structure — Slot Analysis

**Current structure** (`src/app/history/[id]/page.tsx`):

```
<AuthHeader />
<main>
  <Link>← Back to History</Link>

  <div className="flex items-start justify-between gap-4 mb-8">   ← HEADER BLOCK (lines 46-58)
    <div className="min-w-0">
      <h1>{app.company}</h1>          ← becomes EditableHeader island
      <p>{app.jobTitle}</p>           ← becomes EditableHeader island
      <div>
        <Badge />
        <StatusSelect />
      </div>
    </div>
    <Link><Button>Re-run Analysis</Button></Link>
  </div>

  <Tabs>
    <TabsList>
    <TabsContent value="analysis">...</TabsContent>
    <TabsContent value="interview">          ← INTERVIEW TAB (lines 84-95)
      {app.interviewData ? (
        questions.map(...)
      ) : (
        <div>                               ← empty state — becomes InterviewPrepIsland
          <p>Interview prep wasn't run...</p>
          <Link href="/">Go back...</Link>  ← REPLACE this with "Start Interview Prep" button
        </div>
      )}
    </TabsContent>
  </Tabs>
</main>
```

### EditableHeader island insertion

Replace lines 47-54 (the `<div className="min-w-0">` block) with:
```tsx
<EditableHeader
  id={app.id}
  initialCompany={app.company}
  initialJobTitle={app.jobTitle}
/>
```
The `EditableHeader` island renders its own `<h1>`, `<p>`, `<Badge>`, and `<StatusSelect>`. The outer `flex` container and the `Re-run` button stay in the Server Component.

Wait — `StatusSelect` is currently inside the `min-w-0` div. If `EditableHeader` owns company/jobTitle editing AND the status badge/select, it simplifies the island boundary. But mixing two concerns (text editing + status) into one island may be undesirable. **Alternative:** Keep `StatusSelect` in the RSC and only put the company/jobTitle block in `EditableHeader`. The status badge (read-only `<Badge>`) and `<StatusSelect>` stay as siblings in the Server Component — `StatusSelect` is already a client island independently.

### InterviewPrepIsland insertion

Replace lines 90-94 (the empty state `<div>`) with:
```tsx
<InterviewPrepIsland
  applicationId={app.id}
  resumeText={app.resumeText}
  jdText={app.jdText}
/>
```

The Server Component passes `app.resumeText` and `app.jdText` — both are available from `getApplicationById` (full select).

**Data availability check:** `getApplicationById` returns the full row including `resumeText` and `jdText` (schema line 97-98: `resumeText: text(...).notNull()`, `jdText: text(...).notNull()`). Confirmed available as props.

---

## D-11 Verdict (summary)

**CONFIRMED: No route changes needed for `/api/interview-questions`.**

The route already:
1. Accepts optional `applicationId` in the Zod-validated request body (`schemas.ts` line 93)
2. Calls `updateInterviewData(userId, parsed.data.applicationId, result)` after emitting the `result` event (`route.ts` lines 88-95)
3. Silently swallows save errors (non-fatal, does not emit `save_error`)

---

## Gotchas / Blocking Surprises

1. **`params` is a Promise in Next.js 16.** The status route already handles this correctly (`const { id } = await params`). The new metadata route MUST do the same. Do not use synchronous destructuring.

2. **`badge.tsx` uses `@base-ui/react/use-render` and `@base-ui/react/merge-props`.** This is not the standard shadcn Badge — it uses base-ui primitives. The `className` override approach still works (cva merges it), but do NOT try to add a new `variant` by copy-pasting the standard shadcn cva pattern — the component internals differ. Use className override for the amber badge.

3. **No toast library installed.** Sonner is absent. All D-13 save_error surfacing must use the `Alert` component or a custom inline element. If the team wants Sonner, it requires an explicit install step and a `<Toaster />` in layout.

4. **`useInterviewPrep` hook returns critique functions too.** The `InterviewPrepIsland` will reuse the same hook. When streaming completes and `state.phase === 'done'`, the island can render `QuestionCardDisplay` components inline — but the existing `QuestionCardDisplay` component likely expects `QuestionState` (with `expanded`, `draftAnswer`, `critiquePhase` fields) which only exists in the hook's `done` state. Confirm `QuestionCardDisplay` props before implementing the island.

5. **`save_error` state model change.** Adding `saveError` to `AnalysisState` requires updating the reducer, the `Action` type, and potentially the `done` state shape. The existing `done` phase shape is `{ phase: 'done'; result; rewrites; applicationId? }`. Adding `saveError?: string` to the `done` shape is the minimal change; or dispatch a separate action that sets a top-level `saveError` field alongside the phase machine.

6. **Edit-needed badge on the list page is inside a `<Link>` wrapper.** The entire row is wrapped in `<Link href={...}>` (history/page.tsx line 58-62). Adding a badge inside is fine (badges are non-interactive). If the badge needs a `title` attribute for accessibility, that also works inside a Link.

7. **`getApplicationById` is wrapped in React `cache()`.** The RSC can call it freely; it's deduplicated per request. No changes needed.

---

## Sources

All findings are from direct file reads — no external lookups performed.

- `src/components/status-select.tsx` — client island pattern (verified)
- `src/app/api/applications/[id]/status/route.ts` — PATCH handler pattern (verified)
- `src/lib/dal.ts` — all DAL functions, IDOR guard pattern (verified)
- `src/lib/db/schema.ts` — column types (verified)
- `src/hooks/use-analysis.ts` — save_error and 401 locations (verified)
- `src/hooks/use-interview-prep.ts` — 401 location, startPrep signature (verified)
- `src/app/api/interview-questions/route.ts` — applicationId handling (verified)
- `src/lib/schemas.ts` — InterviewQuestionsRequestSchema with applicationId (verified)
- `src/components/ui/badge.tsx` — available variants (verified)
- `src/components/ui/alert.tsx` — available for save_error banner (verified)
- `src/app/globals.css` — color tokens; no warning/amber token exists (verified)
- `package.json` — no sonner installed (verified)
- `src/app/history/page.tsx` — list page structure (verified)
- `src/app/history/[id]/page.tsx` — detail page structure (verified)
- `.planning/phases/07-history-ui/07-UI-SPEC.md` — visual language contract (verified)
