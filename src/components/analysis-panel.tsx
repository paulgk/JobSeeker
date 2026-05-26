'use client'

import { useEffect } from 'react'
import { useAnalysis } from '@/hooks/use-analysis'
import { ScoreCard } from '@/components/score-card'
import { ActionList } from '@/components/action-list'
import { KeywordBadges } from '@/components/keyword-badges'
import { RewriteDiff } from '@/components/rewrite-diff'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface AnalysisPanelProps {
  resumeText: string
  jdText: string
  onInterviewPrepReady?: () => void
  onSaved?: (applicationId: string) => void
  onAnalysisStart?: () => void
}

export function AnalysisPanel({ resumeText, jdText, onInterviewPrepReady, onSaved, onAnalysisStart }: AnalysisPanelProps) {
  const { state, start, acceptRewrite, rejectRewrite } = useAnalysis()

  useEffect(() => {
    onAnalysisStart?.()
    start(resumeText, jdText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state.phase === 'done' && state.applicationId) {
      onSaved?.(state.applicationId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase === 'done' ? state.applicationId : undefined])

  if (state.phase === 'streaming') {
    return (
      <div className="mt-12 space-y-4 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Analysing your match</h2>
        <p className="text-sm text-muted-foreground">Reading your resume and the job description</p>
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
      <div className="mt-12 space-y-4 max-w-2xl">
        <Alert variant="destructive">
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => start(resumeText, jdText)}>
          Try again
        </Button>
      </div>
    )
  }

  if (state.phase !== 'done') return null

  const { result, rewrites } = state

  return (
    <div className="mt-12">
      {state.saveError && (
        <Alert className="mb-6">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>
            Your analysis ran successfully but could not be saved: {state.saveError}
          </AlertDescription>
        </Alert>
      )}

      <ScoreCard overallScore={result.overallScore} components={result.components} />

      <div className="mt-10">
        <ActionList items={result.actionItems} />
      </div>

      <div className="mt-10">
        <KeywordBadges keywords={result.keywordGaps} />
      </div>

      {rewrites.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-foreground mb-6">Suggested rewrites</h2>
          <div className="space-y-4">
            {rewrites.map((rw, i) => (
              <RewriteDiff
                key={rw.section.sectionName + i}
                rewrite={rw}
                onAccept={() => acceptRewrite(i)}
                onReject={() => rejectRewrite(i)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-end gap-3">
        {onInterviewPrepReady && (
          <Button variant="default" onClick={onInterviewPrepReady}>
            Prepare for interview
          </Button>
        )}
        <Button variant="ghost" className="text-muted-foreground" onClick={() => { onAnalysisStart?.(); start(resumeText, jdText) }}>
          Run again
        </Button>
      </div>
    </div>
  )
}
