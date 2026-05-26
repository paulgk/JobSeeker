---
phase: 06-save-after-analysis
plan: "02"
subsystem: api-auth-guards
tags: [auth, verifySession, userId, wave-1]
dependency_graph:
  requires: []
  provides: [userId-captured-in-analyse, userId-captured-in-interview-questions]
  affects: [06-03-PLAN, 06-05-PLAN]
tech_stack:
  added: []
  patterns: [verifySession-capture-pattern]
key_files:
  created: []
  modified:
    - src/app/api/analyse/route.ts
    - src/app/api/interview-questions/route.ts
decisions:
  - "interview-critique/route.ts confirmed correct — no userId capture needed (route does not persist data)"
  - "userId declared as let outside try block per plan pattern — assigned inside try after verifySession()"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-26"
---

# Phase 06 Plan 02: Capture userId in Auth Guards Summary

Upgraded the auth guard in `analyse/route.ts` and `interview-questions/route.ts` to capture the `userId` returned by `verifySession()`. Confirmed `interview-critique/route.ts` already has a correct inline guard and requires no change.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Upgrade auth guard in analyse/route.ts | 7a9b4d8 | src/app/api/analyse/route.ts |
| 2 | Upgrade auth guard in interview-questions/route.ts | 7a9b4d8 | src/app/api/interview-questions/route.ts |
| 3 | Confirm interview-critique/route.ts guard is correct | (read-only) | src/app/api/interview-critique/route.ts |

## Changes Made

### analyse/route.ts (lines 47-53)

Before:
```typescript
try {
  await verifySession()
} catch {
  return new Response(null, { status: 401 })
}
```

After:
```typescript
let userId: string
try {
  const session = await verifySession()
  userId = session.userId
} catch {
  return new Response(null, { status: 401 })
}
```

### interview-questions/route.ts (lines 51-57)

Same pattern applied as above.

### interview-critique/route.ts

Confirmed unchanged. The route already has the correct inline try/catch auth guard at lines 22-27. The critique route does not persist data (SAVE-03 scope), so `userId` capture is not needed here.

## Verification

- `grep -c "session.userId" src/app/api/analyse/route.ts` → 1
- `grep -c "session.userId" src/app/api/interview-questions/route.ts` → 1
- `grep -c "verifySession" src/app/api/interview-critique/route.ts` → 2 (import + usage)
- `npx tsc --noEmit` → no errors

## Deviations from Plan

None — plan executed exactly as written. Tasks 1 and 2 were committed together in a single commit as they represent one logical change.

## Known Stubs

None.

## Self-Check: PASSED

- src/app/api/analyse/route.ts: modified, session.userId present
- src/app/api/interview-questions/route.ts: modified, session.userId present
- interview-critique/route.ts: confirmed correct, no change made
- Commit 7a9b4d8: exists
