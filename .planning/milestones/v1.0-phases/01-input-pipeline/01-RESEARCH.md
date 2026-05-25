# Phase 1: Input Pipeline - Research

**Researched:** 2026-05-22
**Domain:** Next.js 16 App Router — PDF parsing, file upload, URL scraping, SSE streaming, rate limiting
**Confidence:** HIGH (most areas verified against official docs or primary sources)

---

## Summary

Phase 1 builds the data ingestion layer: resume (PDF upload or paste) + job description (paste or URL fetch). Every technical decision made here establishes patterns that all later phases consume — SSE streaming infrastructure, Zod validation, rate limiting, and prompt-injection defense must all be wired up in this phase even though Phase 1 has no LLM calls.

The standard approach is: Next.js Route Handlers handle all I/O (FormData for uploads, JSON for text/URL inputs); `unpdf` wraps pdfjs-dist for server-side PDF text extraction in a serverless-safe way; `cheerio` + native `fetch` handle URL scraping for simple HTML job boards; SSE is set up via `ReadableStream` with proper headers; rate limiting uses `@upstash/ratelimit` in middleware or an in-memory fallback for development.

**Primary recommendation:** Use `unpdf` (wraps pdfjs-dist, no worker configuration required, works in Node.js and edge runtimes) for PDF parsing. Use `cheerio` + `fetch` for JD URL scraping with a hard exclusion list for LinkedIn/Indeed. Establish SSE via `ReadableStream` in route handlers now, even for a mock endpoint. Use `@upstash/ratelimit` with Upstash Redis for production rate limiting; in-memory Map fallback for local dev.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `unpdf` | latest (~0.13) | Server-side PDF text extraction | Wraps pdfjs-dist with no worker config needed; works across Node/edge/serverless; official pdfjs-dist alternative for server contexts |
| `cheerio` | ^1.0.0 | HTML parsing for URL-fetched JD pages | Lightweight jQuery-like parser; no browser required; standard for server-side HTML scraping |
| `zod` | ^3.x | Request/response schema validation | Single source of truth for runtime types; `safeParse` avoids throw-on-failure; infers TypeScript types |
| `@upstash/ratelimit` | latest | IP-based rate limiting | Purpose-built for edge + serverless; HTTP-based Redis, no connection pooling issues |
| `@upstash/redis` | latest | Redis client for rate limiter | Required peer dependency of @upstash/ratelimit; works in Next.js middleware edge runtime |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pdfjs-dist` | ^5.x | PDF engine (unpdf peer dep) | Install alongside unpdf; unpdf imports it internally |
| `uuid` | ^9 or `crypto.randomUUID()` | Session ID generation | If anonymous session cookie approach is chosen |
| `tw-animate-css` | latest | Tailwind v4 animation plugin | Replaces `tailwindcss-animate` which is Tailwind v3 only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unpdf` | `pdfjs-dist` directly | pdfjs-dist requires manual worker configuration — complicated in serverless; `unpdf` handles this automatically |
| `unpdf` | `pdf-parse` | pdf-parse is abandoned (last publish 2020); known security issues |
| `@upstash/ratelimit` | In-memory Map | In-memory doesn't survive restarts, doesn't work across multiple Vercel instances; fine for dev only |
| `cheerio` + `fetch` | `axios` + `cheerio` | Native `fetch` is built-in to Node 18+; axios adds a dependency for no gain here |

**Installation:**
```bash
npm install unpdf pdfjs-dist cheerio zod @upstash/ratelimit @upstash/redis
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── parse-resume/
│   │   │   └── route.ts        # POST: FormData PDF upload → text extraction
│   │   ├── fetch-jd/
│   │   │   └── route.ts        # POST: { url } → scraped JD text
│   │   └── stream/
│   │       └── route.ts        # GET/POST: SSE mock endpoint (Phase 2 slot-in)
│   ├── page.tsx                # Two-panel input UI
│   └── layout.tsx
├── components/
│   ├── resume-panel.tsx         # File upload + paste textarea + preview
│   ├── jd-panel.tsx             # Paste textarea + URL input
│   └── text-preview.tsx         # Shared scrollable text preview component
├── lib/
│   ├── pdf.ts                   # extractPdfText() wrapper around unpdf
│   ├── scraper.ts               # fetchJdFromUrl() with allowlist/blocklist
│   ├── ratelimit.ts             # Rate limiter singleton (upstash or in-memory)
│   ├── schemas.ts               # Zod schemas for all API requests/responses
│   └── sanitize.ts              # XML-tag wrapping for user content (Phase 2 prep)
└── middleware.ts                # Rate limiting applied to /api/* routes
```

### Pattern 1: PDF Upload via Route Handler (FormData)

**What:** Client posts multipart FormData to `/api/parse-resume`; handler extracts the File, reads it as ArrayBuffer, passes to unpdf.

**When to use:** PDF file upload. Never use Server Actions for file upload — Server Actions have a 1 MB body limit by default.

Route handlers in the App Router have no documented hard body limit for FormData in the Node.js runtime (the 1 MB limit applies to Server Actions only). The proxy body size defaults to 10 MB. For resume PDFs, 10 MB is sufficient.

```typescript
// Source: Next.js official docs (nextjs.org/docs/app/api-reference/file-conventions/route)
// src/app/api/parse-resume/route.ts
import { NextRequest } from 'next/server'
import { extractPdfText } from '@/lib/pdf'
import { ParseResumeResponseSchema } from '@/lib/schemas'

export const runtime = 'nodejs' // Required: pdfjs-dist needs Node runtime, not Edge

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return Response.json({ error: 'File must be a PDF' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const text = await extractPdfText(new Uint8Array(arrayBuffer))

  if (text.trim().length < 200) {
    return Response.json(
      { error: 'Could not extract readable text. Try pasting your resume instead.' },
      { status: 422 }
    )
  }

  return Response.json({ text })
}
```

### Pattern 2: PDF Text Extraction with unpdf

**What:** unpdf wraps pdfjs-dist with zero worker configuration. Works in Node.js route handlers without any `GlobalWorkerOptions` setup.

```typescript
// Source: github.com/unjs/unpdf README
// src/lib/pdf.ts
import { extractText, getDocumentProxy } from 'unpdf'

export async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(buffer)
  const { text } = await extractText(pdf, { mergePages: true })
  return text
}
```

**Critical note:** Add `pdfjs-dist` to `serverExternalPackages` in `next.config.ts` to prevent bundling issues:

```typescript
// next.config.ts
const nextConfig = {
  serverExternalPackages: ['pdfjs-dist'],
}
```

### Pattern 3: JD URL Scraping with fetch + cheerio

**What:** Fetch HTML with native `fetch` (with timeout via AbortController), parse with cheerio, extract body text, strip scripts/styles/nav.

```typescript
// Source: Cheerio docs + fetch AbortController pattern
// src/lib/scraper.ts
import * as cheerio from 'cheerio'

const BLOCKED_DOMAINS = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com']
const FETCH_TIMEOUT_MS = 10_000

export async function fetchJdFromUrl(url: string): Promise<string> {
  const parsed = new URL(url) // throws on invalid URL
  
  if (BLOCKED_DOMAINS.some(d => parsed.hostname.includes(d))) {
    throw new Error(`${parsed.hostname} requires a browser to load. Please paste the job description instead.`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let html: string
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobSeeker/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Page returned ${response.status}. It may be blocked or require login.`)
    }

    html = await response.text()
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('Page took too long to load (10s timeout). Try pasting the job description.')
    }
    throw err
  }

  const $ = cheerio.load(html)
  $('script, style, nav, header, footer, aside').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()

  if (text.length < 100) {
    throw new Error('Could not extract readable text from this page. It may be JavaScript-rendered. Try pasting the job description.')
  }

  return text
}
```

**ATS-specific insight:** Greenhouse and Lever expose public JSON APIs — for those URLs, parse JSON directly rather than scraping HTML:
- Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{id}` returns a `content` field with HTML
- Lever: `https://api.lever.co/v0/postings/{company}?mode=json` returns structured JSON
- Workday: requires JavaScript rendering — exclude from simple fetch, tell user to paste

### Pattern 4: SSE Streaming Route Handler

**What:** Establish the streaming endpoint pattern in Phase 1 using a mock, so Phase 2 can replace the mock body without restructuring.

**Critical:** Add `export const dynamic = 'force-dynamic'` to prevent Vercel from caching the SSE route.

```typescript
// Source: Next.js official docs streaming example + Upstash SSE blog
// src/app/api/stream/route.ts
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const encoder = new TextEncoder()

function formatSSE(data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(request: NextRequest) {
  // Phase 1: mock response. Phase 2 replaces this body with real Anthropic streaming.
  const stream = new ReadableStream({
    async start(controller) {
      // Signal: stream is open
      controller.enqueue(formatSSE({ type: 'start' }))

      // Mock delay to simulate processing
      await new Promise(r => setTimeout(r, 500))
      controller.enqueue(formatSSE({ type: 'chunk', content: '[mock analysis]' }))

      controller.enqueue(formatSSE({ type: 'done' }))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering if deployed behind nginx
    },
  })
}
```

**Client-side consumption pattern:**
```typescript
const response = await fetch('/api/stream', { method: 'POST', body: JSON.stringify(payload) })
const reader = response.body!.getReader()
const decoder = new TextDecoder()

while (true) {
  const { value, done } = await reader.read()
  if (done) break
  const chunk = decoder.decode(value)
  // Parse SSE lines: split on \n\n, parse JSON from "data: {...}" lines
}
```

### Pattern 5: Rate Limiting in Middleware

**What:** Apply IP-based rate limiting in `middleware.ts` before requests reach route handlers.

```typescript
// Source: upstash.com/docs/redis/sdks/ratelimit-ts + Next.js middleware pattern
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '60 s'), // 20 requests per minute per IP
  analytics: true,
})

export async function middleware(request: NextRequest) {
  // Only rate-limit API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anonymous'
  const { success, limit, remaining, reset } = await ratelimit.limit(ip)

  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

**Local dev fallback (no Redis required):**
```typescript
// src/lib/ratelimit.ts
// Use this during dev when UPSTASH_REDIS_REST_URL is not set
const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}
```

### Pattern 6: Zod Schema Validation

**What:** Define request/response schemas once; use for both runtime validation and TypeScript types.

```typescript
// Source: dub.co/blog/zod-api-validation + Zod docs
// src/lib/schemas.ts
import { z } from 'zod'

export const ParseResumeRequestSchema = z.object({
  // For text-paste path (JSON body)
  text: z.string().min(200, 'Resume text must be at least 200 characters'),
})

export const FetchJdRequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
})

export const ParseResumeResponseSchema = z.object({
  text: z.string(),
})

export const FetchJdResponseSchema = z.object({
  text: z.string(),
  source: z.enum(['url', 'paste']),
})

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.enum(['INVALID_INPUT', 'PARSE_FAILED', 'FETCH_FAILED', 'RATE_LIMITED']).optional(),
})

// Use safeParse in route handlers:
// const result = FetchJdRequestSchema.safeParse(body)
// if (!result.success) return Response.json({ error: result.error.flatten() }, { status: 400 })
```

### Pattern 7: XML-Tag Prompt Injection Defense (Phase 2 prep)

**What:** Wrap all user-supplied content in XML tags before any LLM call. Establish this in Phase 1 even though LLM calls don't happen until Phase 2.

```typescript
// src/lib/sanitize.ts
export function wrapUserContent(content: string, tag: string): string {
  // Strip any attempt to close the wrapping tag
  const sanitized = content.replace(new RegExp(`</?${tag}[^>]*>`, 'gi'), '')
  return `<${tag}>\n${sanitized}\n</${tag}>`
}

// Usage in Phase 2:
// const safeResume = wrapUserContent(resumeText, 'resume')
// const safeJd = wrapUserContent(jdText, 'job_description')
```

### Anti-Patterns to Avoid

- **Using Server Actions for file upload:** Server Actions have a configurable but default 1 MB body limit. Route Handlers have no per-route limit and default proxy is 10 MB. Always use Route Handlers for file uploads.
- **Using pdfjs-dist directly in Next.js without unpdf:** Requires manual `GlobalWorkerOptions.workerSrc` configuration, causes webpack errors with App Router bundling. Use `unpdf` which handles worker inlining.
- **Scraping LinkedIn/Indeed:** Both actively block simple HTTP scrapers. 403s, Cloudflare challenges, and terms-of-service violations. Hard-exclude these domains with a clear user message.
- **Not setting `export const runtime = 'nodejs'`:** Route handlers that use pdfjs-dist or cheerio need Node.js runtime, not Edge. Edge runtime lacks the Node APIs these libraries use.
- **Not setting `export const dynamic = 'force-dynamic'`:** SSE routes can be incorrectly cached by Next.js or Vercel CDN, breaking streaming.
- **Forgetting `X-Accel-Buffering: no`:** Nginx (used in many hosting environments) buffers SSE responses, making streaming appear to not work.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | `unpdf` | PDF format is highly complex; text ordering, encoding, multi-column layouts require sophisticated handling |
| Rate limiting storage | Custom Redis client | `@upstash/ratelimit` | Sliding window algorithm, atomic operations, cross-instance sharing require careful distributed systems code |
| HTML parsing | Regex-based HTML stripping | `cheerio` | HTML is not regular; nested tags, malformed markup, character encoding all break regex approaches |
| Form validation | Manual type-checking | `zod` | Runtime type safety + TypeScript inference from a single schema — manual checks drift from types |
| Session ID generation | Custom UUID implementation | `crypto.randomUUID()` (built-in) | Node 19+ has `crypto.randomUUID()` built in; no package needed |

**Key insight:** The PDF parsing domain has many edge cases that look trivial but aren't — two-column layouts produce concatenated column text, scanned PDFs produce empty extraction, encrypted PDFs fail silently. The 200-character minimum gate exists precisely because these failures produce short garbage output, not errors.

---

## Common Pitfalls

### Pitfall 1: Two-Column PDF Layouts Produce Garbled Text

**What goes wrong:** pdfjs-dist extracts text in draw order, not reading order. A two-column resume produces text that jumps between columns mid-sentence.

**Why it happens:** PDF has no semantic concept of "columns." Text is positioned absolutely. PDF.js reads position by y-coordinate, not logical flow.

**How to avoid:** The 200-character minimum is a proxy check, not a fix. The real mitigation is the parsed-text preview: show the user the extracted text before proceeding so they can catch garbled output and switch to paste mode.

**Warning signs:** Extracted text that mixes unrelated words (e.g., "Experience Software Engineer Education University of...") or drops below 200 characters on a resume that clearly has content.

### Pitfall 2: pdfjs-dist Webpack/Bundle Errors in App Router

**What goes wrong:** Importing pdfjs-dist directly in a route handler causes webpack errors: "Can't resolve 'canvas'", "Module not found: Can't resolve 'pdfjs-dist/build/pdf.worker.min.mjs'".

**Why it happens:** pdfjs-dist has optional native dependencies (canvas) and a worker file that webpack tries to bundle. The App Router's bundler doesn't handle this well.

**How to avoid:** Use `unpdf` instead of direct pdfjs-dist import. Add `pdfjs-dist` to `serverExternalPackages` in `next.config.ts`. Set `runtime = 'nodejs'` on the route.

**Warning signs:** Build errors mentioning canvas, worker.mjs, or top-level-await.

### Pitfall 3: SSE Streaming Buffered by Middleware or CDN

**What goes wrong:** SSE endpoint appears to "batch" all output at once rather than streaming, or doesn't stream at all.

**Why it happens:** Multiple layers buffer responses: Next.js itself (without `force-dynamic`), nginx (`X-Accel-Buffering`), Vercel CDN (no streaming on Hobby plan for SSE on some regions), browser (some browsers buffer small chunks).

**How to avoid:**
- `export const dynamic = 'force-dynamic'`
- `Cache-Control: no-cache, no-transform`
- `X-Accel-Buffering: no`
- Enqueue chunks of at least 1KB or use a keepalive `:` SSE comment every 15 seconds for small payloads

**Warning signs:** All chunks arrive simultaneously at the client, or the response is blank until the handler completes.

### Pitfall 4: Route Handler Body Size Limit Confusion

**What goes wrong:** Developers hit 1 MB body limit errors when uploading resumes.

**Why it happens:** The 1 MB limit applies to **Server Actions**, not Route Handlers. Route Handlers in the App Router don't have a per-route body size config (unlike Pages Router API routes). The default proxy body limit is 10 MB.

**How to avoid:** Use Route Handlers (not Server Actions) for file upload. Don't try to configure `bodyParser.sizeLimit` in App Router routes — that API doesn't exist in App Router.

**Warning signs:** "Body exceeded 1MB limit" error — only occurs if someone uses a Server Action for upload instead of a Route Handler.

### Pitfall 5: URL Scraping Fails on JS-Rendered Pages

**What goes wrong:** The fetch + cheerio approach returns empty or navigation-only text for Workday, Taleo, iCIMS, and some LinkedIn/Indeed pages.

**Why it happens:** These sites render content via JavaScript after initial page load. The static HTML returned by `fetch` contains only skeleton markup.

**How to avoid:** Explicitly detect and block known JS-rendered ATS domains. Return a clear error: "This page requires a browser to load. Please paste the job description instead." Don't attempt headless browser scraping in Phase 1 — too complex, too slow for a route handler.

**Warning signs:** Extracted text length < 100 characters from a URL that clearly shows a job posting in a browser.

### Pitfall 6: Upstash Rate Limiter Requires Edge-Compatible Build

**What goes wrong:** `@upstash/ratelimit` in middleware throws runtime errors about Node.js APIs not being available.

**Why it happens:** Next.js middleware runs in the Edge Runtime by default, which lacks many Node.js APIs. `@upstash/ratelimit` uses HTTP-based Redis (not TCP), so it IS edge-compatible, but you must use `@upstash/redis` (not `ioredis` or `redis` npm packages).

**How to avoid:** Use `@upstash/ratelimit` with `@upstash/redis` — this combination is explicitly designed for Edge. Never use `ioredis` in middleware.

**Warning signs:** "The edge runtime does not support Node.js 'net' module" in middleware.

---

## Code Examples

### Complete parse-resume Route Handler

```typescript
// src/app/api/parse-resume/route.ts
import { NextRequest } from 'next/server'
import { extractText, getDocumentProxy } from 'unpdf'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return Response.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
    const { text } = await extractText(pdf, { mergePages: true })

    if (text.trim().length < 200) {
      return Response.json(
        {
          error: 'Could not extract readable text from this PDF. The file may be scanned, have a complex layout, or be empty. Please paste your resume text instead.',
          code: 'PARSE_FAILED',
        },
        { status: 422 }
      )
    }

    return Response.json({ text: text.trim() })
  } catch (err: any) {
    console.error('PDF parse error:', err)
    return Response.json(
      { error: 'Failed to parse PDF. Please paste your resume text instead.', code: 'PARSE_FAILED' },
      { status: 422 }
    )
  }
}
```

### Complete fetch-jd Route Handler

```typescript
// src/app/api/fetch-jd/route.ts
import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import { z } from 'zod'

export const runtime = 'nodejs'

const RequestSchema = z.object({ url: z.string().url() })

const BLOCKED_DOMAINS = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com']

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json()
  const parsed = RequestSchema.safeParse(bodyRaw)

  if (!parsed.success) {
    return Response.json({ error: 'Invalid URL', code: 'INVALID_INPUT' }, { status: 400 })
  }

  const { url } = parsed.data
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return Response.json({ error: 'Invalid URL format', code: 'INVALID_INPUT' }, { status: 400 })
  }

  if (BLOCKED_DOMAINS.some(d => hostname.includes(d))) {
    return Response.json(
      { error: `${hostname} cannot be fetched automatically. Please paste the job description text.`, code: 'FETCH_FAILED' },
      { status: 422 }
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobSeeker/1.0)', 'Accept': 'text/html' },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return Response.json(
        { error: `Could not load page (HTTP ${response.status}). The page may be private or blocked. Try pasting the job description.`, code: 'FETCH_FAILED' },
        { status: 422 }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    $('script, style, nav, header, footer, aside, [aria-hidden="true"]').remove()
    const text = $('body').text().replace(/\s+/g, ' ').trim()

    if (text.length < 100) {
      return Response.json(
        { error: 'Could not extract readable text. The page may be JavaScript-rendered. Try pasting the job description.', code: 'FETCH_FAILED' },
        { status: 422 }
      )
    }

    return Response.json({ text })
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      return Response.json(
        { error: 'Page took too long to respond (10s). Try pasting the job description.', code: 'FETCH_FAILED' },
        { status: 422 }
      )
    }
    return Response.json(
      { error: 'Failed to fetch page. Try pasting the job description.', code: 'FETCH_FAILED' },
      { status: 422 }
    )
  }
}
```

### Tailwind v4 + shadcn/ui Two-Panel Layout

```tsx
// src/app/page.tsx — Two-panel input layout
// Uses CSS Grid with Tailwind v4 utility classes
// shadcn/ui Card components wrap each panel

export default function HomePage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">Job Application Analyzer</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
        <ResumePanel />
        <JobDescriptionPanel />
      </div>
    </main>
  )
}
```

**shadcn/ui with Tailwind v4 notes:**
- Initialize via CLI: `npx shadcn@latest init` — prompts for Tailwind v4 automatically in current versions
- Replace `tailwindcss-animate` with `tw-animate-css` in CSS imports
- CSS variables move to `@theme inline` block, not `@layer base`
- All existing Tailwind v3 utility classes work unchanged

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pdf-parse` | `unpdf` + pdfjs-dist | 2022 (pdf-parse abandoned) | pdf-parse is unmaintained; use unpdf |
| `tailwindcss-animate` | `tw-animate-css` | Tailwind v4 release | New animation plugin for v4 |
| `serverComponentsExternalPackages` | `serverExternalPackages` | Next.js v15.0.0 | Config key renamed; old key still works but deprecated |
| Pages Router `bodyParser.sizeLimit` | No per-route config in App Router | Next.js 13+ | Use Route Handlers (not Server Actions) for uploads; global proxy limit is 10 MB |
| `context.params` direct access | `await context.params` (Promise) | Next.js v15.0.0-RC | Dynamic route params are now async |

**Deprecated/outdated:**
- `pdf-parse`: Last published 2020, has known vulnerabilities, do not use
- `pdfjs-dist` direct import in App Router without `serverExternalPackages`: Causes webpack bundling errors
- Server Actions for file upload: 1 MB body limit, not suitable for PDFs

---

## Open Questions

1. **Anonymous session IDs vs pure stateless**
   - What we know: Both approaches are viable. UUID cookie (24hr TTL) enables per-session rate limiting and future analytics. Pure stateless means no cookie, each request is independent.
   - Recommendation: **Use UUID cookie with 24hr TTL.** Rationale: (a) enables per-session rate limiting that's more accurate than IP-only (shared IPs in corporate/university networks would otherwise hit limits collectively), (b) allows Phase 3+ to correlate requests for analytics without a database, (c) trivial to implement via `crypto.randomUUID()` + `cookies()` from `next/headers`. The cookie carries no sensitive data, no auth implication, just a session identifier. A pure stateless approach saves ~10 lines of code at the cost of worse rate limiting.

2. **Greenhouse/Lever URL detection for API path vs HTML scraping**
   - What we know: Both have public JSON APIs that are more reliable than HTML scraping. Greenhouse URL format: `boards.greenhouse.io/company/jobs/123`. Lever: `jobs.lever.co/company/uuid`.
   - Recommendation: In Phase 1, handle ALL URLs through the generic cheerio path. Add Greenhouse/Lever JSON API fast paths in Phase 2 or as enhancement if scraping quality is poor.

3. **Vercel Hobby plan SSE streaming**
   - What we know: Vercel Hobby plan has execution time limits (10s for Edge, 60s for Serverless) and some CDN buffering constraints for SSE.
   - Recommendation: Establish SSE pattern with `runtime = 'nodejs'` to use the 60s limit (not Edge's 10s). Phase 2 LLM responses should complete well within 60s for reasonable inputs. Flag this as a deployment concern to monitor.

4. **File size upper bound for PDF uploads**
   - What we know: The proxy body limit is 10 MB. Resume PDFs are rarely over 2 MB.
   - Recommendation: Enforce a 5 MB client-side check before upload (avoids waiting for a slow upload to fail). Add server-side check as defense-in-depth.

---

## Sources

### Primary (HIGH confidence)

- Next.js official docs v16.2.6 (nextjs.org) — route.ts reference, serverExternalPackages, streaming patterns, FormData handling, body size limits
- github.com/unjs/unpdf README — installation, text extraction API, Node.js/serverless compatibility
- upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted — rate limiter API, sliding window algorithm, Next.js middleware pattern
- developers.greenhouse.io/job-board.html — Greenhouse job board API URL format and JSON structure

### Secondary (MEDIUM confidence)

- upstash.com/blog/sse-streaming-llm-responses — SSE ReadableStream pattern with headers, verified against Next.js official streaming docs
- github.com/vercel/next.js/discussions/68409 — App Router body size limit behavior (per-route limit not available; Server Action vs Route Handler distinction)
- blog.apify.com/web-scraping-with-cheerio — Cheerio + fetch patterns, JS-rendered page limitations
- dub.co/blog/zod-api-validation — Zod safeParse pattern for route handlers
- freecodecamp.org/news/how-to-build-an-in-memory-rate-limiter-in-nextjs — In-memory fallback rate limiter pattern

### Tertiary (LOW confidence)

- WebSearch results on LinkedIn/Indeed scraping blockage — confirmed 403 and Cloudflare challenges, but no official documentation; treat as strong community evidence
- WebSearch on Workday JS-rendering requirement — consistent across multiple sources but no official Workday documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official docs and primary library sources
- Architecture patterns: HIGH — directly from Next.js official docs with code examples
- PDF extraction (unpdf): HIGH — official README verified
- JD URL scraping: MEDIUM — cheerio patterns well-documented; ATS-specific behavior based on community evidence
- Rate limiting: HIGH — Upstash official docs verified
- Tailwind v4 / shadcn/ui: HIGH — official shadcn docs confirm Tailwind v4 support

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (Next.js moves fast; verify serverExternalPackages list and Tailwind v4 migration notes if planning past this date)
