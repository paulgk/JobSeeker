# Phase 7: History UI — Research

**Researched:** 2026-05-26
**Domain:** Next.js 16 App Router — Server Components, Route Handlers, Client Component state, shadcn/ui
**Confidence:** HIGH — all critical findings verified directly in the installed codebase and Next.js 16 local docs

---

## Summary

Phase 7 builds two new pages (`/history` list and `/history/[id]` detail), one new API route (`PATCH /api/applications/[id]/status`), the `AuthHeader` shared component, and a set of read-only display wrappers for the existing analysis/interview components. No new npm packages are required — only two shadcn components (`select`, and optionally `table`) need to be installed.

The most important architectural finding is that `page.tsx` is currently a `'use client'` component with plain `useState`. The Re-run flow (HIST-05) adds a searchParam (`?applicationId=`) that the home page must read. In Next.js 16, a `'use client'` page receives `searchParams` as a **Promise** and must consume it with React's `use()` hook — not `await`. This is a breaking change from Next.js 14 and earlier.

The history list page (`/history/page.tsx`) should be a **Server Component** — it calls `verifySession()` (already `cache()`-wrapped) and `getApplications()` directly, no loading skeleton required. The detail page (`/history/[id]/page.tsx`) should also be a Server Component that calls `getApplicationById()`. The status PATCH handler follows the same `verifySession()` → `updateApplicationStatus()` pattern as the existing analyse route.

**Primary recommendation:** Keep both new pages as Server Components. Read-only display wrappers reuse existing component logic with callbacks removed. Status updates use optimistic local state in a `'use client'` wrapper around the Select component only — not the whole page.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| History list data fetch | Frontend Server (SSR) | — | `getApplications()` is called in a Server Component; no client-side fetch needed |
| Application detail data fetch | Frontend Server (SSR) | — | `getApplicationById()` called in Server Component; JSONB fields deserialized server-side only |
| Status update (HIST-02) | API / Backend | Browser / Client | PATCH handler owns persistence; client holds optimistic state with revert-on-failure |
| Read-only analysis display | Browser / Client | — | Display wrappers are pure render components, no SSE or hooks |
| Re-run navigation (HIST-05) | Browser / Client | Frontend Server (SSR) | `router.push()` from client; home page reads `searchParams` server-side via `use()` |
| Auth guard | Frontend Server (SSR) | API / Backend | `verifySession()` in server pages; PATCH handler repeats guard independently |
| AuthHeader sign-out | Browser / Client | — | `signOut()` from better-auth/react is a client call |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | History list showing company, job title, match score, status badge, date — no JSONB deserialization | `getApplications()` already selects metadata-only columns — confirmed in dal.ts |
| HIST-02 | User can update application status — persists on refresh | `updateApplicationStatus()` exists in dal.ts; PATCH `/api/applications/[id]/status` is the new route |
| HIST-03 | Detail page with full read-only analysis | `getApplicationById()` returns full row including `analysisData` JSONB; read-only display wrappers wrap existing components |
| HIST-04 | Detail page shows interview Q+A when available | `getApplicationById()` returns `interviewData`; display uses `QuestionCardDisplay` (stripped-down QuestionCard) |
| HIST-05 | Re-run from saved — pre-populates form | `router.push('/?applicationId='+id)` from detail page; home page reads `searchParams.applicationId`, fetches from DAL, pre-populates panels |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- This is **Next.js 16 App Router** — read `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. [VERIFIED: local docs]
- Breaking changes from older Next.js are real — `params` and `searchParams` are now **Promises** in Next.js 15+. [VERIFIED: page.md in local docs]
- **AGENTS.md override:** Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
- Simplicity First: minimum code that solves the problem. No speculative features.
- Surgical Changes: touch only what is needed. Do not refactor things that aren't broken.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | App Router — Server Components, Route Handlers | Project framework [VERIFIED: package.json] |
| better-auth | 1.6.11 | Session auth via `verifySession()` | Established in Phase 4 [VERIFIED: package.json] |
| drizzle-orm | 0.45.2 | DAL queries — `getApplications()`, `getApplicationById()`, `updateApplicationStatus()` | Established in Phase 5 [VERIFIED: package.json] |
| lucide-react | 1.16.0 | Icons (ChevronLeft for back link, etc.) | Already used in QuestionCard [VERIFIED: package.json] |
| shadcn/ui (existing) | — | Badge, Button, Card, Tabs, Separator, ScrollArea, Alert | Already installed [VERIFIED: src/components/ui/] |

### New shadcn Components to Install

| Component | Install Command | Purpose |
|-----------|----------------|---------|
| Select | `npx shadcn@4.8.0 add select` | Status update dropdown on list rows and detail page [VERIFIED: UI-SPEC.md] |
| Table (optional) | `npx shadcn@4.8.0 add table` | Alternative layout for history list — UI-SPEC marks as optional |

No new npm packages beyond shadcn registry components. The `select` shadcn component installs `@radix-ui/react-select` as a peer dependency automatically.

**Installation:**
```bash
npx shadcn@4.8.0 add select
# optional:
npx shadcn@4.8.0 add table
```

---

## Package Legitimacy Audit

Phase 7 installs zero new npm packages directly. The only additions are shadcn CLI-generated components (local files, no runtime npm dependency added beyond `@radix-ui/react-select` which is a Radix primitive already used by other shadcn components in this project).

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| @radix-ui/react-select | npm | 4+ yrs | github.com/radix-ui/primitives | N/A (transitive via shadcn add) | Approved — installed by `npx shadcn add select`, not directly |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser                Frontend Server (SSR)         API / Backend            Database
  |                          |                              |                     |
  |  GET /history            |                              |                     |
  |------------------------->|                              |                     |
  |                          | verifySession()              |                     |
  |                          | getApplications(userId)      |                     |
  |                          |-------------------------------------------->|
  |                          |<--------------------------------------------|
  |     HTML (list page)     |                              |                     |
  |<-------------------------|                              |                     |
  |                          |                              |                     |
  |  PATCH /api/applications/[id]/status                    |                     |
  |------------------------------------------------------->|                     |
  |  (optimistic UI update happens immediately in browser)  |                     |
  |                          |                        verifySession()             |
  |                          |                        updateApplicationStatus()   |
  |                          |                              |-------------------->|
  |     204 / 400            |                              |<--------------------|
  |<-------------------------------------------------------|                     |
  |  (on failure: revert local state, show error)          |                     |
  |                          |                              |                     |
  |  GET /history/[id]       |                              |                     |
  |------------------------->|                              |                     |
  |                          | verifySession()              |                     |
  |                          | getApplicationById(uid, id)  |                     |
  |                          |-------------------------------------------->|
  |     HTML (detail page)   |                              |                     |
  |<-------------------------|                              |                     |
  |                          |                              |                     |
  |  Re-run: router.push('/?applicationId='+id)            |                     |
  |------------------------->|                              |                     |
  |                          | getApplicationById(uid, id)  |                     |
  |                          |-------------------------------------------->|
  |     HTML (home, pre-populated)                         |                     |
  |<-------------------------|                              |                     |
```

### Recommended Project Structure

```
src/
├── app/
│   ├── history/
│   │   ├── page.tsx              # Server Component — list page (HIST-01)
│   │   └── [id]/
│   │       └── page.tsx          # Server Component — detail page (HIST-03, HIST-04)
│   ├── api/
│   │   └── applications/
│   │       └── [id]/
│   │           └── status/
│   │               └── route.ts  # PATCH handler (HIST-02)
│   └── page.tsx                  # Existing — add searchParams re-run support (HIST-05)
├── components/
│   ├── auth-header.tsx            # New 'use client' shared header with signOut
│   ├── status-select.tsx          # New 'use client' optimistic status select
│   ├── score-card-display.tsx     # Read-only ScoreCard (no streaming)
│   ├── action-list-display.tsx    # Read-only ActionList (no streaming)
│   ├── keyword-badges-display.tsx # Read-only KeywordBadges (no streaming)
│   ├── rewrite-diff-readonly.tsx  # Read-only rewrites (accepted state, no callbacks)
│   └── question-card-display.tsx  # Read-only QuestionCard (no textarea/critique)
└── lib/
    └── dal.ts                     # Already has all needed functions
```

### Pattern 1: Server Component Page with verifySession()

Both `/history/page.tsx` and `/history/[id]/page.tsx` follow this pattern:

```typescript
// Source: dal.ts (verified) + Next.js 16 page.md (verified)
import { verifySession, getApplications } from '@/lib/dal'
import { redirect } from 'next/navigation'

export default async function HistoryPage() {
  // verifySession() calls redirect('/sign-in') internally if no session
  const { userId } = await verifySession()
  const applications = await getApplications(userId)
  return <HistoryList applications={applications} />
}
```

**Key point:** `verifySession()` is already wrapped in `cache()` in dal.ts — calling it in both layout and page does not double-fetch. It redirects automatically when no session exists. [VERIFIED: dal.ts]

### Pattern 2: Dynamic Route Params in Next.js 16

In Next.js 16, `params` is a Promise — must be awaited:

```typescript
// Source: route.md in node_modules/next/dist/docs/ (verified)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}

// Page equivalent:
export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await verifySession()
  const application = await getApplicationById(userId, id)
  if (!application) notFound()
  // ...
}
```

[VERIFIED: route.md, page.md in local Next.js 16 docs]

### Pattern 3: searchParams for Re-run (HIST-05)

`page.tsx` is currently `'use client'`. In Next.js 16, a Client Component page receives `searchParams` as a Promise and must read it with React's `use()` hook:

```typescript
// Source: page.md in node_modules/next/dist/docs/ (verified)
'use client'
import { use } from 'react'

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string }>
}) {
  const { applicationId } = use(searchParams)
  // Use applicationId to trigger a useEffect that fetches and pre-populates
  // ...
}
```

**Critical:** `use(searchParams)` is a client-side React hook. The fetch of `resumeText` + `jdText` from the database cannot happen in this client component directly. Options:
1. **Preferred (from STATE.md locked decision):** Navigate to `/?applicationId=id` → home page calls a new `/api/applications/[id]/prefill` GET endpoint (or reuses `getApplicationById` via a thin GET route handler) to fetch `resumeText`+`jdText` client-side in a `useEffect`.
2. Wrap home page in a Server Component that reads `searchParams` server-side, fetches from DB, and passes data as props — but this conflicts with the existing `'use client'` page.tsx design.

**Recommendation (matches locked decision in STATE.md):** Keep page.tsx `'use client'`. Add a `useEffect` that fires when `applicationId` is present (read via `use(searchParams)`), calls a new `/api/applications/[id]/prefill` GET route that returns `{ resumeText, jdText }`, and pre-populates the panel states. This is the lowest-friction path given the existing architecture. The alternative of splitting page.tsx into a server wrapper + client shell is heavier refactoring.

[VERIFIED: STATE.md key decision "Re-run via navigation (?applicationId=)"; page.md for searchParams-as-Promise]

### Pattern 4: Optimistic Status Update

The Status Select component must be `'use client'` to hold local state:

```typescript
// Pattern: optimistic update with revert
'use client'
import { useState } from 'react'
import type { ApplicationStatus } from '@/lib/db/schema'

export function StatusSelect({ id, initialStatus }: { id: string, initialStatus: ApplicationStatus }) {
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(newStatus: ApplicationStatus) {
    const prev = status
    setStatus(newStatus)       // optimistic update
    setError(null)
    const res = await fetch(`/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      setStatus(prev)           // revert
      setError("Couldn't save status. Try again.")
    }
  }
  // ...
}
```

[ASSUMED — pattern derived from UI-SPEC.md interaction contract + React patterns; verified against DAL]

### Pattern 5: PATCH Route Handler with IDOR Guard

```typescript
// Source: route.md (verified), dal.ts (verified)
import { verifySession, updateApplicationStatus } from '@/lib/dal'
import { NextRequest } from 'next/server'
import type { ApplicationStatus } from '@/lib/db/schema'

const VALID_STATUSES: ApplicationStatus[] = ['saved', 'applied', 'interviewing', 'offer', 'rejected']

export async function PATCH(
  request: NextRequest,
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
  const body = await request.json()
  const { status } = body

  if (!VALID_STATUSES.includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  // updateApplicationStatus() has userId+id WHERE clause = IDOR guard built-in
  await updateApplicationStatus(userId, id, status)
  return new Response(null, { status: 204 })
}
```

The IDOR guard is implicit: `updateApplicationStatus(userId, id, status)` uses `and(eq(applications.id, id), eq(applications.userId, userId))` — a row owned by another user silently matches zero rows. [VERIFIED: dal.ts lines 74-83]

### Pattern 6: Read-Only Display Wrappers

Existing `ScoreCard`, `ActionList`, `KeywordBadges` are already stateless render components — they take data as props and have no streaming logic. They can be used as-is for the detail page.

**ScoreCard** — interface is `{ overallScore: number, components: AnalysisResult['components'] }`. No changes needed. [VERIFIED: score-card.tsx]

**ActionList** — interface is `{ items: AnalysisResult['actionItems'] }`. No changes needed. [VERIFIED: action-list.tsx]

**KeywordBadges** — interface is `{ keywords: string[] }`. No changes needed. [VERIFIED: keyword-badges.tsx]

**RewriteDiff** — has `onAccept` and `onReject` callbacks and a `'use client'` directive. The read-only version must omit callbacks and action buttons, showing only accepted rewrites (or all in read-only state). A new `RewriteDiffReadOnly` component is needed. [VERIFIED: rewrite-diff.tsx]

**QuestionCard** — has draft textarea, critique button, and streaming critique logic (`'use client'`). A `QuestionCardDisplay` must omit all interactive elements, showing only question, rationale, model answer. [VERIFIED: question-card.tsx]

### Anti-Patterns to Avoid

- **Reusing AnalysisPanel or InterviewPrepPanel on the detail page** — both components mount SSE hooks and trigger live API calls on render. [VERIFIED: analysis-panel.tsx, interview-prep-panel.tsx]
- **Selecting JSONB columns in the list query** — `getApplications()` already excludes `analysisData`, `interviewData`, `resumeText`, `jdText`. Never pass the list query result to a component that reads JSONB fields. [VERIFIED: dal.ts lines 27-42]
- **Calling `await params` or `await searchParams` synchronously in a Client Component** — must use `use()` hook instead. [VERIFIED: page.md]
- **DB calls in proxy.ts** — proxy.ts runs in Edge Runtime and should stay JWT-cookie-only. The `/history` guard there uses `getSessionCookie()` only, not `auth.api.getSession()`. [VERIFIED: proxy.ts, STATE.md pitfalls]
- **Dynamic Tailwind class for status colors** — use inline styles or predefined variant mapping, not `bg-${color}` strings (purged at build). [VERIFIED: STATE.md — "Progress bar dynamic width" decision]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session check | Custom cookie parsing | `verifySession()` from `@/lib/dal` | Already handles redirect, cache(), and session shape |
| IDOR protection on status update | Manual userId lookup + compare | Pass `userId` to `updateApplicationStatus()` — WHERE clause is the guard | DAL already enforces ownership at the query level |
| Optimistic UI state | Complex state machine | `useState(initialStatus)` + revert on error | Status select has exactly 2 states: current and previous; no reducer needed |
| Status badge variant mapping | Custom CSS | `Badge` with variant per status | Existing variant system covers all 5 statuses without new tokens |
| Date formatting | Custom formatter | `new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })` | Standard JS — no library needed for "May 26, 2026" format |

---

## DAL — Exact Signatures and Return Types

All verified by reading `src/lib/dal.ts` directly.

### `verifySession()`
```typescript
// Returns: { isAuth: true, userId: string, user: User }
// Side effect: redirect('/sign-in') if no session
// Wrapped in React cache() — safe to call multiple times per request
export const verifySession = cache(async () => { ... })
```
[VERIFIED: dal.ts lines 21-25]

### `getApplications(userId: string)`
```typescript
// Returns: Array of metadata-only rows — NO analysisData, interviewData, resumeText, jdText
// Columns: id, userId, jobTitle, company, status, matchScore, createdAt, updatedAt
// Ordered by: createdAt ASC
export async function getApplications(userId: string)
```
**Critical for HIST-01:** The list query never touches JSONB columns. [VERIFIED: dal.ts lines 27-42]

### `getApplicationById(userId: string, id: string)`
```typescript
// Returns: Full Application row | null
// Includes: analysisData (AnalysisResult | null), interviewData (InterviewPrepResult | null),
//           resumeText, jdText, and all metadata columns
// IDOR guard: WHERE id = ? AND userId = ? — returns null if not owned by user
// Wrapped in React cache()
export const getApplicationById = cache(async (userId, id) => { ... })
```
[VERIFIED: dal.ts lines 44-51]

### `updateApplicationStatus(userId: string, id: string, status: ApplicationStatus)`
```typescript
// Returns: void
// IDOR guard: WHERE id = ? AND userId = ?
// ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected'
export async function updateApplicationStatus(userId, id, status)
```
[VERIFIED: dal.ts lines 74-83, schema.ts lines 81-87]

### DB enum values (lowercase)
The pgEnum uses lowercase values: `'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected'`. The UI displays them capitalized ("Saved", "Applied", etc.). Mapping is needed in the Select component and badge display. [VERIFIED: schema.ts lines 81-87]

---

## Common Pitfalls

### Pitfall 1: searchParams is a Promise in Next.js 16
**What goes wrong:** Accessing `searchParams.applicationId` directly in a Client Component throws — it's a Promise in Next.js 15+.
**Why it happens:** Breaking change introduced in Next.js 15 RC, confirmed in Next.js 16 docs.
**How to avoid:** In Client Components use `use(searchParams)`. In Server Components use `await searchParams`.
**Warning signs:** TypeScript error "Property 'applicationId' does not exist on type 'Promise<...>'"
[VERIFIED: page.md in local Next.js 16 docs]

### Pitfall 2: params is a Promise in Route Handlers
**What goes wrong:** Accessing `params.id` directly in a PATCH handler fails silently or throws.
**Why it happens:** Same breaking change — context.params is also a Promise in Next.js 15+.
**How to avoid:** `const { id } = await params` in the Route Handler body.
[VERIFIED: route.md in local Next.js 16 docs]

### Pitfall 3: AnalysisPanel mounts SSE on render
**What goes wrong:** Importing `AnalysisPanel` on the detail page triggers an immediate call to `/api/analyse` when the component mounts.
**Why it happens:** `useEffect(() => { start(resumeText, jdText) }, [])` fires unconditionally on mount.
**How to avoid:** Build separate `ScoreCardDisplay`, `ActionListDisplay`, `KeywordBadgesDisplay`, `RewriteDiffReadOnly` that accept static data as props.
[VERIFIED: analysis-panel.tsx useEffect at line 27; STATE.md pitfall "Duplicating AnalysisPanel on history detail page"]

### Pitfall 4: Status enum is lowercase in DB, uppercase in UI
**What goes wrong:** Saving `'Saved'` to the DB fails the pgEnum constraint (valid values are lowercase).
**Why it happens:** UI displays "Saved" but schema enum is `'saved'`.
**How to avoid:** Always pass lowercase values to `updateApplicationStatus()`. Display label mapping lives only in the UI layer.
[VERIFIED: schema.ts applicationStatusEnum]

### Pitfall 5: getApplicationById returns null for other users' records (not 404)
**What goes wrong:** Navigating to `/history/[id]` for an ID that belongs to another user renders a blank page or throws.
**Why it happens:** `getApplicationById` returns `null` when the WHERE clause matches zero rows (IDOR guard working correctly).
**How to avoid:** Check `if (!application) notFound()` immediately after the DAL call in the Server Component.
[VERIFIED: dal.ts lines 44-51]

### Pitfall 6: Re-run pre-population needs a client-side data fetch
**What goes wrong:** Home page is `'use client'` — it cannot call DAL functions directly. Trying to import `getApplicationById` from `dal.ts` (which has `import 'server-only'`) in a client component throws a build error.
**Why it happens:** `dal.ts` has `import 'server-only'` at line 1.
**How to avoid:** Create a thin GET route handler `/api/applications/[id]/prefill` that calls `verifySession()` + `getApplicationById()` and returns `{ resumeText, jdText }`. The client component fetches this endpoint.
[VERIFIED: dal.ts line 1 "import 'server-only'"]

---

## Code Examples

### History List Page (Server Component)

```typescript
// src/app/history/page.tsx
// Source: dal.ts (verified) + page.md (verified)
import { verifySession, getApplications } from '@/lib/dal'
import { AuthHeader } from '@/components/auth-header'

export default async function HistoryPage() {
  const { userId, user } = await verifySession()
  const applications = await getApplications(userId)

  return (
    <>
      <AuthHeader userEmail={user.email} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">
          My Applications
        </h1>
        {applications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {applications.map(app => (
              <ApplicationRow key={app.id} application={app} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
```

### Detail Page (Server Component)

```typescript
// src/app/history/[id]/page.tsx
// Source: dal.ts + route.md (params as Promise, verified)
import { verifySession, getApplicationById } from '@/lib/dal'
import { notFound } from 'next/navigation'

export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, user } = await verifySession()
  const application = await getApplicationById(userId, id)
  if (!application) notFound()

  return (
    <>
      <AuthHeader userEmail={user.email} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* ... */}
      </main>
    </>
  )
}
```

### PATCH Status Route Handler

```typescript
// src/app/api/applications/[id]/status/route.ts
// Source: route.md (params as Promise, verified) + dal.ts (verified)
import { NextRequest } from 'next/server'
import { verifySession, updateApplicationStatus } from '@/lib/dal'
import type { ApplicationStatus } from '@/lib/db/schema'

const VALID_STATUSES: ApplicationStatus[] = ['saved', 'applied', 'interviewing', 'offer', 'rejected']

export async function PATCH(
  request: NextRequest,
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

  await updateApplicationStatus(userId, id, status as ApplicationStatus)
  return new Response(null, { status: 204 })
}
```

### Re-run Prefill Route Handler

```typescript
// src/app/api/applications/[id]/prefill/route.ts
// Needed because page.tsx is 'use client' and cannot call dal.ts directly
import { NextRequest } from 'next/server'
import { verifySession, getApplicationById } from '@/lib/dal'

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

### Home Page Re-run Support (searchParams with use())

```typescript
// src/app/page.tsx — additions only
'use client'
import { use, useState, useEffect } from 'react'

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string }>
}) {
  const { applicationId } = use(searchParams)
  const [resumeText, setResumeText] = useState('')
  const [jdText, setJdText] = useState('')
  // ...

  useEffect(() => {
    if (!applicationId) return
    fetch(`/api/applications/${applicationId}/prefill`)
      .then(r => r.json())
      .then(({ resumeText, jdText }) => {
        setResumeText(resumeText)
        setJdText(jdText)
      })
  }, [applicationId])

  // panels receive resumeText/jdText as initialValue props
}
```

**Note:** ResumePanel and JobDescriptionPanel currently use `onReady` callbacks and manage their own internal state. If they don't accept an `initialValue` prop, they will need a small prop addition to support pre-population. [VERIFIED: resume-panel.tsx import observed in page.tsx — need to verify internal props]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware()` | `proxy.ts` + `export function proxy()` | Next.js 16.0.0 | File is already renamed in this project — no action needed |
| `params` and `searchParams` as sync objects | Both are Promises — `await params`, `use(searchParams)` | Next.js 15.0.0-RC | Must use async/use() access pattern |
| `getSessionCookie` for full auth check | Only for lightweight proxy cookie checks — full auth via `auth.api.getSession()` | better-auth 1.x | proxy.ts uses cookie check; DAL uses full session |

**Already correct in this project:**
- `proxy.ts` is already named and exported correctly [VERIFIED: proxy.ts]
- `verifySession()` correctly uses `auth.api.getSession({ headers: await headers() })` [VERIFIED: dal.ts]

---

## Open Questions

1. **ResumePanel and JobDescriptionPanel `initialValue` props**
   - What we know: Both panels manage their own state internally (textarea + file upload). page.tsx calls `setResumeText`/`setJdText` via `onReady` callbacks.
   - What's unclear: Whether these panels accept an `initialValue` prop for pre-population. If not, they need a small addition to support re-run pre-fill.
   - Recommendation: Read `resume-panel.tsx` and `jd-panel.tsx` before planning Wave detail — add `initialValue?: string` prop + `useEffect` to sync if absent.

2. **getApplications() ordering — newest first vs oldest first**
   - What we know: `getApplications()` currently uses `.orderBy(applications.createdAt)` — that's ascending (oldest first).
   - What's unclear: The UI-SPEC doesn't specify order direction. Newest-first is more useful for a history list.
   - Recommendation: Plan should add `.orderBy(desc(applications.createdAt))` to the DAL call or add an `orderBy` parameter. Low-risk change.

3. **AuthHeader sign-out redirect target**
   - What we know: `signOut()` from `better-auth/react` takes a `callbackURL` option. UI-SPEC says "redirects to /sign-in".
   - What's unclear: `authClient.signOut({ callbackURL: '/sign-in' })` vs `router.push('/sign-in')` after `signOut()`. Need to check actual better-auth signOut signature.
   - Recommendation: Use `signOut({ fetchOptions: { onSuccess: () => router.push('/sign-in') } })` — safe pattern seen in better-auth docs. [ASSUMED]

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | ✓ | detected | — |
| Neon DB (DATABASE_URL) | getApplications(), getApplicationById(), updateApplicationStatus() | Assumed provisioned in Phase 5 | — | — |
| shadcn CLI | `npx shadcn add select` | ✓ | 4.8.0 (package.json) | — |

**Missing dependencies with no fallback:** none (all Phase 5/6 infra assumed complete per ROADMAP.md)

Step 2.6: Environment audit abbreviated — Phase 7 depends on work completed in Phases 5–6 (DB provisioned, DAL operational). If Phase 5–6 are incomplete, Phase 7 is blocked regardless.

---

## Validation Architecture

> `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. This section is SKIPPED.

---

## Security Domain

### IDOR Protection (Primary Concern)

Every data operation involving an application ID must enforce `userId` ownership:

| Operation | Enforced By | Verified |
|-----------|-------------|---------|
| GET history list | `getApplications(userId)` WHERE clause | dal.ts line 40 |
| GET application detail | `getApplicationById(userId, id)` WHERE clause | dal.ts line 47 |
| PATCH status update | `updateApplicationStatus(userId, id, ...)` WHERE clause | dal.ts line 79 |
| GET prefill (re-run) | `getApplicationById(userId, id)` WHERE clause | dal.ts line 47 |

No application ID operation reaches the DB without userId scoping. A user cannot read or modify another user's application by guessing an ID.

### Input Validation on PATCH

The `status` field from the request body must be validated against the known enum values before passing to Drizzle. Drizzle will not throw on invalid enum values at the ORM layer — the error surfaces as a Postgres constraint violation which returns a 500. Validate explicitly:

```typescript
const VALID_STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected']
if (!VALID_STATUSES.includes(status)) return Response.json({ error: 'Invalid status' }, { status: 400 })
```

### No New Auth Surface

The `/api/applications/[id]/status` PATCH and `/api/applications/[id]/prefill` GET handlers use the same `verifySession()` pattern as the existing SSE routes. No new auth mechanism is introduced. [VERIFIED: analyse/route.ts pattern]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | better-auth `signOut()` accepts `fetchOptions.onSuccess` callback for redirect | Open Questions #3 | Sign-out doesn't redirect — user stays on page. Low risk; fallback is `router.push('/sign-in')` after `await signOut()` |
| A2 | `npx shadcn@4.8.0 add select` installs without conflict in this project | Standard Stack | Select might have peer dep conflict — unlikely given other Radix components work |
| A3 | Phase 5 DB is provisioned and Phase 6 save logic is operational | Environment Availability | Phase 7 cannot function if Phase 5/6 incomplete |
| A4 | `getApplications()` ordering should be newest-first (desc) | Open Questions #2 | List shows oldest applications first — cosmetic UX issue, easily fixed |

---

## Sources

### Primary (HIGH confidence)

- `src/lib/dal.ts` — verified function signatures, return types, IDOR guards
- `src/lib/db/schema.ts` — verified column names, enum values, types
- `src/components/*.tsx` — verified existing component props and streaming dependencies
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` — `searchParams`/`params` as Promises
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler `params` as Promise, PATCH pattern
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — confirms middleware→proxy rename in Next.js 16
- `proxy.ts` — confirmed `/history` guard uses `getSessionCookie()` (lightweight, not full session)
- `src/lib/auth-client.ts` — confirmed `signOut` export from better-auth/react
- `.planning/phases/07-history-ui/07-UI-SPEC.md` — component inventory, layout contracts, interaction contracts
- `.planning/STATE.md` — locked decisions (re-run via query param, read-only components, metadata-only list query)

### Secondary (MEDIUM confidence)

- `package.json` — version numbers for all installed dependencies

### Tertiary (LOW confidence — tagged [ASSUMED])

- better-auth `signOut()` exact callback API — not verified against installed package

---

## Metadata

**Confidence breakdown:**
- DAL signatures and return types: HIGH — read directly from source files
- Next.js 16 API (searchParams/params as Promises): HIGH — verified from local docs
- Component props and streaming behavior: HIGH — read directly from source files
- shadcn Select install: HIGH — shadcn 4.8.0 in package.json, Radix ecosystem consistent
- Re-run flow pattern (prefill route): MEDIUM — architectural reasoning from constraints; exact implementation TBD by planner
- better-auth signOut callback: LOW — [ASSUMED]

**Research date:** 2026-05-26
**Valid until:** 2026-06-25 (stable Next.js + better-auth — 30-day window)
