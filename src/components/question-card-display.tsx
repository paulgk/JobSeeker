'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { InterviewPrepResult } from '@/lib/schemas'
import { Badge } from '@/components/ui/badge'

const categoryLabel: Record<InterviewPrepResult['questions'][number]['category'], string> = {
  behavioural: 'Behavioural',
  technical: 'Technical',
  situational: 'Situational',
  'role-specific': 'Role-specific',
}

const categoryVariant: Record<
  InterviewPrepResult['questions'][number]['category'],
  'default' | 'secondary' | 'outline'
> = {
  behavioural: 'secondary',
  technical: 'default',
  situational: 'outline',
  'role-specific': 'secondary',
}

interface QuestionCardDisplayProps {
  question: InterviewPrepResult['questions'][number]
  index: number
}

export function QuestionCardDisplay({ question, index }: QuestionCardDisplayProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl ring-1 ring-border bg-card text-sm text-card-foreground overflow-hidden">
      {/* Header — always visible, fully clickable */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
        aria-expanded={expanded}
      >
        <span className="flex-none mt-0.5 text-xs font-semibold text-muted-foreground tabular-nums w-4">
          {index + 1}.
        </span>
        <span className="flex-1 text-sm font-medium text-foreground leading-snug">
          {question.question}
        </span>
        <div className="flex-none flex items-center gap-2 ml-2">
          <Badge variant={categoryVariant[question.category]}>
            {categoryLabel[question.category]}
          </Badge>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* Rationale */}
          <div className="pt-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why this question
            </p>
            <p className="text-sm text-foreground leading-relaxed">{question.rationale}</p>
          </div>

          {/* Model answer */}
          <div className="rounded-lg bg-secondary px-3 py-2.5 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Model answer
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {question.modelAnswer}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
