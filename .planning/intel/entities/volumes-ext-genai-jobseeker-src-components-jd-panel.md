---
path: /Volumes/Ext/GenAI/JobSeeker/src/components/jd-panel.tsx
type: component
updated: 2026-05-22
status: active
---

# jd-panel.tsx

## Purpose

Provides a tabbed UI panel for inputting a job description, either by pasting raw text or fetching from a URL via the `/api/fetch-jd` endpoint. Validates input and surfaces the extracted text to a parent callback once ready.

## Exports

- `JobDescriptionPanel` — React client component accepting an optional `onReady(text: string)` callback, fired when a valid job description is confirmed or successfully fetched.

## Dependencies

- [[text-preview]] — renders extracted text preview
- `@/components/ui/tabs` — Tabs, TabsContent, TabsList, TabsTrigger
- `@/components/ui/textarea` — Textarea
- `@/components/ui/button` — Button
- `@/components/ui/alert` — Alert, AlertDescription
- react (external)

## Used By

TBD

## Notes

Minimum paste length is 50 characters. URL fetch posts to `/api/fetch-jd` and expects `{ text }` on success or `{ error }` on failure. Tab switches clear error and extracted text state.