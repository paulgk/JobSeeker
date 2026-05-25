import type { AnalysisResult } from '@/lib/schemas'

interface ScoreCardProps {
  overallScore: number
  components: AnalysisResult['components']
}

export function ScoreCard({ overallScore, components }: ScoreCardProps) {
  const isStrong = overallScore >= 70

  return (
    <section aria-label="Match score">
      <h2 className="text-xl font-semibold tracking-tight text-foreground mb-6">Match score</h2>

      <div className="flex items-baseline gap-1 mb-8">
        <span
          className="text-[2rem] font-bold leading-none tracking-[-0.02em]"
          style={{ color: isStrong ? 'oklch(0.72 0.12 68)' : undefined }}
        >
          {overallScore}
        </span>
        <span className="text-xl font-semibold text-muted-foreground leading-none">%</span>
      </div>

      <div className="space-y-6">
        {components.map((component, index) => (
          <div key={component.name + index}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">{component.name}</span>
              <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                <span>{Math.round(component.weight * 100)}% weight</span>
                <span className="font-semibold text-foreground tabular-nums">{component.score} / 100</span>
              </div>
            </div>
            <div className="h-1 w-full rounded-full bg-secondary overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
                style={{ width: `${component.score}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{component.rationale}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
