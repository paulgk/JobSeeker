import { NextRequest } from 'next/server'
import { AnalyseRequestSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic' // Prevent Next.js/Vercel CDN caching of SSE route
export const runtime = 'nodejs' // Node runtime for 60s timeout (not Edge's 10s)

const encoder = new TextEncoder()

function sseEvent(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

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

  const parsed = AnalyseRequestSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request'
    return Response.json({ error: message, code: 'INVALID_INPUT' }, { status: 400 })
  }

  // ── Phase 1: mock stream. Phase 2 replaces this block with Anthropic SDK streaming. ──
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEvent({ type: 'start' }))

      // Simulate processing delay
      await new Promise((r) => setTimeout(r, 500))
      controller.enqueue(
        sseEvent({
          type: 'chunk',
          content: '[Mock analysis — Phase 2 will replace this with real Claude output]',
        })
      )

      controller.enqueue(sseEvent({ type: 'done' }))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Prevents nginx from buffering the SSE stream
    },
  })
}
