import 'server-only'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { ApplicationStatus } from '@/lib/db/schema'
import type { AnalysisResult } from '@/lib/schemas'

export type SaveApplicationInput = {
  jobTitle: string
  company: string
  resumeText: string
  jdText: string
  matchScore?: number | null
  analysisData?: AnalysisResult | null
}

export const verifySession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')
  return { isAuth: true as const, userId: session.user.id, user: session.user }
})

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

export const getApplicationById = cache(async (userId: string, id: string) => {
  const [row] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1)
  return row ?? null
})

export async function saveApplication(
  userId: string,
  data: SaveApplicationInput
): Promise<string> {
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
}

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
