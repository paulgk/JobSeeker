'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TextPreview } from '@/components/text-preview'

interface JobDescriptionPanelProps {
  onReady?: (text: string) => void
  locked?: boolean
}

export function JobDescriptionPanel({ onReady, locked }: JobDescriptionPanelProps) {
  const [tab, setTab] = useState<'paste' | 'url'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTabChange(value: string) {
    if (locked) return
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
      setError('Network error. Try again or paste the job description.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="paste" disabled={locked}>Paste text</TabsTrigger>
          <TabsTrigger value="url" disabled={locked}>Fetch from URL</TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="flex-1 flex flex-col gap-3 pt-4">
          <Textarea
            placeholder="Paste the job description…"
            className="flex-1 min-h-[200px] resize-none text-sm"
            value={pasteText}
            disabled={locked}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <Button
            onClick={handlePasteConfirm}
            disabled={pasteText.trim().length === 0 || locked}
          >
            Use this job description
          </Button>
        </TabsContent>

        <TabsContent value="url" className="flex-1 flex flex-col gap-3 pt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Works with Greenhouse and Lever. LinkedIn, Indeed, and JavaScript-heavy portals aren&apos;t supported.
          </p>
          <input
            type="url"
            placeholder="https://boards.greenhouse.io/company/jobs/123"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            value={urlInput}
            disabled={locked}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !locked) handleUrlFetch() }}
          />
          <Button
            onClick={handleUrlFetch}
            disabled={isLoading || urlInput.trim().length === 0 || locked}
          >
            {isLoading ? 'Fetching…' : 'Fetch job description'}
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
