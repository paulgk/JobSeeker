'use client'

import { Check, X } from 'lucide-react'
import { InlineDiff } from '@/lib/diff'
import type { RewriteState } from '@/hooks/use-analysis'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface RewriteDiffProps {
  rewrite: RewriteState
  onAccept: () => void
  onReject: () => void
}

export function RewriteDiff({ rewrite, onAccept, onReject }: RewriteDiffProps) {
  const { status, section } = rewrite

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{section.sectionName}</span>
          {status === 'accepted' && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Check className="size-3" />
              Accepted
            </Badge>
          )}
          {status === 'rejected' && (
            <Badge variant="outline" className="text-muted-foreground line-through">
              Rejected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <InlineDiff original={section.originalText} rewritten={section.rewrittenText} />
      </CardContent>

      {status === 'pending' && (
        <CardFooter className="gap-2">
          <Button variant="default" size="sm" onClick={onAccept}>
            <Check className="size-4" />
            Accept
          </Button>
          <Button variant="outline" size="sm" onClick={onReject}>
            <X className="size-4" />
            Reject
          </Button>
        </CardFooter>
      )}

      {status !== 'pending' && (
        <CardFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={status === 'accepted' ? onReject : onAccept}
          >
            {status === 'accepted' ? 'Undo Accept' : 'Undo Reject'}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
