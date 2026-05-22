import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/ratelimit'

export async function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

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

export const config = {
  // Apply to all /api routes. Exclude Next.js internals and static assets.
  matcher: '/api/:path*',
}
