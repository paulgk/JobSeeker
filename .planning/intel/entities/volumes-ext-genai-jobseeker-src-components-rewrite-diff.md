---
path: /Volumes/Ext/GenAI/JobSeeker/src/components/rewrite-diff.tsx
type: component
updated: 2026-05-22
status: active
---

# rewrite-diff.tsx

## Purpose

Displays a single CV section rewrite as an inline diff with accept/reject controls. Renders undo actions once a decision has been made.

## Exports

- `RewriteDiff` — Card-based component showing original vs rewritten text with accept/reject/undo buttons driven by `RewriteState.status`

## Dependencies

- [[diff]] — `InlineDiff` for rendering inline text differences
- [[use-analysis]] — `RewriteState` type (status, section)
- `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/button` — shadcn/ui primitives
- `lucide-react` — Check, X icons

## Used By

TBD