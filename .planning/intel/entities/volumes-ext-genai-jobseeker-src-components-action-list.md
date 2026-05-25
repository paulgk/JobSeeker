---
path: /Volumes/Ext/GenAI/JobSeeker/src/components/action-list.tsx
type: component
updated: 2026-05-22
status: active
---

# action-list.tsx

## Purpose

Renders a ranked, sorted list of action items from an analysis result, each labeled with an impact badge. Exists to surface prioritized resume improvement tasks in the UI.

## Exports

- `ActionList` — React component that accepts `AnalysisResult['actionItems']` and renders them sorted by rank inside a Card

## Dependencies

- [[schemas]] (AnalysisResult type)
- @/components/ui/card (external UI primitive)
- @/components/ui/badge (external UI primitive)

## Used By

TBD