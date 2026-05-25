'use client'

import { useState } from 'react'
import { ResumePanel } from '@/components/resume-panel'
import { JobDescriptionPanel } from '@/components/jd-panel'
import { AnalysisPanel } from '@/components/analysis-panel'
import { InterviewPrepPanel } from '@/components/interview-prep-panel'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const [resumeText, setResumeText] = useState('')
  const [jdText, setJdText] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [showInterviewPrep, setShowInterviewPrep] = useState(false)

  const bothReady = resumeText.length > 0 && jdText.length > 0

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">JobSeeker</h1>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Analyse your resume against any job description and get a precise, actionable improvement plan.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section
          aria-label="Resume input"
          className="rounded-2xl ring-1 ring-border bg-card p-6 flex flex-col"
        >
          <h2 className="text-base font-semibold text-foreground mb-4">Your resume</h2>
          <ResumePanel onReady={setResumeText} locked={analysing} />
        </section>

        <section
          aria-label="Job description input"
          className="rounded-2xl ring-1 ring-border bg-card p-6 flex flex-col"
        >
          <h2 className="text-base font-semibold text-foreground mb-4">Job description</h2>
          <JobDescriptionPanel onReady={setJdText} locked={analysing} />
        </section>
      </div>

      {bothReady && !analysing && (
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            className="px-10"
            onClick={() => setAnalysing(true)}
          >
            Analyse match
          </Button>
        </div>
      )}

      {analysing && (
        <AnalysisPanel
          resumeText={resumeText}
          jdText={jdText}
          onInterviewPrepReady={() => setShowInterviewPrep(true)}
        />
      )}

      {showInterviewPrep && (
        <InterviewPrepPanel resumeText={resumeText} jdText={jdText} />
      )}
    </main>
  )
}
