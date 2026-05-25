'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function SignInPage() {
  const router = useRouter()

  const [signinState, setSigninState] = useState<{
    email: string
    password: string
    loading: boolean
    error: string | null
  }>({ email: '', password: '', loading: false, error: null })

  const [signupState, setSignupState] = useState<{
    name: string
    email: string
    password: string
    loading: boolean
    error: string | null
  }>({ name: '', email: '', password: '', loading: false, error: null })

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSigninState(s => ({ ...s, loading: true, error: null }))
    try {
      const result = await signIn.email({
        email: signinState.email,
        password: signinState.password,
      })
      if (result.error) {
        setSigninState(s => ({
          ...s,
          loading: false,
          error: result.error?.message ?? 'Incorrect email or password.',
        }))
      } else {
        router.push('/')
      }
    } catch {
      setSigninState(s => ({ ...s, loading: false, error: 'Something went wrong. Try again.' }))
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setSignupState(s => ({ ...s, loading: true, error: null }))
    try {
      const result = await signUp.email({
        name: signupState.name,
        email: signupState.email,
        password: signupState.password,
      })
      if (result.error) {
        setSignupState(s => ({
          ...s,
          loading: false,
          error: result.error?.message ?? 'Could not create account.',
        }))
      } else {
        router.push('/')
      }
    } catch {
      setSignupState(s => ({ ...s, loading: false, error: 'Something went wrong. Try again.' }))
    }
  }

  async function handleGoogle() {
    await signIn.social({ provider: 'google', callbackURL: '/' })
  }

  const anyLoading = signinState.loading || signupState.loading

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'oklch(0.995 0.003 80)' }}
    >
      <div className="w-full max-w-[400px] space-y-8">

        {/* Wordmark + pitch */}
        <div className="space-y-2">
          <h1
            className="tracking-tight"
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'oklch(0.145 0.004 80)',
            }}
          >
            JobSeeker
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 400,
              lineHeight: 1.6,
              color: 'oklch(0.556 0.004 80)',
            }}
          >
            Analyse any job application in minutes. Save your work, track your progress.
          </p>
        </div>

        {/* Auth form */}
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Create Account</TabsTrigger>
          </TabsList>

          {/* Sign In */}
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={signinState.loading}
                  value={signinState.email}
                  onChange={e => setSigninState(s => ({ ...s, email: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={signinState.loading}
                  value={signinState.password}
                  onChange={e => setSigninState(s => ({ ...s, password: e.target.value }))}
                />
              </div>

              {signinState.error && (
                <p
                  className="text-sm"
                  style={{ color: 'oklch(0.577 0.245 27.325)' }}
                >
                  {signinState.error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={signinState.loading}
              >
                {signinState.loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          {/* Create Account */}
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                  required
                  disabled={signupState.loading}
                  value={signupState.name}
                  onChange={e => setSignupState(s => ({ ...s, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={signupState.loading}
                  value={signupState.email}
                  onChange={e => setSignupState(s => ({ ...s, email: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  disabled={signupState.loading}
                  value={signupState.password}
                  onChange={e => setSignupState(s => ({ ...s, password: e.target.value }))}
                />
              </div>

              {signupState.error && (
                <p
                  className="text-sm"
                  style={{ color: 'oklch(0.577 0.245 27.325)' }}
                >
                  {signupState.error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={signupState.loading}
              >
                {signupState.loading ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: 'oklch(0.912 0.004 80)' }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
              color: 'oklch(0.708 0.003 80)',
            }}
          >
            or
          </span>
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: 'oklch(0.912 0.004 80)' }}
          />
        </div>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={anyLoading}
          onClick={handleGoogle}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="size-4 shrink-0"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

      </div>
    </div>
  )
}
