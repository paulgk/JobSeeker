import { InlineDiff } from '@/lib/diff'
import type { AnalysisResult } from '@/lib/schemas'
import { Badge } from '@/components/ui/badge'

type RewriteSection = AnalysisResult['rewrites'][number]

interface RewriteDiffReadOnlyProps {
  section: RewriteSection
}

export function RewriteDiffReadOnly({ section }: RewriteDiffReadOnlyProps) {
  return (
    <div className="rounded-xl ring-1 ring-border overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border bg-card">
        <span className="text-sm font-semibold text-foreground">{section.sectionName}</span>
        <Badge className="bg-accent text-foreground border-0 text-xs">Accepted</Badge>
      </div>
      <div className="px-5 py-4 bg-background">
        <InlineDiff original={section.originalText} rewritten={section.rewrittenText} />
      </div>
    </div>
  )
}
