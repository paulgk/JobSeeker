'use client'

import { useState } from 'react'
import { ResumePanel } from '@/components/resume-panel'
import { JobDescriptionPanel } from '@/components/jd-panel'
import { AnalysisPanel } from '@/components/analysis-panel'

export default function HomePage() {
  const [resumeText, setResumeText] = useState('')
  const [jdText, setJdText] = useState('')

  return (
    <main className="min-h-screen p-6 bg-background">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">JobSeeker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your resume and a job description to get a personalised analysis.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-8rem)]">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Resume</h2>
          <ResumePanel onReady={setResumeText} />
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Job Description</h2>
          <JobDescriptionPanel onReady={setJdText} />
        </div>
      </div>

      <AnalysisPanel resumeText={resumeText} jdText={jdText} />
    </main>
  )
}
