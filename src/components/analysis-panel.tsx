'use client'

import { useAnalysis } from '@/hooks/use-analysis'
import { ScoreCard } from '@/components/score-card'
import { ActionList } from '@/components/action-list'
import { KeywordBadges } from '@/components/keyword-badges'
import { RewriteDiff } from '@/components/rewrite-diff'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface AnalysisPanelProps {
  resumeText: string
  jdText: string
}

export function AnalysisPanel({ resumeText, jdText }: AnalysisPanelProps) {
  const { state, start, acceptRewrite, rejectRewrite } = useAnalysis()

  const canAnalyse = resumeText.length > 0 && jdText.length > 0

  if (state.phase === 'idle') {
    return (
      <div className="flex justify-center pt-6">
        <Button
          size="lg"
          disabled={!canAnalyse}
          onClick={() => start(resumeText, jdText)}
        >
          Analyse Match
        </Button>
      </div>
    )
  }

  if (state.phase === 'streaming') {
    return (
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold">Analysing&hellip;</h2>
        <Progress value={null} />
        <ScrollArea className="h-48 rounded-md border p-3">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words">
            {state.progress || 'Thinking…'}
          </pre>
        </ScrollArea>
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="pt-6 space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => start(resumeText, jdText)} disabled={!canAnalyse}>
          Retry
        </Button>
      </div>
    )
  }

  // phase === 'done'
  const { result, rewrites } = state

  return (
    <div className="space-y-6 pt-6">
      <ScoreCard overallScore={result.overallScore} components={result.components} />

      <Separator />

      <ActionList items={result.actionItems} />

      <Separator />

      <KeywordBadges keywords={result.keywordGaps} />

      {rewrites.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Suggested Rewrites</h2>
            {rewrites.map((rw, i) => (
              <RewriteDiff
                key={rw.section.sectionName + i}
                rewrite={rw}
                onAccept={() => acceptRewrite(i)}
                onReject={() => rejectRewrite(i)}
              />
            ))}
          </div>
        </>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={() => start(resumeText, jdText)}>
          Re-analyse
        </Button>
      </div>
    </div>
  )
}
