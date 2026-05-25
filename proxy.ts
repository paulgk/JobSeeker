import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'
import { checkRateLimit } from '@/lib/ratelimit'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply rate limiting to API routes only
  if (pathname.startsWith('/api')) {
    // Prefer X-Forwarded-For (set by Vercel/proxies), fall back to a constant for local dev
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'local-dev'

    const { success, remaining, resetAt } = await checkRateLimit(ip)

    if (!success) {
      const retryAfterSecs = Math.ceil((resetAt - Date.now()) / 1000)
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please wait before trying again.', code: 'RATE_LIMITED' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSecs > 0 ? retryAfterSecs : 60),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    return response
  }

  // Session-cookie guard for protected and auth-only pages
  const sessionCookie = getSessionCookie(request)

  if (pathname.startsWith('/history') && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  if (pathname.startsWith('/sign-in') && sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
