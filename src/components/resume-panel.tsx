'use client'

import { useState, useRef, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TextPreview } from '@/components/text-preview'

interface ResumePanelProps {
  onReady?: (text: string) => void
  locked?: boolean
  initialValue?: string
}

export function ResumePanel({ onReady, locked, initialValue }: ResumePanelProps) {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload')
  const [pasteText, setPasteText] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!initialValue) return
    setTab('paste')
    setPasteText(initialValue)
    setExtractedText(initialValue)
    setError(null)
    onReady?.(initialValue)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue])

  async function processFile(file: File) {
    setError(null)
    setExtractedText('')
    setFileName(file.name)
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-resume', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to parse PDF.')
        setFileName(null)
      } else {
        setExtractedText(data.text)
        onReady?.(data.text)
      }
    } catch {
      setError('Network error. Try again or paste your resume text.')
      setFileName(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') {
      processFile(file)
    } else {
      setError('Please drop a PDF file.')
    }
  }

  function handlePasteConfirm() {
    const trimmed = pasteText.trim()
    if (trimmed.length < 200) {
      setError('Resume text must be at least 200 characters.')
      return
    }
    setError(null)
    setExtractedText(trimmed)
    onReady?.(trimmed)
  }

  return (
    <div className="flex flex-col flex-1">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          if (locked) return
          setTab(v as 'upload' | 'paste')
          setError(null)
          setExtractedText('')
        }}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="upload" disabled={locked}>Upload PDF</TabsTrigger>
          <TabsTrigger value="paste" disabled={locked}>Paste text</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="flex-1 flex flex-col gap-3 pt-4">
          <div
            className={[
              'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors',
              isDragging ? 'border-foreground/40 bg-muted/50' : 'border-border hover:border-foreground/30',
              locked ? 'pointer-events-none opacity-50' : '',
            ].join(' ')}
            onClick={() => !locked && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Parsing {fileName}…</p>
            ) : fileName && !error ? (
              <>
                <p className="text-sm font-medium text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground">Parsed successfully</p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground font-medium">Drop your PDF here, or click to select</p>
                <p className="text-xs text-muted-foreground">Max 5 MB · PDF only</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || locked}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  Choose file
                </Button>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </TabsContent>

        <TabsContent value="paste" className="flex-1 flex flex-col gap-3 pt-4">
          <Textarea
            placeholder="Paste your full resume…"
            className="flex-1 min-h-[200px] resize-none font-mono text-sm"
            value={pasteText}
            disabled={locked}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <Button
            onClick={handlePasteConfirm}
            disabled={pasteText.trim().length === 0 || locked}
          >
            Use this resume
          </Button>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {extractedText && !error && (
        <TextPreview text={extractedText} label="Extracted resume text" />
      )}
    </div>
  )
}
