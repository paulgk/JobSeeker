---
phase: 05-database-schema-and-dal
plan: "01"
subsystem: database
tags: [drizzle-orm, neon-postgres, better-auth, schema, postgresql]
dependency_graph:
  requires: []
  provides:
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - drizzle.config.ts
    - .env.example (DATABASE_URL placeholders)
  affects:
    - src/lib/auth.ts (Plan 03 will swap memoryAdapter for drizzleAdapter)
    - src/lib/dal.ts (Plan 03 will import Application/ApplicationStatus types)
    - drizzle migrations (Plan 02 will run drizzle-kit generate + migrate)
tech_stack:
  added:
    - drizzle-orm ^0.45.2 (query builder + type-safe ORM)
    - drizzle-kit ^0.31.10 (migration CLI)
    - "@neondatabase/serverless ^1.1.0 (Neon HTTP driver)"
    - "@better-auth/drizzle-adapter ^1.6.11 (auth adapter — wired in Plan 03)"
  patterns:
    - pgEnum for application_status (DB-level constraint)
    - jsonb().$type<T>() for JSONB type safety at compile time
    - drizzle() from neon-http (connection string, no neon() wrapper needed)
    - table.$inferSelect / $inferInsert for type exports
key_files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - drizzle.config.ts
  modified:
    - .env.example (appended DATABASE_URL / DATABASE_URL_UNPOOLED placeholders)
    - package.json (added drizzle-orm, drizzle-kit, @neondatabase/serverless, @better-auth/drizzle-adapter, better-auth)
decisions:
  - "Hand-wrote better-auth tables (fallback path): CLI cannot generate schema from memoryAdapter — throws 'memory is not supported'"
  - "camelCase column names in auth tables: match better-auth fieldName values so drizzle adapter resolves schema[model][fieldName] correctly"
  - "Deleted auth-schema-generated.ts after inlining: schema.ts is single source of truth, prevents accidental duplicate table definitions"
  - "No dotenv/config in index.ts: only drizzle.config.ts needs it for drizzle-kit; app uses Next.js env loading"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-26"
  tasks_completed: 3
  files_created: 3
  files_modified: 2
---

# Phase 5 Plan 01: Drizzle Schema, Neon Client, and drizzle-kit Config Summary

Drizzle schema with applications table + better-auth tables, typed neon-http db instance, drizzle-kit config pointing to DATABASE_URL_UNPOOLED, and .env.example placeholders — all type-checked with zero errors.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Generate better-auth tables | b1982ef | src/lib/db/auth-schema-generated.ts (then merged) |
| 2 | Author schema.ts and index.ts | e1c0b2d | src/lib/db/schema.ts, src/lib/db/index.ts |
| 3 | Add drizzle.config.ts and env placeholders | a3ed368 | drizzle.config.ts, .env.example |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] better-auth CLI cannot generate schema from memoryAdapter**
- **Found during:** Task 1
- **Issue:** `npx @better-auth/cli generate` threw `Error: memory is not supported. If it is a custom adapter, please request the maintainer to implement createSchema`. The plan documented this as the fallback path with instructions to hand-write the tables.
- **Fix:** Hand-wrote the four better-auth tables (user, session, account, verification) by reading `@better-auth/core/dist/db/get-tables.mjs` directly for field definitions. Used TEXT id columns (not UUID) and camelCase column names matching better-auth's fieldName values.
- **Generation path used:** Hand-written (fallback path — documented in plan Task 1 action)
- **Files modified:** src/lib/db/auth-schema-generated.ts (created, then merged and deleted in Task 2)
- **Commits:** b1982ef (create), e1c0b2d (merge + delete)

## Known Stubs

None. No placeholder values in any created files. DATABASE_URL placeholders in .env.example are intentionally empty (users must copy from Neon dashboard).

## Threat Flags

No new threat surface beyond what was modeled in the plan's `<threat_model>`:
- T-05-01 mitigated: .env.example has only empty placeholders; DATABASE_URL* not prefixed with NEXT_PUBLIC_
- T-05-02 mitigated: pgEnum + $type<> annotations enforce correctness

## Self-Check: PASSED

- [x] src/lib/db/schema.ts exists and contains `pgTable('applications'`
- [x] src/lib/db/index.ts exists and exports `db` via `drizzle-orm/neon-http`
- [x] drizzle.config.ts exists and references `DATABASE_URL_UNPOOLED!`
- [x] .env.example contains `DATABASE_URL=` and `DATABASE_URL_UNPOOLED=` (empty)
- [x] src/lib/db/auth-schema-generated.ts does not exist (merged into schema.ts)
- [x] `npx tsc --noEmit` exits 0
- [x] All task commits exist: b1982ef, e1c0b2d, a3ed368
