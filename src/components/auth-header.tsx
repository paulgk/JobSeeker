'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function AuthHeader({ userEmail }: { userEmail: string }) {
  const router = useRouter()

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push('/sign-in'),
      },
    })
  }

  return (
    <header className="sticky top-0 z-10 h-16 bg-card border-b border-border flex items-center px-6">
      <Link href="/" className="text-xl font-semibold tracking-tight text-foreground mr-auto">
        JobSeeker
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">
          History
        </Link>
        <span className="text-xs text-muted-foreground">{userEmail}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </nav>
    </header>
  )
}
