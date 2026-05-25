---
path: /Volumes/Ext/GenAI/JobSeeker/src/app/api/analyse/route.ts
type: api
updated: 2026-05-22
status: active
---

# route.ts

## Purpose

Next.js App Router POST endpoint that streams a resume-vs-job-description analysis via SSE. It calls Claude with structured output (Zod schema), retrying once with a larger token budget if the model stops early.

## Exports

- `dynamic` — `'force-dynamic'` constant; disables CDN caching for the SSE route
- `runtime` — `'nodejs'` constant; selects Node runtime for the 60 s timeout
- `maxDuration` — `60` constant; caps max Vercel function duration
- `POST` — async route handler; validates input, streams SSE events (start / chunk / result / error / done)

## Dependencies

- [[schemas]] — `AnalyseRequestSchema`, `AnalysisResultSchema`, `AnalysisResult`
- [[analysis-prompt]] — `SYSTEM_PROMPT`, `buildUserPrompt`
- `@anthropic-ai/sdk` — Anthropic client, streaming messages API
- `@anthropic-ai/sdk/helpers/zod` — `zodOutputFormat` for structured output
- `next/server` — `NextRequest` type

## Used By

TBD

## Notes

- `sseEvent` body is incomplete in source (returns `encoder.encode()` with no argument) — events will be empty bytes until fixed.
- Retry logic doubles `max_tokens` (4096 → 6144) on the second attempt when `stop_reason !== 'end_turn'`, limited to one retry.