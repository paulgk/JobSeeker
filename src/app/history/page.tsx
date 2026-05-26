import { verifySession, getApplications } from '@/lib/dal'
import Link from 'next/link'
import { AuthHeader } from '@/components/auth-header'
import { StatusSelect } from '@/components/status-select'
import { Badge } from '@/components/ui/badge'
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

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

export default async function HistoryPage() {
  const { userId, user } = await verifySession()
  const apps = await getApplications(userId)

  return (
    <>
      <AuthHeader userEmail={user.email} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">
          My Applications
        </h1>
        {apps.length === 0 ? (
          <div className="rounded-2xl ring-1 ring-border bg-card p-10 text-center">
            <h2 className="text-base font-semibold text-foreground mb-2">
              No applications saved yet
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Run your first analysis and it will appear here.
            </p>
            <Link href="/" className="text-sm text-foreground hover:underline">
              Analyse a job →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => {
              const isStrong = app.matchScore != null && app.matchScore >= 70
              return (
                <Link
                  key={app.id}
                  href={`/history/${app.id}`}
                  className="block rounded-2xl ring-1 ring-border bg-card px-6 py-4 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-semibold text-foreground truncate block">
                        {app.company}
                      </span>
                      <span className="text-sm text-muted-foreground truncate block">
                        {app.jobTitle}
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: isStrong ? 'oklch(0.72 0.12 68)' : undefined }}
                    >
                      {app.matchScore != null ? `${app.matchScore}%` : '—'}
                    </span>
                    <Badge variant={STATUS_VARIANT[app.status]}>
                      {STATUS_LABELS[app.status]}
                    </Badge>
                    <StatusSelect id={app.id} initialStatus={app.status} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {dateFormatter.format(new Date(app.createdAt))}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
