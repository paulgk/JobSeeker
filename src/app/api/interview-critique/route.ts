import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { InterviewCritiqueRequestSchema } from '@/lib/schemas'
import { CRITIQUE_SYSTEM_PROMPT, buildCritiquePrompt } from '@/lib/interview-prompt'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const MODEL = 'claude-haiku-4-5-20251001'

const client = new Anthropic()

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

  const parsed = InterviewCritiqueRequestSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request'
    return Response.json({ error: message, code: 'INVALID_INPUT' }, { status: 400 })
  }

  const { question, modelAnswer, draftAnswer } = parsed.data
  const userPrompt = buildCritiquePrompt(question, modelAnswer, draftAnswer)

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEvent({ type: 'start' }))
      try {
        const llmStream = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: CRITIQUE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        })
        llmStream.on('text', (text) => {
          controller.enqueue(sseEvent({ type: 'chunk', content: text }))
        })
        await llmStream.finalMessage()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Critique failed'
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
      'X-Accel-Buffering': 'no',
    },
  })
}
