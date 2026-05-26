# Phase 7: History UI — Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 11 (9 new, 2 modified)
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/history/page.tsx` | page (server component) | request-response | `src/app/api/analyse/route.ts` (verifySession pattern) + `src/app/page.tsx` (page shape) | role-match |
| `src/app/history/[id]/page.tsx` | page (server component) | request-response | `src/app/history/page.tsx` (same pattern) | exact |
| `src/app/api/applications/[id]/status/route.ts` | route handler | request-response | `src/app/api/analyse/route.ts` | exact |
| `src/app/api/applications/[id]/prefill/route.ts` | route handler | request-response | `src/app/api/fetch-jd/route.ts` (GET-style, thin) | role-match |
| `src/components/auth-header.tsx` | component (client) | request-response | `src/app/sign-in/page.tsx` (signIn/signOut usage, router.push) | role-match |
| `src/components/status-select.tsx` | component (client) | request-response | `src/app/sign-in/page.tsx` (loading/error state pattern) | role-match |
| `src/components/score-card-display.tsx` | component (server-safe) | transform | `src/components/score-card.tsx` | exact |
| `src/components/action-list-display.tsx` | component (server-safe) | transform | `src/components/action-list.tsx` | exact |
| `src/components/keyword-badges-display.tsx` | component (server-safe) | transform | `src/components/keyword-badges.tsx` | exact |
| `src/components/rewrite-diff-readonly.tsx` | component (server-safe) | transform | `src/components/rewrite-diff.tsx` | exact |
| `src/components/question-card-display.tsx` | component (server-safe) | transform | `src/components/question-card.tsx` | exact |
| `src/app/page.tsx` *(modified)* | page (client) | request-response | self — existing file | self |
| `proxy.ts` *(modified)* | middleware | request-response | self — existing file (already has `/history` guard) | self |

---

## Pattern Assignments

### `src/app/history/page.tsx` (server component, request-response)

**Analogs:** `src/app/api/analyse/route.ts` (verifySession inline guard), `src/app/page.tsx` (page layout shape)

**Imports pattern** — copy from `src/app/api/analyse/route.ts` lines 6-7, adapt for server page:
```typescript
import { verifySession, getApplications } from '@/lib/dal'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AuthHeader } from '@/components/auth-header'
```

**Auth pattern** — copy from `src/app/api/analyse/route.ts` lines 49-54:
```typescript
// verifySession() calls redirect('/sign-in') internally — no manual redirect needed
const { userId, user } = await verifySession()
```

**Page shape** — copy from `src/app/page.tsx` lines 20-27 (main + header structure), adapting className:
```tsx
return (
  <>
    <AuthHeader userEmail={user.email} />
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">
        My Applications
      </h1>
      {/* list or empty state */}
    </main>
  </>
)
```

**Card shape for list rows** — copy from `src/app/page.tsx` lines 29-44 (the `rounded-2xl ring-1 ring-border bg-card p-6` pattern):
```tsx
<div className="rounded-2xl ring-1 ring-border bg-card px-6 py-4">
  {/* row contents */}
</div>
```

**Score color** — copy from `src/components/score-card.tsx` lines 9, 18-20 (isStrong + inline style):
```tsx
const isStrong = matchScore != null && matchScore >= 70
<span style={{ color: isStrong ? 'oklch(0.72 0.12 68)' : undefined }}>
  {matchScore}%
</span>
```

---

### `src/app/history/[id]/page.tsx` (server component, request-response)

**Analog:** `src/app/history/page.tsx` (same verifySession + DAL call pattern)

**Dynamic params pattern** — required for Next.js 16 (params is a Promise):
```typescript
export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, user } = await verifySession()
  const application = await getApplicationById(userId, id)
  if (!application) notFound()
  // ...
}
```

**Imports pattern**:
```typescript
import { verifySession, getApplicationById } from '@/lib/dal'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AuthHeader } from '@/components/auth-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
```

**Back link pattern** — matches UI-SPEC typography contract:
```tsx
<Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">
  ← Back to History
</Link>
```

**Tabs usage** — copy from `src/app/sign-in/page.tsx` lines 114-118 (Tabs defaultValue + shadcn import shape):
```tsx
<Tabs defaultValue="analysis">
  <TabsList>
    <TabsTrigger value="analysis">Analysis</TabsTrigger>
    <TabsTrigger value="interview">Interview Prep</TabsTrigger>
  </TabsList>
  <TabsContent value="analysis">...</TabsContent>
  <TabsContent value="interview">...</TabsContent>
</Tabs>
```

---

### `src/app/api/applications/[id]/status/route.ts` (route handler, request-response)

**Analog:** `src/app/api/analyse/route.ts` — same verifySession + inline auth guard pattern

**Full pattern** — copy from `src/app/api/analyse/route.ts` lines 47-65 (auth guard + json parse guard), then adapt:

**Imports** (lines 1-7 of analyse/route.ts, adapted):
```typescript
import { NextRequest } from 'next/server'
import { verifySession, updateApplicationStatus } from '@/lib/dal'
import type { ApplicationStatus } from '@/lib/db/schema'
```

**Auth guard** (lines 49-54 of analyse/route.ts — exact pattern to copy):
```typescript
let userId: string
try {
  const session = await verifySession()
  userId = session.userId
} catch {
  return new Response(null, { status: 401 })
}
```

**JSON parse guard** (lines 57-64 of analyse/route.ts — exact pattern to copy):
```typescript
let body: unknown
try {
  body = await request.json()
} catch {
  return Response.json({ error: 'Invalid JSON' }, { status: 400 })
}
```

**Dynamic params** (Next.js 16 — params is a Promise):
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

**Validation + response pattern**:
```typescript
const VALID_STATUSES: ApplicationStatus[] = ['saved', 'applied', 'interviewing', 'offer', 'rejected']
const { status } = body as { status: unknown }
if (!VALID_STATUSES.includes(status as ApplicationStatus)) {
  return Response.json({ error: 'Invalid status value' }, { status: 400 })
}
await updateApplicationStatus(userId, id, status as ApplicationStatus)
return new Response(null, { status: 204 })
```

---

### `src/app/api/applications/[id]/prefill/route.ts` (route handler, request-response)

**Analog:** `src/app/api/fetch-jd/route.ts` — thin GET handler returning JSON; same json-response shape. Auth guard from `src/app/api/analyse/route.ts`.

**Imports**:
```typescript
import { NextRequest } from 'next/server'
import { verifySession, getApplicationById } from '@/lib/dal'
```

**Full handler pattern** — auth guard from analyse/route.ts lines 49-54, params from Next.js 16, response shape from fetch-jd/route.ts lines 32-34:
```typescript
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string
  try {
    const session = await verifySession()
    userId = session.userId
  } catch {
    return new Response(null, { status: 401 })
  }

  const { id } = await params
  const application = await getApplicationById(userId, id)
  if (!application) return new Response(null, { status: 404 })

  return Response.json({
    resumeText: application.resumeText,
    jdText: application.jdText,
  })
}
```

Note: No `runtime = 'nodejs'` needed — no streaming, no PDF, no long-running work. Omit all route segment config exports (follow simplicity rule).

---

### `src/components/auth-header.tsx` (client component, request-response)

**Analog:** `src/app/sign-in/page.tsx` — only existing file that uses `signOut` from `@/lib/auth-client` and `useRouter`.

**Imports pattern** (from sign-in/page.tsx lines 1-6, adapted):
```typescript
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
```

**signOut + redirect pattern** (modelled on sign-in/page.tsx lines 33-47 — async call + router.push on success):
```typescript
const router = useRouter()

async function handleSignOut() {
  await signOut({
    fetchOptions: {
      onSuccess: () => router.push('/sign-in'),
    },
  })
}
```

**Layout pattern** — sticky header, matches UI-SPEC:
```tsx
interface AuthHeaderProps {
  userEmail: string
}

export function AuthHeader({ userEmail }: AuthHeaderProps) {
  return (
    <header className="sticky top-0 z-10 h-16 bg-card border-b border-border flex items-center px-6">
      <Link href="/" className="text-xl font-semibold tracking-tight text-foreground mr-auto">
        JobSeeker
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">
          History
        </Link>
        <span className="text-xs text-muted-foreground">{userEmail}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </nav>
    </header>
  )
}
```

---

### `src/components/status-select.tsx` (client component, request-response)

**Analog:** `src/app/sign-in/page.tsx` — loading/error state pattern (lines 14-19, 30-47). No exact existing analog for an optimistic-update select; derive from the sign-in loading state shape.

**Imports**:
```typescript
'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ApplicationStatus } from '@/lib/db/schema'
```

**Loading/error state shape** — copy from sign-in/page.tsx lines 14-19:
```typescript
const [status, setStatus] = useState(initialStatus)
const [error, setError] = useState<string | null>(null)
const [saving, setSaving] = useState(false)
```

**Optimistic update + revert pattern** (modelled on sign-in handleSignIn pattern — optimistic then check):
```typescript
async function handleChange(newStatus: ApplicationStatus) {
  const prev = status
  setStatus(newStatus)       // optimistic update
  setError(null)
  setSaving(true)
  const res = await fetch(`/api/applications/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  })
  setSaving(false)
  if (!res.ok) {
    setStatus(prev)          // revert
    setError("Couldn't save status. Try again.")
  }
}
```

**Error display pattern** (inline, below select) — copy from sign-in/page.tsx lines 151-156:
```tsx
{error && (
  <p className="text-sm text-destructive mt-1">{error}</p>
)}
```

**Status label map** (display → db value):
```typescript
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}
```

---

### `src/components/score-card-display.tsx` (server-safe component, transform)

**Analog:** `src/components/score-card.tsx` — direct copy, no changes needed.

`ScoreCard` is already a stateless render component with no streaming hooks. Verify by checking: no `'use client'` directive, no `useState`/`useEffect`, no SSE usage. Confirmed: `score-card.tsx` has none of these.

**Action:** The planner should consider whether to simply re-export `ScoreCard` as `ScoreCardDisplay` or create a thin alias. If the naming distinction is important for clarity (and to guard against accidental future addition of hooks to ScoreCard), create a minimal wrapper:

```typescript
// src/components/score-card-display.tsx
// Re-exports ScoreCard with a display-safe name.
// No streaming, no hooks — safe to render in Server Components.
export { ScoreCard as ScoreCardDisplay } from '@/components/score-card'
export type { } // (no new types needed)
```

Or, if a full file is preferred, copy `score-card.tsx` verbatim and rename the export. The interface is `{ overallScore: number, components: AnalysisResult['components'] }` (lines 3-6 of score-card.tsx).

---

### `src/components/action-list-display.tsx` (server-safe component, transform)

**Analog:** `src/components/action-list.tsx` — direct copy, no changes needed.

`ActionList` is already stateless. No `'use client'`, no hooks. Same re-export strategy as ScoreCardDisplay:

```typescript
// src/components/action-list-display.tsx
export { ActionList as ActionListDisplay } from '@/components/action-list'
```

Interface: `{ items: AnalysisResult['actionItems'] }` (line 5 of action-list.tsx).

---

### `src/components/keyword-badges-display.tsx` (server-safe component, transform)

**Analog:** `src/components/keyword-badges.tsx` — direct copy, no changes needed.

`KeywordBadges` is already stateless. Same re-export strategy:

```typescript
// src/components/keyword-badges-display.tsx
export { KeywordBadges as KeywordBadgesDisplay } from '@/components/keyword-badges'
```

Interface: `{ keywords: string[] }` (line 4 of keyword-badges.tsx).

---

### `src/components/rewrite-diff-readonly.tsx` (server-safe component, transform)

**Analog:** `src/components/rewrite-diff.tsx` — REQUIRES modification. Original has `'use client'`, `onAccept`/`onReject` callbacks, and action buttons (lines 1, 8-12, 40-50).

**What to strip:** Remove `'use client'` directive, `onAccept`, `onReject` props, the entire button footer (lines 39-51), and the `Button` import. Keep the diff display logic.

**Imports pattern** (from rewrite-diff.tsx lines 2-6, strip 'use client' and Button):
```typescript
import { InlineDiff } from '@/lib/diff'
import type { RewriteState } from '@/hooks/use-analysis'
import { Badge } from '@/components/ui/badge'
```

**Interface** — strip callbacks (from rewrite-diff.tsx lines 8-12):
```typescript
interface RewriteDiffReadOnlyProps {
  rewrite: Pick<RewriteState, 'status' | 'section'>
}
```

**Core render** — copy rewrite-diff.tsx lines 15-38 (the card + header div + diff div), drop the footer entirely (lines 39-51). Show accepted state badge only:
```tsx
export function RewriteDiffReadOnly({ rewrite }: RewriteDiffReadOnlyProps) {
  const { status, section } = rewrite

  return (
    <div className="rounded-xl ring-1 ring-border overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border bg-card">
        <span className="text-sm font-semibold text-foreground">{section.sectionName}</span>
        <Badge className="bg-accent text-foreground border-0 text-xs">Accepted</Badge>
      </div>
      <div className="px-5 py-4 bg-background">
        <InlineDiff original={section.originalText} rewritten={section.rewrittenText} />
      </div>
    </div>
  )
}
```

Note: The detail page only renders rewrites with `status === 'accepted'`. Filter at the call site, not inside this component.

---

### `src/components/question-card-display.tsx` (server-safe component, transform)

**Analog:** `src/components/question-card.tsx` — REQUIRES modification. Original has `'use client'` (line 1), `QuestionState` (streaming critique state), `onToggle`/`onDraftChange`/`onSubmitCritique` callbacks, Textarea, and feedback Button (lines 1-17, 101-166).

**What to strip:** Remove `'use client'`, all streaming/critique state (`critiquePhase`, `critiqueText`, etc.), `onDraftChange`, `onSubmitCritique`, the Textarea section (lines 101-118), feedback button (lines 124-131), critique display blocks (lines 133-166). Keep question display, rationale, model answer.

**Imports** (from question-card.tsx lines 3-8, strip Textarea):
```typescript
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { InterviewPrepResult } from '@/lib/schemas'
import { Badge } from '@/components/ui/badge'
```

**Category maps** (from question-card.tsx lines 19-34 — copy verbatim):
```typescript
const categoryLabel: Record<InterviewPrepResult['questions'][number]['category'], string> = {
  behavioural: 'Behavioural',
  technical: 'Technical',
  situational: 'Situational',
  'role-specific': 'Role-specific',
}

const categoryVariant: Record<
  InterviewPrepResult['questions'][number]['category'],
  'default' | 'secondary' | 'outline'
> = {
  behavioural: 'secondary',
  technical: 'default',
  situational: 'outline',
  'role-specific': 'secondary',
}
```

**Simplified interface** (from question-card.tsx lines 10-17, strip callback props):
```typescript
interface QuestionCardDisplayProps {
  question: InterviewPrepResult['questions'][number]
  index: number
}
```

**Expand/collapse state** — this component needs local toggle state, so it remains `'use client'`:
```typescript
'use client'
import { useState } from 'react'
// ...
export function QuestionCardDisplay({ question, index }: QuestionCardDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  // ...
}
```

**Core render** — copy question-card.tsx lines 53-99 (header button + expanded rationale + model answer), drop draft textarea (lines 101-118), feedback button (lines 124-131), and all critique display blocks (lines 133-166).

---

### `src/app/page.tsx` (modified — add searchParams re-run support)

**Analog:** self. Only surgical changes needed.

**searchParams prop signature** — add to existing function signature (Next.js 16, searchParams is a Promise in client pages):
```typescript
'use client'
import { use, useState, useEffect } from 'react'  // add 'use' and 'useEffect'

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string }>
}) {
  const { applicationId } = use(searchParams)
  // ... existing useState declarations unchanged
```

**useEffect for pre-population** — add after existing useState declarations:
```typescript
useEffect(() => {
  if (!applicationId) return
  fetch(`/api/applications/${applicationId}/prefill`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(({ resumeText, jdText }: { resumeText: string; jdText: string }) => {
      setResumeText(resumeText)
      setJdText(jdText)
    })
    .catch(() => {
      // Silent failure — user can still type manually
    })
}, [applicationId])
```

**No other changes to page.tsx.** The existing `setResumeText`/`setJdText` state setters (lines 11-12) and `ResumePanel`/`JobDescriptionPanel` props (`onReady={setResumeText}`) remain unchanged. The panels need to accept initial values — this is flagged in Open Questions of RESEARCH.md.

---

### `proxy.ts` (modified — /history route guard)

**Analog:** self. The guard is already present.

Reading `proxy.ts` lines 41-43 shows the guard is already implemented:
```typescript
if (pathname.startsWith('/history') && !sessionCookie) {
  return NextResponse.redirect(new URL('/sign-in', request.url))
}
```

**No changes needed.** The `/history` guard is already in place in proxy.ts. Planner should note this as a verify-only step, not a code change.

---

## Shared Patterns

### verifySession Auth Guard
**Source:** `src/app/api/analyse/route.ts` lines 49-54
**Apply to:** All new route handlers (`status/route.ts`, `prefill/route.ts`) and all new server pages (`history/page.tsx`, `history/[id]/page.tsx`)

Route handler form (returns 401 on failure):
```typescript
let userId: string
try {
  const session = await verifySession()
  userId = session.userId
} catch {
  return new Response(null, { status: 401 })
}
```

Server page form (verifySession redirects internally — no try/catch needed):
```typescript
const { userId, user } = await verifySession()
```

### JSON Parse Guard
**Source:** `src/app/api/analyse/route.ts` lines 57-64
**Apply to:** `status/route.ts` (PATCH handler reads body)
```typescript
let body: unknown
try {
  body = await request.json()
} catch {
  return Response.json({ error: 'Invalid JSON' }, { status: 400 })
}
```

### Response.json Error Shape
**Source:** `src/app/api/analyse/route.ts` lines 62-64, `src/app/api/fetch-jd/route.ts` lines 16-19
**Apply to:** All new route handlers
```typescript
return Response.json({ error: 'Human-readable message' }, { status: 400 })
```
Note: `fetch-jd/route.ts` adds a `code` field (`INVALID_INPUT`, `FETCH_FAILED`). Status-specific handlers do not need a code field — keep it simple.

### Card / Section Styling
**Source:** `src/app/page.tsx` lines 29-44
**Apply to:** `history/page.tsx` list rows, `history/[id]/page.tsx` panels
```tsx
className="rounded-2xl ring-1 ring-border bg-card p-6"
```
List rows use `px-6 py-4` (tighter than full `p-6`).

### Muted Metadata Text
**Source:** `src/components/action-list.tsx` line 43, `src/components/question-card.tsx` line 86
**Apply to:** Date display, back link, secondary labels throughout history pages
```tsx
className="text-xs text-muted-foreground"   // dates
className="text-sm text-muted-foreground"   // back link, secondary text
```

### Dynamic Styles via inline style (not dynamic Tailwind classes)
**Source:** `src/components/score-card.tsx` lines 18-20
**Apply to:** Score color in list rows, status badge colors if not using variant system
```tsx
style={{ color: isStrong ? 'oklch(0.72 0.12 68)' : undefined }}
```
Do NOT use `bg-${color}` dynamic Tailwind — purged at build.

### Section Heading Typography
**Source:** `src/components/score-card.tsx` line 13, `src/components/action-list.tsx` line 25
**Apply to:** All `<h2>` panel headings in detail page
```tsx
className="text-xl font-semibold tracking-tight text-foreground mb-6"
```

---

## No Analog Found

All files have analogs. No entries required here.

---

## Open Questions Flagged for Planner

1. **`ResumePanel` and `JobDescriptionPanel` `initialValue` props** — These panels currently use `onReady` callbacks to push text up to page.tsx. If they do not accept an `initialValue` prop, the re-run pre-population (`setResumeText`/`setJdText` from useEffect) will not flow back into the panel UI. The planner must read `src/components/resume-panel.tsx` and `src/components/jd-panel.tsx` to check for this prop and add `initialValue?: string` + a sync `useEffect` if absent. This is a surgical change to two existing components that RESEARCH.md flags as unclear.

2. **`getApplications()` ordering** — Currently `orderBy(applications.createdAt)` (ascending). Newest-first (`desc(applications.createdAt)`) is more useful for a history list. The planner should decide whether to change the DAL or accept oldest-first. A one-line change to `dal.ts` (add `desc` import and swap orderBy).

3. **`ScoreCardDisplay` / `ActionListDisplay` / `KeywordBadgesDisplay`** — These can be simple re-exports rather than new files. The planner should decide: re-export aliases (minimal, preferred) or copied files (more explicit). Re-export is lower maintenance.

---

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/lib/`, `proxy.ts`
**Files scanned:** 14 source files read directly
**Pattern extraction date:** 2026-05-26
