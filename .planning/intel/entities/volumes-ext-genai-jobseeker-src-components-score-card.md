---
path: /Volumes/Ext/GenAI/JobSeeker/src/components/score-card.tsx
type: component
updated: 2026-05-22
status: active
---

# score-card.tsx

## Purpose

Displays the overall match score and per-component breakdown (name, weight, score, progress bar, rationale) for a resume-to-job analysis result. Exists to give users a visual summary of how well their resume matches a job posting.

## Exports

- `ScoreCard` — React component accepting `overallScore` (number) and `components` (AnalysisResult['components']) props

## Dependencies

- [[card]] — Card, CardContent, CardHeader, CardTitle layout primitives
- [[separator]] — Separator divider component
- [[schemas]] — `AnalysisResult` type

## Used By

TBD