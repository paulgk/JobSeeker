---
path: /Volumes/Ext/GenAI/JobSeeker/src/lib/sanitize.ts
type: util
updated: 2026-05-22
status: active
---

# sanitize.ts

## Purpose

Provides prompt injection defense by wrapping user-supplied content in XML tags. Strips any attempt to close or reopen the wrapping tag from the content before embedding, preventing tag-escape attacks in Claude API prompts.

## Exports

- `wrapUserContent(content: string, tag: string): string` — Sanitizes and wraps a string in the given XML tag for safe embedding in Claude prompt user turns.

## Dependencies

None

## Used By

TBD

## Notes

Intended for use in Phase 2 when passing resume text and job descriptions into the Claude API; content should be embedded in the user turn, not the system prompt.