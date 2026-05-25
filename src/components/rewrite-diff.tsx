'use client'

import { InlineDiff } from '@/lib/diff'
import type { RewriteState } from '@/hooks/use-analysis'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface RewriteDiffProps {
  rewrite: RewriteState
  onAccept: () => void
  onReject: () => void
}

export function RewriteDiff({ rewrite, onAccept, onReject }: RewriteDiffProps) {
  const { status, section } = rewrite
  const isSettled = status !== 'pending'

  return (
    <div
      className={[
        'rounded-xl ring-1 ring-border overflow-hidden transition-opacity',
        status === 'rejected' ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
    >
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border bg-card">
        <span className="text-sm font-semibold text-foreground">{section.sectionName}</span>
        {status === 'accepted' && (
          <Badge className="bg-accent text-foreground border-0 text-xs">Accepted</Badge>
        )}
        {status === 'rejected' && (
          <Badge variant="outline" className="text-muted-foreground text-xs">Dismissed</Badge>
        )}
      </div>

      <div className="px-5 py-4 bg-background">
        <InlineDiff original={section.originalText} rewritten={section.rewrittenText} />
      </div>

      <div className="px-5 py-3 flex items-center gap-2 bg-card border-t border-border">
        {!isSettled ? (
          <>
            <Button size="sm" onClick={onAccept}>Accept this rewrite</Button>
            <Button variant="ghost" size="sm" onClick={onReject}>Dismiss</Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={status === 'accepted' ? onReject : onAccept}>
            Undo
          </Button>
        )}
      </div>
    </div>
  )
}
