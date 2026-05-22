import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AnalysisResult } from '@/lib/schemas'

interface ActionListProps {
  items: AnalysisResult['actionItems']
}

const impactVariant: Record<
  'high' | 'medium' | 'low',
  'default' | 'secondary' | 'outline'
> = {
  high: 'default',
  medium: 'secondary',
  low: 'outline',
}

export function ActionList({ items }: ActionListProps) {
  const sorted = [...items].sort((a, b) => a.rank - b.rank)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Items</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No action items.</p>
        ) : (
          <ol className="space-y-4">
            {sorted.map((item) => (
              <li key={item.rank} className="flex gap-3">
                <span className="flex-none mt-0.5 text-sm font-semibold text-muted-foreground w-5 text-right">
                  {item.rank}.
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{item.title}</span>
                    <Badge variant={impactVariant[item.estimatedImpact]}>
                      {item.estimatedImpact} impact
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
