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

// ── Analysis result shape (Phase 2 LLM response) ─────────────────────────────

const ScoreComponentSchema = z.object({
  name: z.string(),
  weight: z.number(),
  score: z.number(),
  rationale: z.string(),
})

const ActionItemSchema = z.object({
  rank: z.number(),
  title: z.string(),
  detail: z.string(),
  estimatedImpact: z.enum(['high', 'medium', 'low']),
})

const RewriteSectionSchema = z.object({
  sectionName: z.string(),
  originalText: z.string(),
  rewrittenText: z.string(),
})

export const AnalysisResultSchema = z.object({
  overallScore: z.number(),
  components: z.array(ScoreComponentSchema),
  actionItems: z.array(ActionItemSchema),
  keywordGaps: z.array(z.string()),
  rewrites: z.array(RewriteSectionSchema),
})
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// SSE event shapes emitted by /api/analyse
export const AnalyseResponseEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('chunk'), content: z.string() }),
  z.object({ type: z.literal('result'), data: AnalysisResultSchema }),
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

// ── Interview Preparation (Phase 3 LLM call) ──────────────────────────────────

export const InterviewQuestionsRequestSchema = z.object({
  resumeText: z.string().min(200, 'Resume must be at least 200 characters'),
  jdText: z.string().min(50, 'Job description must be at least 50 characters'),
})
export type InterviewQuestionsRequest = z.infer<typeof InterviewQuestionsRequestSchema>

const InterviewQuestionSchema = z.object({
  question: z.string(),
  category: z.enum(['behavioural', 'technical', 'situational', 'role-specific']),
  rationale: z.string(),
  modelAnswer: z.string(),
})

export const InterviewPrepResultSchema = z.object({
  questions: z.array(InterviewQuestionSchema).min(5).max(8),
  prepStrategy: z.object({
    seniorityLevel: z.string(),
    domainContext: z.string(),
    tips: z.array(z.string()),
  }),
})
export type InterviewPrepResult = z.infer<typeof InterviewPrepResultSchema>

// SSE event shapes emitted by /api/interview-questions
export const InterviewQuestionsEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('chunk'), content: z.string() }),
  z.object({ type: z.literal('result'), data: InterviewPrepResultSchema }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('done') }),
])

export const InterviewCritiqueRequestSchema = z.object({
  question: z.string().min(10),
  modelAnswer: z.string().min(50),
  draftAnswer: z.string().min(20, 'Answer must be at least 20 characters'),
})
export type InterviewCritiqueRequest = z.infer<typeof InterviewCritiqueRequestSchema>
