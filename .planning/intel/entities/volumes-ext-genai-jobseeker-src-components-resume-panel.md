---
path: /Volumes/Ext/GenAI/JobSeeker/src/components/resume-panel.tsx
type: component
updated: 2026-05-22
status: active
---

# resume-panel.tsx

## Purpose

Two-tab UI panel for ingesting a user's resume — either by uploading a PDF (which is sent to `/api/parse-resume` for extraction) or by pasting raw text directly. Calls `onReady` with the extracted text once a valid resume is available.

## Exports

- `ResumePanel` — React component accepting an optional `onReady(text: string)` callback; manages upload/paste state, loading, and error display internally.

## Dependencies

- [[text-preview]] (`TextPreview`)
- `@/components/ui/tabs`, `@/components/ui/textarea`, `@/components/ui/button`, `@/components/ui/alert` (shadcn/ui primitives)
- `react` (useState, useRef)

## Used By

TBD

## Notes

Paste tab enforces a 200-character minimum before accepting text. Upload tab resets extracted state when the user switches tabs.