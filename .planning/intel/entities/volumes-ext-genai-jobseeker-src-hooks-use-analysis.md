---
path: /Volumes/Ext/GenAI/JobSeeker/src/hooks/use-analysis.ts
type: hook
updated: 2026-05-22
status: active
---

# use-analysis.ts

## Purpose

React hook that manages the full lifecycle of a resume analysis request — streaming SSE chunks from `/api/analyse`, parsing the final result, and tracking per-rewrite accept/reject state via a reducer.

## Exports

- `useAnalysis` — hook returning `state` (AnalysisState) and actions (`start`, `acceptRewrite`, `rejectRewrite`)
- `RewriteSection` — type alias for a single element of `AnalysisResult['rewrites']`
- `RewriteState` — type wrapping a `RewriteSection` with a `pending | accepted | rejected` status
- `AnalysisState` — discriminated union covering `idle | streaming | done | error` phases

## Dependencies

- [[schemas]] (`AnalysisResult`)
- react (`useReducer`, `useCallback`)

## Used By

TBD