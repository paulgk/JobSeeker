import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextRequest } from 'next/server'
import { AnalyseRequestSchema, AnalysisResultSchema, type AnalysisResult } from '@/lib/schemas'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/analysis-prompt'

export const dynamic = 'force-dynamic' // Prevent Next.js/Vercel CDN caching of SSE route
export const runtime = 'nodejs' // Node runtime for 60s timeout (not Edge's 10s)
export const maxDuration = 60 // Cap runaway calls; well above typical 15-30s window

const MODEL = 'claude-haiku-4-5-20251001'

const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

const encoder = new TextEncoder()

function sseEvent(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

async function callWithRetry(
  userPrompt: string,
  onText: (t: string) => void,
  attempt = 0
): Promise<AnalysisResult> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: attempt === 0 ? 4096 : 6144,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    output_config: { format: zodOutputFormat(AnalysisResultSchema) },
  })
  stream.on('text', onText)
  const final = await stream.finalMessage()
  if (final.stop_reason !== 'end_turn' && attempt < 1) {
    onText('\n[Retrying for better accuracy...]\n')
    return callWithRetry(userPrompt, onText, attempt + 1)
  }
  if (!final.parsed_output) {
    throw new Error(`Schema validation failed: stop_reason=${final.stop_reason}`)
  }
  return final.parsed_output
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

  const userPrompt = buildUserPrompt(parsed.data.resumeText, parsed.data.jdText)

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEvent({ type: 'start' }))
      try {
        const result = await callWithRetry(userPrompt, (text) => {
          controller.enqueue(sseEvent({ type: 'chunk', content: text }))
        })
        controller.enqueue(sseEvent({ type: 'result', data: result }))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed'
        controller.enqueue(sseEvent({ type: 'error', message }))
      } finally {
        controller.enqueue(sseEvent({ type: 'done' }))
        controller.close()
      }
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
