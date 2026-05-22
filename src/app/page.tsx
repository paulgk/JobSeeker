import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <main className="min-h-screen p-6 bg-background">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">JobSeeker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your resume and a job description to get a personalised analysis.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-8rem)]">
        {/* Resume Panel — implemented in Plan 02 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Resume</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Resume input coming soon
          </CardContent>
        </Card>

        {/* Job Description Panel — implemented in Plan 03 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            JD input coming soon
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
