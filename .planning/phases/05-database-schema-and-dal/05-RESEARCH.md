# Phase 5: Database Schema and DAL - Research

**Researched:** 2026-05-26
**Domain:** Drizzle ORM + Neon Postgres + better-auth Drizzle adapter
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Single `applications` table, no separate snapshots table. One row = one saved analysis run.

**D-02:** `matchScore` as a dedicated integer column (denormalized from `analysisData` JSONB). Enables metadata-only list queries.

**D-03:** `applications` table columns: `id` (UUID PK), `userId` (FK → better-auth user.id), `jobTitle` (text), `company` (text), `status` (pgEnum, default `saved`), `matchScore` (integer, nullable), `resumeText` (text), `jdText` (text), `analysisData` (JSONB nullable), `interviewData` (JSONB nullable), `createdAt` (timestamptz), `updatedAt` (timestamptz, default now()).

**D-04:** Status type is a Drizzle `pgEnum`. Values: `saved`, `applied`, `interviewing`, `offer`, `rejected` (lowercase in DB). Default: `saved`.

**D-05:** Auth tables managed by better-auth via `@better-auth/drizzle-adapter`. Use `npx @better-auth/cli generate` to generate the better-auth schema — do NOT handwrite user/session/account/verification tables.

**D-06:** Replace `memoryAdapter` with Drizzle adapter in `src/lib/auth.ts`. The `db` instance from `src/lib/db/index.ts` is passed to `drizzleAdapter`. Remove `memoryDB` and `memoryAdapter` import.

**D-07:** JWT session mode — session table exists in schema (better-auth requires it) but stays empty at runtime.

**D-08:** Phase 5 delivers a complete, typed DAL in `src/lib/dal.ts`: `verifySession()` (existing, unchanged), `getApplications(userId)`, `getApplicationById(userId, id)`, `saveApplication(userId, data)`, `updateApplicationStatus(userId, id, status)`.

**D-09:** `getApplications` selects only `id`, `userId`, `jobTitle`, `company`, `status`, `matchScore`, `createdAt`, `updatedAt`. Never selects blob columns.

**D-10:** DB files at `src/lib/db/`: `schema.ts` (table definitions) and `index.ts` (db client).

**D-11:** `dal.ts` stays at `src/lib/dal.ts`.

**D-12:** `drizzle.config.ts` at project root, uses `DATABASE_URL_UNPOOLED` for migrations.

### Claude's Discretion

All D-xx decisions were made by Claude — user delegated fully. Treat all as locked.

### Deferred Ideas (OUT OF SCOPE)

- UX review polish pass — deferred to Phase 7.
- Score trend chart per application (HIST-V2-01) — v2 requirement.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Neon Postgres database provisioned and connected via Drizzle ORM | drizzle-orm 0.45.2 + @neondatabase/serverless 1.1.0 installed; neon-http driver confirmed; drizzle.config.ts pattern verified |
| DATA-02 | Schema covers users, applications, and analysis snapshots (score, action items, keyword gaps, accepted rewrites, interview Q+A) | better-auth generates user/session/account/verification; applications table covers analysis JSONB; schema patterns verified against drizzle-orm docs |
| DATA-03 | Resume text and JD text stored per snapshot (required for re-run) | `resumeText` + `jdText` as dedicated `text` columns in applications table per D-03 |
</phase_requirements>

---

## Summary

Phase 5 wires Neon Postgres into the Next.js 16 App Router project using Drizzle ORM as the query layer and better-auth's Drizzle adapter replacing the current memory adapter. The three key artifacts are: (1) `src/lib/db/schema.ts` with the `applications` table and better-auth tables, (2) `src/lib/db/index.ts` with the Neon HTTP client, and (3) `src/lib/dal.ts` expanded with four new typed functions.

All three packages needed for this phase (`drizzle-orm ^0.45.2`, `drizzle-kit ^0.31.10`, `@neondatabase/serverless ^1.1.0`) were verified as legitimate by slopcheck and are now present in `package.json` — they were installed during research. This means the install step in the plan is already done; the plan should skip `npm install` for these three packages and proceed directly to configuration.

The migration workflow is: run `npx @better-auth/cli generate` to generate the better-auth tables into `schema.ts`, manually add the `applications` table to the same file, then run `npx drizzle-kit generate` to produce SQL migration files, then `npx drizzle-kit migrate` (using `DATABASE_URL_UNPOOLED`) to apply them. The two environment variables (`DATABASE_URL` and `DATABASE_URL_UNPOOLED`) are not yet in `.env.local` or `.env.example` — both files need updating.

**Primary recommendation:** Follow the generate-then-migrate workflow (not `drizzle-kit push`) so migration files are committed to source control. Pass `import * as schema from './schema'` to both `drizzle()` and `drizzleAdapter()`. Use `drizzle-orm/neon-http` (HTTP driver) for serverless correctness.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Database connection + pooling | Database/Storage | — | Neon HTTP driver handles connection; pooled URL for app queries, unpooled for migrations |
| Schema definition + migration | Database/Storage | — | Drizzle schema + drizzle-kit; no Next.js involvement |
| Auth table management | Database/Storage | API/Backend | better-auth owns user/session/account/verification schema; drizzle adapter translates |
| DAL functions (CRUD) | API/Backend | — | server-only module; all functions are server-side, consumed by route handlers and RSCs |
| Session verification | API/Backend | — | verifySession() in dal.ts; stays unchanged from Phase 4 |
| JSONB type safety | Database/Storage | — | drizzle `.$type<T>()` annotation at schema definition time |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.2 | Query builder + type-safe ORM for Postgres | Official recommendation for Neon + Next.js; TypeScript-first; no `any` leakage |
| drizzle-kit | ^0.31.10 | Migration CLI (generate + migrate) | Paired with drizzle-orm; handles schema diffing and migration files |
| @neondatabase/serverless | ^1.1.0 | Neon HTTP driver for stateless serverless environments | Correct driver for Vercel/serverless; HTTP is faster than WebSockets for single queries |

[VERIFIED: npm registry — slopcheck OK, all three confirmed via `npm view` on 2026-05-26]

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @better-auth/drizzle-adapter | ^1.6.11 | Connects better-auth to Drizzle db instance | Used in auth.ts when switching from memoryAdapter |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| drizzle-orm neon-http | drizzle-orm neon-serverless (WebSockets) | WebSockets supports interactive transactions but heavier for single-query serverless routes |
| drizzle-kit generate + migrate | drizzle-kit push | push is for development only; generate+migrate produces committed SQL migration files |
| npx @better-auth/cli generate | handwriting user/session/account tables | CLI generates correct column types and constraints for the installed better-auth version |

**Installation:** Already done during research (slopcheck invoked npm install). No install step needed in the plan.

**Version verification:** Confirmed via npm registry on 2026-05-26:
- drizzle-orm 0.45.2 (published 2026-05-22)
- drizzle-kit 0.31.10 (published 2026-05-22)
- @neondatabase/serverless 1.1.0 (published 2026-04-17)

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| drizzle-orm | npm | ~3 yrs | Very high | github.com/drizzle-team/drizzle-orm | [OK] | Approved |
| drizzle-kit | npm | ~3 yrs | Very high | github.com/drizzle-team/drizzle-orm | [OK] | Approved |
| @neondatabase/serverless | npm | ~2 yrs | Very high | github.com/neondatabase/serverless-driver | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck v0.6.1 was available and ran successfully on 2026-05-26.*

---

## Architecture Patterns

### System Architecture Diagram

```
.env.local
  DATABASE_URL (pooled)          ─→ src/lib/db/index.ts (drizzle + neon-http) ─→ dal.ts
  DATABASE_URL_UNPOOLED (direct) ─→ drizzle.config.ts ─→ drizzle-kit migrate

src/lib/db/
  schema.ts
    better-auth tables (generated): user, session, account, verification
    app table (handwritten): applications (pgEnum + JSONB + uuid)
  index.ts
    neon = neon(DATABASE_URL)
    export db = drizzle(neon, { schema })

src/lib/auth.ts
    drizzleAdapter(db, { provider: 'pg', schema }) replaces memoryAdapter

src/lib/dal.ts  [server-only]
    verifySession()            ← unchanged
    getApplications()          ← new — metadata columns only
    getApplicationById()       ← new — full row
    saveApplication()          ← new — insert, returns id
    updateApplicationStatus()  ← new — PATCH status column
          ↓
    Route handlers (Phase 6) and RSCs (Phase 7) import from dal.ts
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts        # Drizzle table definitions + exported types
│   │   └── index.ts         # Neon client + drizzle() instance
│   ├── auth.ts              # Modified: memoryAdapter → drizzleAdapter
│   └── dal.ts               # Expanded: verifySession + 4 new functions
├── ...
drizzle/                     # Migration SQL files (generated by drizzle-kit)
drizzle.config.ts            # Project root — drizzle-kit config
```

### Pattern 1: Neon HTTP client + drizzle db instance

**What:** Initialize the Neon HTTP driver then wrap it with drizzle, passing the full schema for relational type safety.

**When to use:** Every serverless/edge environment where persistent connections are not available.

```typescript
// Source: orm.drizzle.team/docs/get-started/neon-new [VERIFIED]
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

Note: `drizzle()` from `drizzle-orm/neon-http` accepts a connection string directly — no separate `neon()` call required with this pattern.

### Pattern 2: drizzle.config.ts with unpooled URL

**What:** drizzle-kit reads this file for the migration database connection. Must use the unpooled URL — pooled connections (PgBouncer transaction mode) break migrations.

**When to use:** Always for `drizzle-kit generate` and `drizzle-kit migrate`.

```typescript
// Source: orm.drizzle.team/docs/drizzle-config-file [VERIFIED]
// drizzle.config.ts (project root)
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
})
```

### Pattern 3: pgEnum + JSONB with $type<T>()

**What:** Define status enum at DB level; annotate JSONB columns with TypeScript type for compile-time safety.

**When to use:** Any column with a constrained set of string values (pgEnum) or a structured JSON payload ($type).

```typescript
// Source: orm.drizzle.team/docs/column-types/pg [VERIFIED]
import { pgEnum, pgTable, jsonb, text, uuid, integer, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { AnalysisResult, InterviewPrepResult } from '@/lib/schemas'

export const applicationStatusEnum = pgEnum('application_status', [
  'saved', 'applied', 'interviewing', 'offer', 'rejected',
])

export const applications = pgTable('applications', {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`),
  userId: text().notNull(),
  jobTitle: text().notNull(),
  company: text().notNull(),
  status: applicationStatusEnum().default('saved').notNull(),
  matchScore: integer(),
  resumeText: text().notNull(),
  jdText: text().notNull(),
  analysisData: jsonb().$type<AnalysisResult>(),
  interviewData: jsonb().$type<InterviewPrepResult>(),
  createdAt: timestamp({ withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp({ withTimezone: true }).default(sql`now()`).notNull(),
})
```

### Pattern 4: Drizzle adapter in auth.ts

**What:** Replace memoryAdapter with drizzleAdapter. Pass the full schema so better-auth can find its tables by name.

**When to use:** Any better-auth setup that persists auth data to a real database.

```typescript
// Source: better-auth.com/docs/adapters/drizzle [CITED]
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { nextCookies } from 'better-auth/next-js'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
})
```

### Pattern 5: Partial select (metadata-only list query)

**What:** Select specific columns excluding large JSONB blobs. Drizzle infers the result type correctly.

**When to use:** `getApplications()` list query per D-09.

```typescript
// Source: orm.drizzle.team/docs/select [VERIFIED]
import { eq } from 'drizzle-orm'

export async function getApplications(userId: string) {
  return db
    .select({
      id: applications.id,
      userId: applications.userId,
      jobTitle: applications.jobTitle,
      company: applications.company,
      status: applications.status,
      matchScore: applications.matchScore,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(applications.createdAt)
}
```

### Pattern 6: Insert with returning

**What:** Insert a row and return the generated id.

```typescript
// Source: orm.drizzle.team/docs/select [VERIFIED]
const [row] = await db
  .insert(applications)
  .values({
    userId,
    jobTitle: data.jobTitle,
    company: data.company,
    resumeText: data.resumeText,
    jdText: data.jdText,
    matchScore: data.matchScore ?? null,
    analysisData: data.analysisData ?? null,
    interviewData: null,
  })
  .returning({ id: applications.id })
return row.id
```

### Pattern 7: InferSelectModel for exported types

**What:** Derive TypeScript types from Drizzle table definitions. Use `$inferSelect` / `$inferInsert` shorthand or `InferSelectModel` from `drizzle-orm`.

```typescript
// Source: drizzle-orm/table.d.ts [VERIFIED: installed package]
import { InferSelectModel } from 'drizzle-orm'
import { applications } from './schema'

export type Application = InferSelectModel<typeof applications>
export type ApplicationStatus = typeof applicationStatusEnum.enumValues[number]
// Or use table.$inferSelect / table.$inferInsert as shorthand
```

### Anti-Patterns to Avoid

- **`drizzle-kit push` in the plan:** push does not generate migration files and cannot be rolled back. Use `generate` then `migrate`.
- **Using `DATABASE_URL` (pooled) in drizzle.config.ts:** PgBouncer transaction mode breaks migration scripts. `DATABASE_URL_UNPOOLED` must be used.
- **Not passing `schema` to `drizzleAdapter`:** Omitting schema causes `TypeError: undefined is not an object (evaluating 'e._.fullSchema')` at runtime when better-auth tries to look up tables. [CITED: github.com/better-auth/better-auth/issues/1163]
- **Handwriting user/session/account/verification tables:** The better-auth CLI generates the correct column types and constraints for the installed version. Handwritten tables risk column name mismatches (e.g., camelCase vs snake_case).
- **Selecting `resumeText`, `jdText`, `analysisData`, `interviewData` in the list query:** These are large columns; selecting them in the list view transfers unnecessary data. D-09 is explicit: metadata columns only.
- **`import 'server-only'` absent from dal.ts:** Already present and must be preserved. All new functions added to dal.ts are server-only by this existing import.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth table schema | Manual user/session/account/verification pgTable definitions | `npx @better-auth/cli generate` | better-auth's column names, types, and constraints must match what the library expects; mismatch = silent auth failures |
| Migration SQL | Hand-coded CREATE TABLE statements | `drizzle-kit generate` then `drizzle-kit migrate` | Drizzle diffing handles column renames, enum changes, and constraint drops safely |
| JSONB type casting | Manual JSON.parse/stringify in DAL functions | `jsonb().$type<T>()` in schema | Drizzle handles serialization; $type provides compile-time type checking |
| Column exclusion in list query | Post-query object spread to delete keys | `db.select({ col1, col2, ... })` explicit column list | Explicit column selection avoids transferring blob data entirely over the network |
| Connection pooling logic | Custom retry/pool management | `DATABASE_URL` (Neon pooled via PgBouncer) for app queries | Neon manages pooling transparently via the connection string |

**Key insight:** The entire migration + schema workflow is handled by drizzle-kit + better-auth CLI. The only custom code needed is the `applications` table definition and the DAL functions.

---

## Common Pitfalls

### Pitfall 1: Pooled URL used for migrations
**What goes wrong:** `drizzle-kit migrate` hangs or fails with transaction errors.
**Why it happens:** Neon's pooled endpoint uses PgBouncer in transaction mode, which breaks multi-statement migration scripts.
**How to avoid:** `drizzle.config.ts` must reference `DATABASE_URL_UNPOOLED`, not `DATABASE_URL`. App queries at runtime use `DATABASE_URL` (pooled).
**Warning signs:** `drizzle-kit migrate` times out or returns `ERROR: prepared statement already exists`.

### Pitfall 2: Schema not passed to drizzleAdapter
**What goes wrong:** `TypeError: undefined is not an object (evaluating 'e._.fullSchema')` at signup/login.
**Why it happens:** The drizzle adapter uses the schema object to resolve table names. Without it, it cannot find the user table.
**How to avoid:** Pass `import * as schema from '@/lib/db/schema'` to both `drizzle(neon, { schema })` and `drizzleAdapter(db, { provider: 'pg', schema })`.
**Warning signs:** Runtime error on first auth operation even though schema and db instance appear correct.

### Pitfall 3: better-auth CLI overwrites schema.ts
**What goes wrong:** Running `npx @better-auth/cli generate` after the applications table is added to schema.ts overwrites the file with only the auth tables.
**Why it happens:** The CLI generates a fresh schema file, not a merge.
**How to avoid:** Run `npx @better-auth/cli generate` first (to a separate file or with `--output` flag), then manually incorporate the output into `schema.ts` alongside the applications table. Do NOT re-run the CLI after schema.ts is finalized.
**Warning signs:** Applications table disappears from schema.ts after CLI run.

### Pitfall 4: camelCase column names in generated better-auth schema
**What goes wrong:** Columns like `emailVerified`, `createdAt`, `updatedAt` require double-quoting in raw SQL queries. Drizzle handles this correctly, but external tools (psql, pg Admin) may need `"emailVerified"` syntax.
**Why it happens:** better-auth defaults to camelCase column names in generated Drizzle schemas.
**How to avoid:** This is acceptable for Drizzle-only access. Be aware when writing raw SQL or using psql for debugging.
**Warning signs:** SQL queries without quoted column names return no results or errors in psql.

### Pitfall 5: DATABASE_URL and DATABASE_URL_UNPOOLED not in .env.local
**What goes wrong:** `drizzle-kit migrate` fails with missing env var. App queries at runtime fail.
**Why it happens:** Neither variable exists in `.env.local` or `.env.example` at Phase 4 completion.
**How to avoid:** Phase 5 must add both variables to `.env.local` (with real values from Neon dashboard) and add placeholder entries to `.env.example`.
**Warning signs:** `process.env.DATABASE_URL is undefined` error on startup or `drizzle-kit migrate` exits immediately.

### Pitfall 6: pgEnum not matched between schema.ts and DB
**What goes wrong:** Inserting a valid enum value fails with `invalid input value for enum application_status`.
**Why it happens:** The enum type name in `pgEnum('application_status', [...])` must match the name in the migration SQL. If schema.ts is edited after migration, a new migration must be generated and applied.
**How to avoid:** Run `drizzle-kit generate` every time schema.ts changes, then apply the migration.
**Warning signs:** DB insert errors mentioning enum type name despite TypeScript showing no error.

---

## Code Examples

### Complete schema.ts structure

```typescript
// Source: orm.drizzle.team/docs/column-types/pg [VERIFIED] + better-auth generated tables
// src/lib/db/schema.ts

// === better-auth generated tables (from npx @better-auth/cli generate) ===
// paste output from CLI here: user, session, account, verification pgTable definitions

// === Application table ===
import {
  pgTable, pgEnum, uuid, text, integer,
  timestamp, jsonb, boolean,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { AnalysisResult } from '@/lib/schemas'
import type { InterviewPrepResult } from '@/lib/schemas'

export const applicationStatusEnum = pgEnum('application_status', [
  'saved', 'applied', 'interviewing', 'offer', 'rejected',
])

export const applications = pgTable('applications', {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`),
  userId: text().notNull(),
  jobTitle: text().notNull(),
  company: text().notNull(),
  status: applicationStatusEnum().default('saved').notNull(),
  matchScore: integer(),
  resumeText: text().notNull(),
  jdText: text().notNull(),
  analysisData: jsonb().$type<AnalysisResult>(),
  interviewData: jsonb().$type<InterviewPrepResult>(),
  createdAt: timestamp({ withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp({ withTimezone: true }).default(sql`now()`).notNull(),
})

export type Application = typeof applications.$inferSelect
export type ApplicationInsert = typeof applications.$inferInsert
export type ApplicationStatus = typeof applicationStatusEnum.enumValues[number]
```

### db/index.ts

```typescript
// Source: orm.drizzle.team/docs/get-started/neon-new [VERIFIED]
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

### Migration workflow commands

```bash
# Step 1: Generate better-auth schema (run once; output goes into schema.ts)
npx @better-auth/cli generate --output ./src/lib/db/auth-schema-generated.ts

# Step 2: Incorporate generated tables into schema.ts, then add applications table

# Step 3: Generate migration SQL files
npx drizzle-kit generate

# Step 4: Apply migrations (uses DATABASE_URL_UNPOOLED from drizzle.config.ts)
npx drizzle-kit migrate
```

### DAL type definitions

```typescript
// src/lib/dal.ts additions
import type { ApplicationStatus } from '@/lib/db/schema'

export type SaveApplicationInput = {
  jobTitle: string
  company: string
  resumeText: string
  jdText: string
  matchScore?: number | null
  analysisData?: AnalysisResult | null
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @vercel/postgres | @neondatabase/serverless | Dec 2024 (discontinued) | @vercel/postgres is dead; Neon HTTP driver is the replacement |
| next-auth with Drizzle | better-auth with Drizzle | 2025 | next-auth has blocking peer dep conflict with Next.js 16 |
| `drizzle-kit push` for dev | `drizzle-kit generate` + `migrate` | Current practice | push doesn't commit migration files; generate+migrate is production workflow |
| Separate InferSelectModel import | `table.$inferSelect` shorthand | drizzle-orm 0.30+ | Both work; `$inferSelect` is more ergonomic |

**Deprecated/outdated:**
- `@vercel/postgres`: discontinued Dec 2024; do not use.
- `next-auth`: breaks with Next.js 16 peer deps; use better-auth.
- `InferModel<T>`: deprecated in favour of `InferSelectModel<T>` / `InferInsertModel<T>`.
- `drizzle-kit push`: development-only; produces no migration files; do not use in plans.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npx @better-auth/cli generate` is the correct CLI invocation (not `npx better-auth generate` or `bunx @better-auth/cli generate`) | Architecture Patterns / Pattern CLI | Wrong invocation → CLI not found or wrong package runs |
| A2 | The better-auth CLI generates camelCase column names by default (not snake_case) | Pitfall 4 | If snake_case, no issue — just different column names |
| A3 | The better-auth generated schema uses TEXT for id columns (not UUID) | Code Examples | If UUID, the FK from applications.userId must match type |

**Mitigation for A1:** The installed `better-auth` package does not expose a CLI binary (`bin: ""`). The CLI is a separate package `@better-auth/cli`. The search results showed `npx auth@latest generate` and `bunx @better-auth/cli generate` as alternatives. Plan should verify the exact invocation against the installed package or use `npx @better-auth/cli generate`.

**Mitigation for A3:** better-auth uses TEXT (string) IDs by default. The applications table uses `text().notNull()` for `userId` (not `uuid()`), matching this convention. This is consistent with the CONTEXT.md D-03 spec.

---

## Open Questions

1. **Neon database not yet provisioned**
   - What we know: `.env.local` has no `DATABASE_URL` or `DATABASE_URL_UNPOOLED` entries.
   - What's unclear: Whether the user has already created a Neon project and has the connection strings available.
   - Recommendation: The plan must include a checkpoint: "Provision Neon project (if not done), copy DATABASE_URL and DATABASE_URL_UNPOOLED from Neon dashboard into .env.local." This is a human step — drizzle-kit migrate cannot run until real credentials exist.

2. **better-auth CLI exact invocation**
   - What we know: The package `@better-auth/cli` exists on npm; `better-auth` itself exposes no bin. Search results show `npx @better-auth/cli generate` and `bunx @better-auth/cli generate`.
   - What's unclear: Whether `npx @better-auth/cli generate` works correctly or requires a specific version flag.
   - Recommendation: Plan should use `npx @better-auth/cli generate --output ./src/lib/db/auth-schema-generated.ts` and instruct the implementer to verify the output before merging into schema.ts.

3. **`updatedAt` trigger**
   - What we know: `updatedAt` column has `default(sql'now()')` which sets it on insert. On update, Drizzle does not auto-update this column — the caller must explicitly set it.
   - What's unclear: Whether Phase 5 should add a DB-level trigger or require callers to pass `updatedAt: new Date()`.
   - Recommendation: Require DAL functions to explicitly set `updatedAt: new Date()` on update. This is simpler than a trigger and keeps logic in TypeScript.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| drizzle-orm | db/index.ts | ✓ | 0.45.2 | — |
| drizzle-kit | drizzle-kit generate/migrate | ✓ | 0.31.10 | — |
| @neondatabase/serverless | db/index.ts | ✓ | 1.1.0 | — |
| @better-auth/drizzle-adapter | auth.ts | ✓ | 1.6.11 | — |
| Neon Postgres database | drizzle-kit migrate, all DAL functions | UNKNOWN | — | No fallback — human must provision |
| DATABASE_URL (env var) | app runtime queries | ✗ (not set) | — | No fallback — must be added to .env.local |
| DATABASE_URL_UNPOOLED (env var) | drizzle-kit migrate | ✗ (not set) | — | No fallback — must be added to .env.local |

**Missing dependencies with no fallback:**
- Neon database credentials: human must provision the Neon project and copy both connection strings into `.env.local`. The plan must include this as a `checkpoint:human` step before any drizzle-kit or runtime DB commands.

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

> `workflow.nyquist_validation` is `false` in `.planning/config.json` — this section is omitted per instructions.

---

## Security Domain

> `security_enforcement` is not set to `false` in config — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no — handled by better-auth | better-auth owns auth flow |
| V3 Session Management | no — JWT cookie, not DB sessions | better-auth + nextCookies() |
| V4 Access Control | yes | DAL functions must verify `userId` ownership before returning data |
| V5 Input Validation | yes | Drizzle parameterized queries prevent SQL injection |
| V6 Cryptography | no | No cryptographic operations in this phase |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — fetching another user's application | Elevation of Privilege | `getApplicationById(userId, id)` must include `and(eq(applications.id, id), eq(applications.userId, userId))` — never query by id alone |
| SQL injection via string interpolation | Tampering | Drizzle's query builder uses parameterized queries; never use `sql` template with unescaped user input |
| Exposing raw DB records to client | Information Disclosure | DAL functions return typed DTOs; blobs (resumeText, jdText, analysisData) must not be returned by list query |
| Environment variable leakage | Information Disclosure | `DATABASE_URL*` must never be prefixed with `NEXT_PUBLIC_`; dal.ts is `server-only` |

**IDOR prevention is the single most important security concern in this phase.** Every `getApplicationById` and `updateApplicationStatus` call must filter by both `id` AND `userId`.

---

## Sources

### Primary (HIGH confidence)
- `orm.drizzle.team/docs/get-started/neon-new` — Neon + Drizzle setup, drizzle() with connection string
- `orm.drizzle.team/docs/column-types/pg` — pgEnum, jsonb.$type, uuid default, timestamp withTimezone
- `orm.drizzle.team/docs/drizzle-config-file` — defineConfig, out, schema, dialect, dbCredentials
- `orm.drizzle.team/docs/select` — partial column select, getColumns(), returning()
- `drizzle-orm/neon-http/driver.d.ts` (installed package) — drizzle() function signature confirmed
- `drizzle-orm/table.d.ts` (installed package) — InferSelectModel, $inferSelect/$inferInsert confirmed
- `@better-auth/drizzle-adapter/dist/index.d.mts` (installed package) — drizzleAdapter() signature, DrizzleAdapterConfig
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md` — DAL pattern, server-only, DTO recommendation

### Secondary (MEDIUM confidence)
- `better-auth.com/docs/adapters/drizzle` — drizzleAdapter config with provider + schema
- `better-auth.com/docs/concepts/cli` — generate command, --output flag
- `neon.com/docs/guides/drizzle-migrations` — unpooled URL requirement for migrations

### Tertiary (LOW confidence)
- `github.com/better-auth/better-auth/issues/1163` — schema-required-for-adapter finding (user-reported issue, not official docs)
- `github.com/better-auth/better-auth/discussions/6052` — camelCase column naming behaviour (community discussion)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages installed, types verified against installed node_modules
- Architecture: HIGH — drizzle-orm/neon-http driver types read directly; auth adapter types read directly
- Pitfalls: MEDIUM — mix of official docs (pooled URL warning) and community reports (schema omission, CLI overwrite)
- better-auth CLI exact invocation: LOW — not in official docs read; inferred from search results

**Research date:** 2026-05-26
**Valid until:** 2026-06-26 (30 days — drizzle-orm and better-auth ship frequently; recheck if major version bumps occur)

---

## Implementation Notes for Planner

**Packages already installed:** `drizzle-orm ^0.45.2`, `drizzle-kit ^0.31.10`, `@neondatabase/serverless ^1.1.0` were installed into package.json during research (slopcheck ran npm install as a side effect). The plan's Wave 0 install task should verify these are in package.json rather than running npm install.

**File creation order matters:**
1. `drizzle.config.ts` — needed before any drizzle-kit commands
2. `src/lib/db/schema.ts` — better-auth tables first (from CLI), then applications table appended
3. `src/lib/db/index.ts` — depends on schema.ts existing
4. Migrations: `drizzle-kit generate` then `drizzle-kit migrate` — requires real DB credentials
5. `src/lib/auth.ts` — swap adapter (depends on db/index.ts)
6. `src/lib/dal.ts` — add new functions (depends on schema.ts types)
7. `.env.example` — add DATABASE_URL and DATABASE_URL_UNPOOLED placeholder entries

**Human checkpoint:** Neon database must be provisioned and credentials added to `.env.local` before drizzle-kit migrate can run. This is a manual step that cannot be automated.
