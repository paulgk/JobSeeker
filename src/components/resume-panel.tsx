'use client'

import { useState, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TextPreview } from '@/components/text-preview'

interface ResumePanelProps {
  onReady?: (text: string) => void
}

export function ResumePanel({ onReady }: ResumePanelProps) {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload')
  const [pasteText, setPasteText] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

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
      setError('Network error. Please try again or paste your resume text.')
      setFileName(null)
    } finally {
      setIsLoading(false)
    }
  }

  function handlePasteConfirm() {
    const trimmed = pasteText.trim()
    if (trimmed.length < 200) {
      setError('Resume text must be at least 200 characters. Please paste more of your resume.')
      return
    }
    setError(null)
    setExtractedText(trimmed)
    onReady?.(trimmed)
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as 'upload' | 'paste')
          setError(null)
          setExtractedText('')
        }}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="upload">Upload PDF</TabsTrigger>
          <TabsTrigger value="paste">Paste Text</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="flex-1 flex flex-col gap-3 pt-3">
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 gap-3 cursor-pointer hover:border-primary/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-sm text-muted-foreground text-center">
              {fileName
                ? `Selected: ${fileName}`
                : 'Click to select a PDF resume (max 5 MB)'}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
            >
              {isLoading ? 'Parsing…' : 'Choose PDF'}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </TabsContent>

        <TabsContent value="paste" className="flex-1 flex flex-col gap-3 pt-3">
          <Textarea
            placeholder="Paste your full resume text here…"
            className="flex-1 min-h-[180px] resize-none font-mono text-sm"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <Button
            onClick={handlePasteConfirm}
            disabled={pasteText.trim().length === 0}
          >
            Use This Resume
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
