---
path: /Volumes/Ext/GenAI/JobSeeker/src/lib/analysis-prompt.ts
type: util
updated: 2026-05-22
status: active
---

# analysis-prompt.ts

## Purpose

Defines the prompts used for AI-powered job match analysis. Exports a system prompt and a builder function that wraps user-supplied resume and job description text in sanitized XML tags for safe Claude API consumption.

## Exports

- `SYSTEM_PROMPT` — Static string defining the Claude system role and analysis instructions
- `buildUserPrompt(resumeText, jdText)` — Constructs the user-turn prompt by wrapping resume and JD content with sanitized XML delimiters

## Dependencies

- [[sanitize]] (`@/lib/sanitize`) — `wrapUserContent`

## Used By

TBD