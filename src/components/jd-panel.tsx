'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TextPreview } from '@/components/text-preview'

interface JobDescriptionPanelProps {
  onReady?: (text: string) => void
}

export function JobDescriptionPanel({ onReady }: JobDescriptionPanelProps) {
  const [tab, setTab] = useState<'paste' | 'url'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTabChange(value: string) {
    setTab(value as 'paste' | 'url')
    setError(null)
    setExtractedText('')
  }

  function handlePasteConfirm() {
    const trimmed = pasteText.trim()
    if (trimmed.length < 50) {
      setError('Job description must be at least 50 characters.')
      return
    }
    setError(null)
    setExtractedText(trimmed)
    onReady?.(trimmed)
  }

  async function handleUrlFetch() {
    const trimmedUrl = urlInput.trim()
    if (!trimmedUrl) {
      setError('Please enter a URL.')
      return
    }

    setError(null)
    setExtractedText('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/fetch-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to fetch job description.')
      } else {
        setExtractedText(data.text)
        onReady?.(data.text)
      }
    } catch {
      setError('Network error. Please try again or paste the job description text.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="paste">Paste Text</TabsTrigger>
          <TabsTrigger value="url">Fetch from URL</TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="flex-1 flex flex-col gap-3 pt-3">
          <Textarea
            placeholder="Paste the full job description here…"
            className="flex-1 min-h-[180px] resize-none text-sm"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <Button
            onClick={handlePasteConfirm}
            disabled={pasteText.trim().length === 0}
          >
            Use This Job Description
          </Button>
        </TabsContent>

        <TabsContent value="url" className="flex-1 flex flex-col gap-3 pt-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Works with Greenhouse and Lever job pages. Does not work with LinkedIn, Indeed, Glassdoor, or JavaScript-heavy ATS portals.
            </p>
            <input
              type="url"
              placeholder="https://boards.greenhouse.io/company/jobs/123"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUrlFetch() }}
            />
          </div>
          <Button
            onClick={handleUrlFetch}
            disabled={isLoading || urlInput.trim().length === 0}
          >
            {isLoading ? 'Fetching…' : 'Fetch Job Description'}
          </Button>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {extractedText && !error && (
        <TextPreview text={extractedText} label="Extracted job description" />
      )}
    </div>
  )
}
