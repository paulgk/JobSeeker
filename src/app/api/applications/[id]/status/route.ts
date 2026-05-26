import { NextRequest } from 'next/server'
import { verifySession, updateApplicationStatus } from '@/lib/dal'
import type { ApplicationStatus } from '@/lib/db/schema'

const VALID_STATUSES: ApplicationStatus[] = [
  'saved',
  'applied',
  'interviewing',
  'offer',
  'rejected',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth guard — copied verbatim from src/app/api/analyse/route.ts lines 49-54
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
