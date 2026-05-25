---
path: /Volumes/Ext/GenAI/JobSeeker/src/lib/schemas.ts
type: model
updated: 2026-05-22
status: active
---

# schemas.ts

## Purpose

Defines all Zod schemas and inferred TypeScript types for API request/response shapes across the application. Single source of truth for data validation at system boundaries.

## Exports

- `ParseResumeResponseSchema` / `ParseResumeResponse` — Response shape for resume parsing endpoints (requires non-empty text)
- `ParseResumeTextRequestSchema` / `ParseResumeTextRequest` — Request body for paste-text resume path (min 200 chars)
- `FetchJdRequestSchema` / `FetchJdRequest` — Request body for JD fetch endpoint (validates URL format)
- `FetchJdResponseSchema` / `FetchJdResponse` — Response shape for JD fetch (non-empty text)
- `AnalyseRequestSchema` / `AnalyseRequest` — Request body for analysis endpoint (resumeText min 200, jdText min 50)
- `AnalysisResultSchema` / `AnalysisResult` — Full LLM analysis result with overallScore, components, actionItems, keywordGaps, and rewrites
- `AnalyseResponseEventSchema` / `AnalyseResponseEvent` — Discriminated union of SSE event types: start, chunk, result, error, done
- `ApiErrorSchema` / `ApiError` — Shared error response shape with optional typed error code enum

## Dependencies

zod

## Used By

TBD

## Notes

`ScoreComponentSchema`, `ActionItemSchema`, and `RewriteSectionSchema` are internal sub-schemas not exported directly; they compose into `AnalysisResultSchema`.