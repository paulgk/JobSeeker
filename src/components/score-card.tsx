import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { AnalysisResult } from '@/lib/schemas'

interface ScoreCardProps {
  overallScore: number
  components: AnalysisResult['components']
}

export function ScoreCard({ overallScore, components }: ScoreCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold">{overallScore}</span>
          <span className="text-2xl text-muted-foreground font-semibold">%</span>
        </div>

        <Separator />

        <div className="space-y-5">
          {components.map((component, index) => (
            <div key={component.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">{component.name}</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Weight: {Math.round(component.weight * 100)}%</span>
                  <span className="font-semibold text-foreground">{component.score}/100</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${component.score}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{component.rationale}</p>
              {index < components.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
