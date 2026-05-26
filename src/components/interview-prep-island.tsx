'use client'

import { useInterviewPrep } from '@/hooks/use-interview-prep'
import { QuestionCard } from '@/components/question-card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface InterviewPrepIslandProps {
  applicationId: string
  resumeText: string
  jdText: string
}

export function InterviewPrepIsland({ applicationId, resumeText, jdText }: InterviewPrepIslandProps) {
  const { state, startPrep, submitCritique, toggleExpand, setDraft } = useInterviewPrep()

  if (state.phase === 'idle') {
    return (
      <div className="rounded-2xl ring-1 ring-border bg-card p-10 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Interview prep hasn&apos;t been run for this application yet.
        </p>
        <Button onClick={() => startPrep(resumeText, jdText, applicationId)}>
          Start Interview Prep
        </Button>
      </div>
    )
  }

  if (state.phase === 'streaming') {
    return (
      <div className="space-y-4 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Preparing your questions…
        </h2>
        <p className="text-sm text-muted-foreground">
          Analysing your resume and the job description
        </p>
        <Progress value={null} className="h-1" />
        <div className="mt-4 max-h-48 overflow-y-auto rounded-lg bg-secondary border border-border p-4">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words leading-relaxed">
            {state.progress || 'Starting…'}
          </pre>
        </div>
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="space-y-4 max-w-2xl">
        <Alert variant="destructive">
          <AlertTitle>Failed to generate questions</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => startPrep(resumeText, jdText)}>
          Try again
        </Button>
      </div>
    )
  }

  // done
  const { result, questions } = state

  return (
    <div className="space-y-10">
      {/* Prep strategy */}
      <section aria-label="Preparation strategy">
        <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">
          Preparation strategy
        </h2>
        <div className="rounded-xl ring-1 ring-border bg-card px-4 py-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28 shrink-0">
              Seniority
            </span>
            <span className="text-sm text-foreground">{result.prepStrategy.seniorityLevel}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28 shrink-0">
              Domain
            </span>
            <span className="text-sm text-foreground">{result.prepStrategy.domainContext}</span>
          </div>
          {result.prepStrategy.tips.length > 0 && (
            <div className="pt-1 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tips
              </p>
              <ul className="space-y-1.5">
                {result.prepStrategy.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-foreground leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Question list */}
      <section aria-label="Interview questions">
        <h2 className="text-xl font-semibold tracking-tight text-foreground mb-1">
          Interview Questions
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {result.questions.length} questions
        </p>
        <div className="space-y-3">
          {result.questions.map((question, i) => (
            <QuestionCard
              key={i}
              question={question}
              questionState={questions[i]}
              index={i}
              onToggle={() => toggleExpand(i)}
              onDraftChange={(text) => setDraft(i, text)}
              onSubmitCritique={() =>
                submitCritique(i, question.question, question.modelAnswer, questions[i].draftAnswer)
              }
            />
          ))}
        </div>
      </section>
    </div>
  )
}
