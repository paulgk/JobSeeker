import { Badge } from '@/components/ui/badge'
import type { AnalysisResult } from '@/lib/schemas'

interface ActionListProps {
  items: AnalysisResult['actionItems']
}

const impactVariant: Record<'high' | 'medium' | 'low', 'default' | 'secondary' | 'outline'> = {
  high: 'default',
  medium: 'secondary',
  low: 'outline',
}

const impactLabel: Record<'high' | 'medium' | 'low', string> = {
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
}

export function ActionList({ items }: ActionListProps) {
  const sorted = [...items].sort((a, b) => a.rank - b.rank)

  return (
    <section aria-label="Action items">
      <h2 className="text-xl font-semibold tracking-tight text-foreground mb-6">What to fix</h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No action items.</p>
      ) : (
        <ol className="space-y-5">
          {sorted.map((item) => (
            <li key={item.rank} className="flex gap-4">
              <span className="flex-none mt-0.5 text-sm font-semibold text-muted-foreground w-4 tabular-nums">
                {item.rank}.
              </span>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{item.title}</span>
                  <Badge variant={impactVariant[item.estimatedImpact]} className="text-xs">
                    {impactLabel[item.estimatedImpact]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[65ch]">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
