# Phase 5: Database Schema and DAL - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 5-Database Schema and DAL
**Areas discussed:** Schema structure, better-auth adapter swap, DAL function scope, File/folder conventions

---

## All Areas — Claude's Discretion

| Option | Description | Selected |
|--------|-------------|----------|
| Discuss gray areas interactively | User selects areas and answers questions | |
| Delegate to Claude | Claude makes all implementation decisions | ✓ |

**User's choice:** "You know the best" — full delegation to Claude across all areas.
**Notes:** User explicitly delegated all implementation decisions. Claude applied decisions grounded in existing codebase patterns, STATE.md locked decisions, and architectural constraints.

---

## Claude's Discretion

All four gray areas were decided by Claude:

1. **Schema structure** — Single `applications` table with dedicated `matchScore` column (denormalized from JSONB for fast list queries). Status as pgEnum. JSONB columns typed via Drizzle `.$type<T>()`.
2. **better-auth adapter swap** — Replace `memoryAdapter` with Drizzle adapter; better-auth manages its own auth tables via schema generation.
3. **DAL function scope** — Complete, typed DAL delivered in Phase 5: `verifySession`, `getApplications`, `getApplicationById`, `saveApplication`, `updateApplicationStatus`. All implemented (not stubbed), even though Phase 6/7 are the callers.
4. **File/folder conventions** — `src/lib/db/schema.ts` + `src/lib/db/index.ts` for DB layer; `dal.ts` stays at `src/lib/dal.ts` to preserve Phase 4 import paths.

## Deferred Ideas

- UX review polish pass — pending todo from Phase 1/2, deferred to Phase 7
- Score trend chart (HIST-V2-01) — v2 requirement, out of v1.1 scope
