import { NextRequest } from 'next/server'
import { verifySession, updateApplicationMeta } from '@/lib/dal'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth guard — copied verbatim from src/app/api/applications/[id]/status/route.ts
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

  const { company, jobTitle } = body as { company: unknown; jobTitle: unknown }
  if (typeof company !== 'string' || company.trim() === '') {
    return Response.json({ error: 'company is required' }, { status: 400 })
  }
  if (typeof jobTitle !== 'string' || jobTitle.trim() === '') {
    return Response.json({ error: 'jobTitle is required' }, { status: 400 })
  }

  await updateApplicationMeta(userId, id, { company: company.trim(), jobTitle: jobTitle.trim() })

  return new Response(null, { status: 204 })
}
