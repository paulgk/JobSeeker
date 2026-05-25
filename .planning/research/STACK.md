# Technology Stack: JobSeeker

**Project:** JobSeeker — AI-powered resume analysis and job coaching web app
**Researched:** 2026-05-21
**Research mode:** Ecosystem

---

## Summary Table

| Layer | Technology | Version | Confidence |
|-------|------------|---------|------------|
| Frontend framework | Next.js (App Router) | 16.x | HIGH |
| Language | TypeScript | 5.x | HIGH |
| Styling | Tailwind CSS v4 | 4.x | HIGH |
| Component primitives | shadcn/ui | latest | MEDIUM |
| API layer | Next.js Route Handlers | built-in | HIGH |
| Form/mutation pattern | Route Handlers via fetch (not Server Actions for file upload) | built-in | HIGH |
| PDF parsing | pdfjs-dist (mozilla/pdf.js) | 4.x | MEDIUM |
| Word parsing | mammoth | 1.x | MEDIUM |
| URL scraping | Cheerio + undici/fetch | 1.x / built-in | MEDIUM |
| AI/LLM engine | Anthropic SDK (@anthropic-ai/sdk) | 0.97.x | HIGH |
| Claude model | claude-sonnet-4-5 (or current Sonnet) | latest alias | MEDIUM |
| Streaming | Anthropic SDK `stream()` + ReadableStream | SDK built-in | HIGH |
| Schema validation | Zod | 3.x | HIGH |
| Deployment target (v1) | Vercel (verified adapter) | — | HIGH |
| Deployment target (v2+) | Railway / Docker + Node.js | — | MEDIUM |
| Auth (future) | NextAuth.js v5 / Auth.js | 5.x | MEDIUM |
| Database (future) | PostgreSQL via Prisma or Drizzle | — | MEDIUM |

---

## Layer 1: Frontend Framework

### Recommendation: Next.js 16 App Router with TypeScript

**Why Next.js over alternatives:**

Next.js is the clear choice for this project for three specific reasons:

1. **Single-repo fullstack**: The Claude API calls, PDF parsing, and URL scraping all run server-side. Next.js Route Handlers give you a typed, co-located API layer without spinning up a separate backend service. This is decisive for a solo/small team demo.

2. **Streaming built-in**: LLM responses benefit enormously from streaming (user sees words appear rather than waiting 10–30 seconds for a complete analysis). Next.js Route Handlers support `ReadableStream` responses natively, and the Anthropic SDK's `stream()` method integrates cleanly.

3. **Stateless → multi-user migration path is clean**: The stateless v1 lives entirely in Route Handlers. When you add auth, you drop in NextAuth.js v5 (Auth.js), add a DB-backed session, and wrap routes with `auth()` checks. The frontend components don't need rewrites — you add a user context layer.

**Why not alternatives:**

- **Remix/React Router v7**: Good framework but smaller ecosystem, fewer AI-specific examples, and Vercel deployment is less seamless. The loader/action model is elegant but not meaningfully better for this use case.
- **SvelteKit**: Excellent DX but TypeScript ecosystem for LLM tooling (Zod schemas for Claude structured output, AI SDK) is React/TS-first. Smaller component library ecosystem.
- **Plain Express + Vite React SPA**: Requires managing two separate processes, two deployment targets. Adds operational complexity with no benefit at this scale.
- **T3 Stack (Next.js + tRPC + Prisma)**: tRPC adds overhead with no benefit while the app is stateless. Adopt pieces of it (Prisma, Zod) individually when adding the DB layer.

**Version note:** Official Next.js docs confirm version **16.2.6** as of 2026-05-19. The `create-next-app` default now includes TypeScript, Tailwind CSS, ESLint, App Router, and Turbopack as the bundler. Node.js 20.9+ required.

```bash
npx create-next-app@latest jobseeker --yes
```

This scaffolds with all recommended defaults including Turbopack (now the default dev bundler).

---

## Layer 2: Styling

### Recommendation: Tailwind CSS v4 + shadcn/ui

**Tailwind CSS v4** (confirmed current in Next.js 16 docs):

The v4 setup differs from v3 — there is no `tailwind.config.js`. Configuration is done via PostCSS plugin and CSS imports:

```bash
npm install -D tailwindcss @tailwindcss/postcss
```

`create-next-app` with defaults already sets this up correctly. Do not follow v3 tutorials (separate config file, `content` array) — they are outdated.

**shadcn/ui** for component primitives:

shadcn/ui provides unstyled-but-composable Radix UI components (Dialog, Progress, Tabs, Textarea, Button, etc.) with Tailwind class variants. It installs components as source files in your project (not a dependency), meaning full customization without fighting a component library's opinionated styles.

This project specifically needs: file drop zones, progress indicators for LLM streaming, tabbed result panels, accordion for gap analysis, and responsive layout. shadcn/ui covers all of these with minimal bundle overhead.

**Why not Material UI / Chakra UI / Mantine**: These bring their own styling systems that conflict with Tailwind. They're heavier, slower to customize, and the DX for a Tailwind-first project is worse.

---

## Layer 3: API / Backend Layer

### Recommendation: Next.js Route Handlers (not Server Actions for file upload)

**Critical distinction for file upload:**

Server Actions have a **1MB default body size limit** (configurable via `serverActions.bodySizeLimit` in `next.config.js`). More importantly, Server Actions are designed for form mutations and progressive enhancement — not for the file → parse → LLM pipeline this app needs.

**Use Route Handlers for all AI operations:**

Route Handlers (`app/api/*/route.ts`) receive `request.formData()` for file uploads without the 1MB Server Actions constraint. They return `Response` objects, which means you can return a `ReadableStream` for streaming LLM output — Server Actions cannot stream arbitrary data back.

Recommended route structure:

```
app/api/
  resume/parse/route.ts       POST multipart/form-data → returns structured resume JSON
  jd/fetch/route.ts           POST { url } → returns extracted JD text
  analysis/match/route.ts     POST { resume, jd } → streams Claude analysis
  analysis/rewrite/route.ts   POST { resume, jd, section } → streams Claude rewrite
  interview/questions/route.ts POST { resume, jd } → streams Q generation
  interview/coach/route.ts    POST { question, answer, resume } → streams feedback
```

**Migration path to multi-user**: Add an `auth()` check from NextAuth.js at the top of each route handler. The route signatures don't change — you just wrap the handler body with an auth guard and attach `userId` to DB operations.

---

## Layer 4: AI / LLM Integration

### Recommendation: Anthropic SDK directly (not Vercel AI SDK)

**Anthropic SDK (@anthropic-ai/sdk v0.97.x):**

```bash
npm install @anthropic-ai/sdk
```

The SDK provides three key methods on `client.messages`:

- `create()` — non-streaming, returns complete message
- `stream()` — returns `MessageStream`, supports `for await` iteration and event listeners
- `parse()` — non-streaming with Zod-schema structured output

**Why not Vercel AI SDK:**

The Vercel AI SDK (`ai` package) is a useful abstraction when you're multi-model and want a unified interface across OpenAI, Anthropic, and others. For this project:

- Claude is the only model used
- The abstraction layer adds complexity without benefit
- Structured output (Zod parsing) in the Anthropic SDK is now first-class
- Direct SDK gives full control over system prompt construction, context window management, and cost logging

If this project later needs to compare Claude vs. GPT-4o results as a feature, revisit Vercel AI SDK at that point.

**Streaming to the browser via Route Handler:**

```typescript
// app/api/analysis/match/route.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function POST(request: Request) {
  const { resume, jd } = await request.json();

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250929', // verify current alias before using
    max_tokens: 4096,
    system: 'You are an expert resume coach...',
    messages: [{ role: 'user', content: `Resume:\n${resume}\n\nJD:\n${jd}` }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

**Model selection (MEDIUM confidence — verify at start of project):**

As of research date, the Anthropic SDK README documents `claude-opus-4-6` and `claude-sonnet-4-5-20250929`. For this app:

- Use **Claude Sonnet** (not Opus): Sonnet is 5x cheaper than Opus with comparable quality for structured analysis tasks. Resume analysis, rewriting, and interview coaching are prompt-engineering problems, not frontier-capability problems.
- Use **Claude Haiku** for the mock Q&A feedback loop: lower latency, cost-appropriate for rapid back-and-forth.
- Always use the **dated model ID** (`claude-sonnet-4-5-20250929` not `claude-sonnet-latest`) in production to avoid unexpected behavior changes. Use the alias during prototyping only.

**Action item at project start:** Run `npx @anthropic-ai/sdk list-models` or check `https://docs.anthropic.com/en/docs/about-claude/models/overview` for the current model IDs before writing any prompts.

**Structured output with Zod:**

The SDK supports `zodOutputFormat()` for structured responses. Use this for the match score and gap analysis endpoint where you need typed JSON back:

```typescript
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

const MatchSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.object({ area: z.string(), severity: z.enum(['high', 'medium', 'low']) })),
  actionItems: z.array(z.string()),
});

const result = await client.messages.parse({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2048,
  messages: [{ role: 'user', content: prompt }],
  output_config: zodOutputFormat(MatchSchema, 'match_analysis'),
});
// result.output is typed as z.infer<typeof MatchSchema>
```

---

## Layer 5: Document Parsing

### PDF: pdfjs-dist (Mozilla PDF.js)

**Why pdfjs-dist over pdf-parse:**

`pdf-parse` is unmaintained (last publish was 2018 based on npm history) and wraps an old version of PDF.js. `pdfjs-dist` is the official build of Mozilla PDF.js, actively maintained, and runs in Node.js with the `canvas` legacy option disabled.

```bash
npm install pdfjs-dist
```

**Known limitations (important for resume PDFs):**

- Multi-column layouts (two-column resume templates) will have text interleaved in reading order, not visual order. This is a hard limitation of PDF text extraction generally — not fixable without OCR or AI-assisted layout interpretation.
- PDFs with embedded fonts as outlines (some creative templates) may extract garbled text.
- Scanned PDFs (image-only) return no text at all.

**Mitigation**: Pass the extracted text to Claude with a note that it may have ordering artifacts. Claude handles this gracefully. For the v1 stateless demo, this is acceptable. If users report bad extractions, add a "paste resume text instead" fallback path (which should exist anyway).

**Implementation note**: pdfjs-dist v4 runs in Node.js but requires setting the worker to `pdfjs-dist/build/pdf.worker.mjs` or disabling the worker. In a Next.js Route Handler (server-side), use the non-worker path:

```typescript
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then(page => page.getTextContent())
    )
  );
  return pages
    .flatMap(p => p.items)
    .map((item: any) => item.str)
    .join(' ');
}
```

Verify the exact import path against the installed version — pdfjs-dist has reorganized paths between v3 and v4.

### Word (.docx): mammoth

```bash
npm install mammoth
```

`mammoth` converts `.docx` to plain text (or HTML). It is actively maintained, handles the OOXML format reliably, and is straightforward for server-side Buffer input:

```typescript
import mammoth from 'mammoth';

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
```

`extractRawText` is preferred over `convertToHtml` for LLM input — the HTML adds noise the model doesn't need.

**Why not docx (npm) or officegen:** `mammoth` is the most widely used and reliable Node.js DOCX parser. `docx` is a document builder, not a parser. `officegen` is read-write and heavyweight.

### URL Job Description Fetching

For fetching and parsing HTML from job posting URLs:

**Recommended approach:**

1. **Fetch**: Use Node.js built-in `fetch` (available in Node 20+, no extra dependency). Add a realistic User-Agent header — many job boards reject bot-looking requests.

2. **Parse HTML**: Use `cheerio` to extract text content, stripping nav, headers, footers, and ads.

```bash
npm install cheerio
```

```typescript
import * as cheerio from 'cheerio';

export async function fetchJdFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobSeeker/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  $('nav, header, footer, script, style, aside, [role="banner"], [role="navigation"]').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}
```

**Known limitations**: LinkedIn and Greenhouse require authentication. Workday and Lever use heavy JavaScript rendering that `fetch` cannot execute. For v1, document this clearly and provide a "paste JD text" fallback as the primary path.

**If JavaScript-rendered sites must be supported in v2**: Add Playwright or Puppeteer for headless browser rendering. This is a significant infrastructure addition — defer until there is validated demand.

**Why not Puppeteer in v1**: Cold start penalty of ~500ms+ on Vercel serverless is prohibitive, and the binary size pushes against free tier limits. Headless browser rendering is a v2+ enhancement.

---

## Layer 6: Validation

### Recommendation: Zod

```bash
npm install zod
```

Zod is standard for runtime validation in TypeScript projects. Use it for:

- Validating request bodies in Route Handlers (fail fast before calling Claude)
- Defining structured output schemas for Claude via `zodOutputFormat()`
- Validating scraped JD content before passing to LLM

This is a dependency you will use throughout. It has no alternative worth considering in 2025-2026 TypeScript ecosystem.

---

## Layer 7: Deployment

### v1 Recommendation: Vercel

Vercel is the verified, officially supported deployment platform for Next.js (per Next.js docs). For a stateless demo app:

- Zero-config deployment from GitHub
- Automatic preview deployments per PR (useful for demos)
- Free tier is sufficient for personal use / demo traffic
- Streaming responses work without configuration
- Environment variable management is straightforward

**Critical Vercel limit to know**: Serverless function timeout is **10 seconds** on Hobby, **60 seconds** on Pro. Claude's full resume analysis + rewriting could take 15–30 seconds for long responses. **Recommendation**: Start Vercel Pro trial, or structure the operations to stream incrementally (perceived response time is fast even if total completion takes 30s).

**File upload on Vercel**: Route Handlers receiving multipart form data work on Vercel, but the request body is limited to Vercel's platform limit (~4.5MB for payloads). Most PDF resumes are under 1MB, so this is not a practical constraint.

### v2 Migration Path: Railway or Docker + Node.js

When multi-user requires a persistent database and longer-running operations:

- **Railway**: Managed Node.js + PostgreSQL in same region, persistent disk if needed, no cold starts. Simple GitHub deploy.
- **Docker + Node.js**: `next build && next start` on any VPS (Fly.io, DigitalOcean App Platform, Render). Use `output: 'standalone'` in `next.config.ts` for a minimal Docker image.

Both options support all Next.js features (unlike static export or edge-only deployments). The migration from Vercel to Railway requires only updating environment variables and connection strings — no code changes.

---

## Future Layers (Not for v1)

### Authentication: NextAuth.js v5 (Auth.js)

When adding user accounts:

```bash
npm install next-auth@beta
```

NextAuth.js v5 is designed for Next.js App Router with a `auth()` helper that works in both Route Handlers and Server Components. It supports OAuth providers (Google, GitHub), credentials, and magic link email out of the box.

**Migration impact on v1 code**: Wrap each Route Handler with `const session = await auth(); if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });`. That is the entire change surface.

### Database: PostgreSQL + Drizzle ORM

When persistence is needed:

- **Drizzle** over Prisma for new projects: generates less overhead, TypeScript-first schema, better performance on serverless, and the migration story is simpler.
- **PostgreSQL** via Neon (serverless Postgres, works on Vercel) for hosted, or Railway's bundled Postgres for self-hosted.

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| **Pages Router** | Legacy; App Router is the current model for all new Next.js work |
| **Server Actions for file upload** | 1MB body limit by default; not designed for binary upload pipeline |
| **pdf-parse (npm)** | Unmaintained since 2018; wraps outdated PDF.js; use pdfjs-dist directly |
| **Puppeteer / Playwright in v1** | Cold start penalty on serverless; binary size; defer to v2 for JS-rendered JD pages |
| **Vercel AI SDK (`ai` package) for single-model** | Useful abstraction for multi-model; adds indirection without benefit when Claude is the only engine |
| **tRPC in v1** | No benefit while stateless; adds boilerplate; add when you have a DB layer to query |
| **Edge Runtime for AI routes** | Edge has 1MB response body limit and no Node.js APIs — PDF parsing requires Node.js. Use `runtime = 'nodejs'` explicitly on AI routes |
| **OpenAI as fallback** | Premature complexity; Claude is the stated requirement; add multi-model in v2 only if benchmarking shows a gap |

---

## Installation Commands

```bash
# Bootstrap project
npx create-next-app@latest jobseeker --yes
cd jobseeker

# AI / LLM
npm install @anthropic-ai/sdk

# Validation (Zod)
npm install zod

# Document parsing
npm install pdfjs-dist mammoth

# HTML parsing for JD URLs
npm install cheerio

# UI components (shadcn CLI installs individual components)
npx shadcn@latest init
npx shadcn@latest add button card tabs textarea dialog progress badge
```

---

## Stateless → Multi-User Migration Checklist

The v1 stateless design makes these the only changes required when adding users:

| Area | v1 State | Change Needed |
|------|----------|---------------|
| Route Handlers | Open, no auth | Add `auth()` guard at top of each handler |
| State management | URL / session storage in browser | Replace with DB-backed user record |
| Resume storage | Not stored; parsed per-request | Add file storage (S3/R2) + DB reference |
| Analysis history | Not stored | Add `analyses` table in DB |
| Rate limiting | None | Add per-user rate limiting on AI routes |
| Deployment | Vercel Hobby | Upgrade to Vercel Pro, or migrate to Railway |

None of these changes require touching component code or the parsing pipeline. The Route Handler signatures remain the same — auth wraps the inside.

---

## Confidence Assessment

| Area | Level | Source | Notes |
|------|-------|--------|-------|
| Next.js version (16.2.6) | HIGH | Official nextjs.org docs, confirmed 2026-05-19 | |
| Next.js App Router / Route Handlers | HIGH | Official docs | |
| Tailwind v4 setup | HIGH | Official Next.js CSS docs | v3 tutorials are outdated |
| Server Actions 1MB limit | HIGH | Official Next.js serverActions config docs | |
| Anthropic SDK version (0.97.x) | HIGH | GitHub releases, confirmed 2026-05-21 | |
| Claude model names | MEDIUM | SDK source + README; listed names may be superseded | Verify at project start |
| pdfjs-dist recommendation | MEDIUM | Based on pdf-parse abandonment + PDF.js maintenance; npm page not accessible | Confirm version import path |
| mammoth recommendation | MEDIUM | Widely known; npm page not accessible to verify current version | Check npm before installing |
| Cheerio for HTML parsing | MEDIUM | Established library; version not confirmed from current source | |
| shadcn/ui | MEDIUM | Widely used in Next.js ecosystem; not verified against current docs | |
| Vercel as deployment | HIGH | Verified adapter per official Next.js deployment docs | |
| NextAuth.js v5 for future auth | MEDIUM | Known library; version status not verified from current docs | |

---

## Sources

- Next.js 16.2.6 official documentation: https://nextjs.org/docs (confirmed last updated 2026-05-19)
- Next.js Route Handlers reference: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Server Actions body size limit: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- Next.js deployment options: https://nextjs.org/docs/app/getting-started/deploying
- Next.js CSS / Tailwind v4 setup: https://nextjs.org/docs/app/getting-started/css
- Next.js create-next-app defaults (TS, Tailwind, ESLint, Turbopack): https://nextjs.org/docs/app/getting-started/installation
- Anthropic TypeScript SDK releases: https://github.com/anthropics/anthropic-sdk-typescript/releases (v0.97.1, confirmed 2026-05-21)
- Anthropic SDK streaming example: https://github.com/anthropics/anthropic-sdk-typescript/blob/main/examples/streaming.ts
- Anthropic SDK messages API (stream/create/parse): https://github.com/anthropics/anthropic-sdk-typescript/blob/main/src/resources/messages/messages.ts
