'use client'

import { diffWords, type Change } from 'diff'

export function InlineDiff({ original, rewritten }: { original: string; rewritten: string }) {
  const parts: Change[] = diffWords(original, rewritten)
  return (
    <span className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.added
              ? 'bg-green-100 text-green-800 rounded px-0.5'
              : part.removed
              ? 'bg-red-100 text-red-800 line-through rounded px-0.5'
              : 'text-foreground'
          }
        >
          {part.value}
        </span>
      ))}
    </span>
  )
}
