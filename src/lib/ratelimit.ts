/**
 * Rate limiter with two modes:
 * - Production: @upstash/ratelimit + @upstash/redis (sliding window, 20 req/min/IP)
 * - Development: in-memory Map (single-instance only, resets on restart)
 *
 * Mode is selected automatically based on UPSTASH_REDIS_REST_URL presence.
 */

// In-memory fallback store (dev only)
const store = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000 // 1 minute
const LIMIT = 20 // 20 requests per window per identifier

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number // Unix timestamp ms
}

/**
 * Check and increment rate limit for a given identifier (IP or session ID).
 * Returns success=false when the limit is exceeded.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const hasUpstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN

  if (hasUpstash) {
    return checkUpstash(identifier)
  }

  return checkInMemory(identifier)
}

async function checkUpstash(identifier: string): Promise<RateLimitResult> {
  // Dynamic import so the module is only loaded when Upstash creds are present.
  // This prevents Edge runtime errors when creds are absent.
  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(LIMIT, '60 s'),
    analytics: true,
    prefix: 'jseeker',
  })

  const result = await ratelimit.limit(identifier)
  return {
    success: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  }
}

function checkInMemory(identifier: string): RateLimitResult {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return { success: true, remaining: LIMIT - 1, resetAt: now + WINDOW_MS }
  }

  if (entry.count >= LIMIT) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: LIMIT - entry.count, resetAt: entry.resetAt }
}
