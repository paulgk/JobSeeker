// src/lib/db/schema.ts
// Single source of truth for all Drizzle table definitions.
//
// Sections:
//   1. better-auth tables (inlined from auth-schema-generated.ts — hand-written for v1.6.11)
//   2. Application table (D-03 columns + D-04 pgEnum)
//   3. Exported types

import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  uuid,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { AnalysisResult, InterviewPrepResult } from '@/lib/schemas'

// ── better-auth tables ────────────────────────────────────────────────────────
// Inlined from the hand-written fallback (CLI cannot generate from memoryAdapter).
// Column names are camelCase to match better-auth's fieldName values exactly
// so the drizzle adapter can resolve schema[model][fieldName] correctly.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// ── Application table ─────────────────────────────────────────────────────────
// D-03: all required columns
// D-04: pgEnum for status (lowercase DB values; default 'saved')

export const applicationStatusEnum = pgEnum('application_status', [
  'saved',
  'applied',
  'interviewing',
  'offer',
  'rejected',
])

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('userId').notNull(),
  jobTitle: text('jobTitle').notNull(),
  company: text('company').notNull(),
  status: applicationStatusEnum('status').default('saved').notNull(),
  matchScore: integer('matchScore'),
  resumeText: text('resumeText').notNull(),
  jdText: text('jdText').notNull(),
  analysisData: jsonb('analysisData').$type<AnalysisResult>(),
  interviewData: jsonb('interviewData').$type<InterviewPrepResult>(),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

// ── Exported types ────────────────────────────────────────────────────────────

export type Application = typeof applications.$inferSelect
export type ApplicationInsert = typeof applications.$inferInsert
export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number]
