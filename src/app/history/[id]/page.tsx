import { verifySession, getApplicationById } from '@/lib/dal'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuthHeader } from '@/components/auth-header'
import { StatusSelect } from '@/components/status-select'
import { ScoreCardDisplay } from '@/components/score-card-display'
import { ActionListDisplay } from '@/components/action-list-display'
import { KeywordBadgesDisplay } from '@/components/keyword-badges-display'
import { RewriteDiffReadOnly } from '@/components/rewrite-diff-readonly'
import { QuestionCardDisplay } from '@/components/question-card-display'
import { EditableApplicationHeader } from '@/components/editable-application-header'
import type { ApplicationStatus } from '@/lib/db/schema'

const STATUS_VARIANT: Record<ApplicationStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  saved: 'default',
  applied: 'secondary',
  interviewing: 'secondary',
  offer: 'default',
  rejected: 'destructive',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId, user } = await verifySession()
  const app = await getApplicationById(userId, id)
  if (!app) notFound()

  return (
    <>
      <AuthHeader userEmail={user.email} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground inline-block mb-6">
          ← Back to History
        </Link>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <EditableApplicationHeader
              id={app.id}
              initialCompany={app.company}
              initialJobTitle={app.jobTitle}
            />
            <div className="mt-3 flex items-center gap-3">
              <Badge variant={STATUS_VARIANT[app.status]}>{STATUS_LABELS[app.status]}</Badge>
              <StatusSelect id={app.id} initialStatus={app.status} />
            </div>
          </div>
          <Link href={`/?applicationId=${app.id}`}>
            <Button size="lg">Re-run Analysis</Button>
          </Link>
        </div>

        <Tabs defaultValue="analysis">
          <TabsList>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="interview">Interview Prep</TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="space-y-10 mt-6">
            {app.analysisData ? (
              <>
                <ScoreCardDisplay overallScore={app.analysisData.overallScore} components={app.analysisData.components} />
                <ActionListDisplay items={app.analysisData.actionItems} />
                <KeywordBadgesDisplay keywords={app.analysisData.keywordGaps} />
                {app.analysisData.rewrites.length > 0 && (
                  <section aria-label="Accepted rewrites" className="space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Rewrites</h2>
                    {app.analysisData.rewrites.map((section, idx) => (
                      <RewriteDiffReadOnly key={`${section.sectionName}-${idx}`} section={section} />
                    ))}
                  </section>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No analysis data saved for this application.</p>
            )}
          </TabsContent>
          <TabsContent value="interview" className="space-y-3 mt-6">
            {app.interviewData ? (
              app.interviewData.questions.map((q, i) => (
                <QuestionCardDisplay key={i} question={q} index={i} />
              ))
            ) : (
              <div className="rounded-2xl ring-1 ring-border bg-card p-10 text-center">
                <p className="text-sm text-muted-foreground mb-3">Interview prep wasn&apos;t run for this application.</p>
                <Link href="/" className="text-sm text-foreground hover:underline">Go back to run interview prep →</Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
