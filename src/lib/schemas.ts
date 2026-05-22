import { z } from 'zod'

// ── Resume input ─────────────────────────────────────────────────────────────

export const ParseResumeResponseSchema = z.object({
  text: z.string().min(1),
})
export type ParseResumeResponse = z.infer<typeof ParseResumeResponseSchema>

// For the paste-text path (JSON body, not FormData)
export const ParseResumeTextRequestSchema = z.object({
  text: z.string().min(200, 'Resume text must be at least 200 characters'),
})
export type ParseResumeTextRequest = z.infer<typeof ParseResumeTextRequestSchema>

// ── JD input ─────────────────────────────────────────────────────────────────

export const FetchJdRequestSchema = z.object({
  url: z.string().url('Must be a valid URL starting with https://'),
})
export type FetchJdRequest = z.infer<typeof FetchJdRequestSchema>

export const FetchJdResponseSchema = z.object({
  text: z.string().min(1),
})
export type FetchJdResponse = z.infer<typeof FetchJdResponseSchema>

// ── Analysis (Phase 2 LLM calls — schema established now) ────────────────────

export const AnalyseRequestSchema = z.object({
  resumeText: z.string().min(200, 'Resume must be at least 200 characters'),
  jdText: z.string().min(50, 'Job description must be at least 50 characters'),
})
export type AnalyseRequest = z.infer<typeof AnalyseRequestSchema>

// SSE event shapes emitted by /api/analyse
export const AnalyseResponseEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('chunk'), content: z.string() }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('done') }),
])
export type AnalyseResponseEvent = z.infer<typeof AnalyseResponseEventSchema>

// ── Shared error shape ────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z
    .enum(['INVALID_INPUT', 'PARSE_FAILED', 'FETCH_FAILED', 'RATE_LIMITED', 'SERVER_ERROR'])
    .optional(),
})
export type ApiError = z.infer<typeof ApiErrorSchema>
