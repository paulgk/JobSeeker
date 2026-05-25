'use client'

import { diffWords, type Change } from 'diff'

export function InlineDiff({ original, rewritten }: { original: string; rewritten: string }) {
  const parts: Change[] = diffWords(original, rewritten)
  return (
    <span className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.added
              ? 'bg-amber-100/60 text-foreground rounded px-0.5'
              : part.removed
              ? 'bg-foreground/8 text-muted-foreground line-through rounded px-0.5'
              : 'text-foreground'
          }
        >
          {part.value}
        </span>
      ))}
    </span>
  )
}
