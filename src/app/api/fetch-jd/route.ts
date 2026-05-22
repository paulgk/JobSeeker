import { NextRequest } from 'next/server'
import { z } from 'zod'
import { fetchJdFromUrl } from '@/lib/scraper'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  url: z.string().url('Must be a valid URL starting with https://'),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Request body must be valid JSON', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request'
    return Response.json(
      { error: message, code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  try {
    const text = await fetchJdFromUrl(parsed.data.url)
    return Response.json({ text })
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to fetch job description. Try pasting the text instead.'

    return Response.json(
      { error: message, code: 'FETCH_FAILED' },
      { status: 422 }
    )
  }
}
