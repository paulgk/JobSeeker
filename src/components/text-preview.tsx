interface TextPreviewProps {
  text: string
  label?: string
}

export function TextPreview({ text, label = 'Preview' }: TextPreviewProps) {
  return (
    <div className="mt-4 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="h-48 overflow-y-auto rounded-md border bg-muted/30 p-3">
        <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
          {text}
        </pre>
      </div>
    </div>
  )
}
