import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface KeywordBadgesProps {
  keywords: string[]
}

export function KeywordBadges({ keywords }: KeywordBadgesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Gaps</CardTitle>
        <CardDescription>
          From the job description, missing in your resume — add where truthful.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {keywords.length === 0 ? (
          <p className="text-sm text-muted-foreground">No significant keyword gaps found.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
