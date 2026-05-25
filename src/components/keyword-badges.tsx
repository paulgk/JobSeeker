import { Badge } from '@/components/ui/badge'

interface KeywordBadgesProps {
  keywords: string[]
}

export function KeywordBadges({ keywords }: KeywordBadgesProps) {
  return (
    <section aria-label="Keyword gaps">
      <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">Keywords to add</h2>
      <p className="text-sm text-muted-foreground mb-5 max-w-[65ch]">
        These appear in the job description but not in your resume. Add them where true.
      </p>

      {keywords.length === 0 ? (
        <p className="text-sm text-muted-foreground">No significant keyword gaps found.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Badge key={keyword} variant="outline" className="text-xs font-medium">
              {keyword}
            </Badge>
          ))}
        </div>
      )}
    </section>
  )
}
