'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import type { QuestionState } from '@/hooks/use-interview-prep'
import type { InterviewPrepResult } from '@/lib/schemas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface QuestionCardProps {
  question: InterviewPrepResult['questions'][number]
  questionState: QuestionState
  index: number
  onToggle: () => void
  onDraftChange: (text: string) => void
  onSubmitCritique: () => void
}

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

export function QuestionCard({
  question,
  questionState,
  index,
  onToggle,
  onDraftChange,
  onSubmitCritique,
}: QuestionCardProps) {
  const { expanded, draftAnswer, critiquePhase, critiqueText, critiqueError } = questionState
  const draftTooShort = draftAnswer.trim().length < 20

  const feedbackLabel =
    critiquePhase === 'done' ? 'Revise feedback' : 'Get feedback'

  const feedbackDisabled =
    critiquePhase === 'streaming' || draftTooShort

  return (
    <div className="rounded-xl ring-1 ring-border bg-card text-sm text-card-foreground overflow-hidden">
      {/* Header — always visible, fully clickable */}
      <button
        type="button"
        onClick={onToggle}
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

          {/* Draft textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor={`draft-${index}`}
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Your answer
            </label>
            <Textarea
              id={`draft-${index}`}
              value={draftAnswer}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Write your answer here…"
              className="min-h-[120px]"
            />
            {draftTooShort && draftAnswer.length > 0 && (
              <p className="text-xs text-muted-foreground">
                At least 20 characters required to request feedback.
              </p>
            )}
          </div>

          {/* Feedback button */}
          <Button
            size="sm"
            variant={critiquePhase === 'done' ? 'outline' : 'default'}
            disabled={feedbackDisabled}
            onClick={onSubmitCritique}
          >
            {critiquePhase === 'streaming' ? 'Getting feedback…' : feedbackLabel}
          </Button>

          {/* Critique display */}
          {critiquePhase === 'streaming' && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Getting feedback…
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg bg-secondary border border-border p-3">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {critiqueText || 'Starting…'}
                </pre>
              </div>
            </div>
          )}

          {critiquePhase === 'done' && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Feedback
              </p>
              <div className="rounded-lg bg-secondary border border-border p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {critiqueText}
                </p>
              </div>
            </div>
          )}

          {critiquePhase === 'error' && (
            <p className="text-sm text-destructive">{critiqueError}</p>
          )}
        </div>
      )}
    </div>
  )
}
