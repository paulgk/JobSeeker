---
path: /Volumes/Ext/GenAI/JobSeeker/src/components/analysis-panel.tsx
type: component
updated: 2026-05-22
status: active
---

# analysis-panel.tsx

## Purpose

Orchestrates the full resume analysis UI, rendering the correct phase view (idle, streaming, error, or done) based on `useAnalysis` state. Acts as the top-level display container that composes score, actions, keyword gaps, and rewrite diff sub-components.

## Exports

- `AnalysisPanel` — Client component accepting `resumeText` and `jdText` props; drives the analysis lifecycle and renders phase-appropriate UI

## Dependencies

- [[use-analysis]]
- [[score-card]]
- [[action-list]]
- [[keyword-badges]]
- [[rewrite-diff]]
- shadcn/ui: Progress, ScrollArea, Separator, Button, Alert, AlertTitle, AlertDescription

## Used By

TBD

## Notes

Manages four distinct render paths keyed on `state.phase` (`idle`, `streaming`, `error`, `done`); the `done` path conditionally renders the rewrites section only when `rewrites.length > 0`.