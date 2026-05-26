import { NextRequest } from 'next/server'
import { verifySession, getApplicationById } from '@/lib/dal'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string
  try {
    const session = await verifySession()
    userId = session.userId
  } catch {
    return new Response(null, { status: 401 })
  }
  const { id } = await params
  const app = await getApplicationById(userId, id)
  if (!app) return new Response(null, { status: 404 })
  return Response.json({ resumeText: app.resumeText, jdText: app.jdText })
}
