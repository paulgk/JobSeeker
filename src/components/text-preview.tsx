interface TextPreviewProps {
  text: string
  label?: string
}

export function TextPreview({ text, label = 'Preview' }: TextPreviewProps) {
  return (
    <div className="mt-4 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground tracking-wide">{label}</p>
      <div className="h-44 overflow-y-auto rounded-lg border border-border bg-secondary p-3">
        <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
          {text}
        </pre>
      </div>
    </div>
  )
}
