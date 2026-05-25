# Architecture Patterns

**Domain:** AI-powered resume analysis / job search assistant web app
**Researched:** 2026-05-21
**Confidence:** HIGH (well-established patterns for LLM document pipelines; stateless→auth migration is a solved problem)

---

## Recommended Architecture

### Conceptual Layers

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Upload UI   │  │  JD Input UI │  │  Results / Chat  │  │
│  │ (file drop)  │  │ (paste/URL)  │  │  UI Components   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────▲─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │  HTTP multipart │  HTTP JSON         │ SSE / JSON
          ▼                 ▼                    │
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Route Handlers                     │   │
│  │  POST /parse-resume   POST /parse-jd                 │   │
│  │  POST /analyse        POST /optimise                 │   │
│  │  POST /interview-prep POST /interview-chat           │   │
│  └──────┬───────────────────────┬───────────────────────┘   │
│         │                       │                           │
│  ┌──────▼──────┐   ┌────────────▼────────────┐             │
│  │   Document  │   │        LLM Pipeline      │             │
│  │   Parsing   │   │  (Prompt Builder +       │             │
│  │   Service   │   │   Claude API Client)     │             │
│  └──────┬──────┘   └────────────┬────────────┘             │
│         │                       │                           │
│  ┌──────▼──────┐   ┌────────────▼────────────┐             │
│  │  PDF/DOCX   │   │       Structured         │             │
│  │  Extractor  │   │       Output Parser      │             │
│  └─────────────┘   └─────────────────────────┘             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            URL Fetch / JD Scraper Service            │   │
│  │   (server-side, avoids CORS; clean text extraction)  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                   Claude API (external)
```

---

## Component Boundaries

### 1. UI Layer (Browser)

**Responsibility:** Capture user inputs, render outputs, manage ephemeral session state in memory or sessionStorage.

**Contains:**
- File drop / upload widget
- JD paste textarea + URL input toggle
- Results panels (score card, gap list, rewrites, interview Q&A)
- Streaming response renderer (for long LLM outputs)
- Ephemeral state store (resume text + JD text held in memory for the session)

**Communicates with:** API Layer only. Never calls Claude API directly.

**Boundary rationale:** Keeping Claude API calls server-side means the API key stays private, rate limiting is centralised, and the client boundary doesn't change when auth is added.

---

### 2. API Layer (Server)

**Responsibility:** Orchestrate all feature flows. Accepts requests from the browser, calls internal services, calls Claude API, returns results.

**Contains:**
- Route handlers (one per feature flow)
- Request validation and sanitisation
- Prompt construction (pulls structured resume + JD into prompts)
- Streaming passthrough (Claude API → SSE → browser)
- Error boundary (LLM failures, parsing failures, scrape failures)

**Does NOT contain:**
- Business logic scattered across routes — each route delegates to a service
- Direct file system writes (stateless; no persistence)

**Communicates with:** Document Parsing Service, URL Fetch Service, Claude API Client, browser.

---

### 3. Document Parsing Service

**Responsibility:** Convert PDF or DOCX bytes into clean, structured plain text.

**Contains:**
- PDF text extraction (pdf-parse or pdfjs-dist for Node; pypdf / pdfminer for Python)
- DOCX extraction (mammoth for Node; python-docx for Python)
- Post-processing: strip headers/footers, collapse whitespace, detect section headings

**Does NOT contain:**
- LLM calls — raw text extraction is deterministic; save LLM budget for analysis
- Storage — return text directly to caller

**Communicates with:** API Layer (called synchronously before LLM pipeline starts).

**Key decision:** Keep this as a pure synchronous function, not a microservice. At this scale, the overhead of a separate service is not justified, and a module boundary is sufficient. Promote to service if PDF parsing becomes a bottleneck.

---

### 4. URL Fetch / JD Scraper Service

**Responsibility:** Accept a job posting URL, fetch the HTML server-side, extract the job description text.

**Contains:**
- HTTP fetch with realistic User-Agent headers
- HTML-to-text extraction (Mozilla Readability port, or cheerio for targeted selectors on known boards)
- Heuristic: identify the main content block (article, main, div with most text)
- Fallback: return raw stripped text if heuristic fails

**Does NOT contain:**
- Headless browser (Playwright/Puppeteer) — add only if SPA job boards are a hard requirement; start without it
- LLM calls for extraction — regex/DOM is faster and cheaper for text harvesting

**Communicates with:** API Layer (called on JD URL submission).

**Boundary rationale:** Must be server-side to avoid CORS. Isolated so it can be upgraded to headless scraping without touching other components.

---

### 5. LLM Pipeline (Prompt Builder + Claude API Client)

**Responsibility:** Construct prompts, call Claude API, parse structured responses.

**Contains:**
- Prompt templates per feature (analysis, optimise, interview-prep, interview-chat)
- Context assembly: merge structured resume + structured JD into prompt
- Claude API client wrapper (Anthropic SDK, streaming enabled)
- Output parser: extract JSON blocks from Claude responses, validate schema
- Token budget management: truncate inputs if combined context exceeds model limits

**Does NOT contain:**
- Document parsing (that's the parsing service's job)
- HTTP routing (that's the API layer's job)
- UI rendering decisions

**Communicates with:** API Layer (called by route handlers). Calls Claude API externally.

**Key decision:** Use Claude's structured output / JSON mode where available, with a fallback output parser. This makes outputs predictable and decouples the LLM response format from the UI rendering logic.

---

### 6. Structured Output Parser

**Responsibility:** Take raw Claude API text output and extract typed data objects.

**Contains:**
- JSON extraction from markdown code fences (```json ... ```)
- Schema validation (Zod or Pydantic) for each output type
- Error recovery: if JSON is malformed, retry with a corrective prompt

**Communicates with:** LLM Pipeline (internal to it, or a thin adjacent module).

---

## Data Flow: Feature by Feature

### Flow 1: Resume Upload → Parsed Content

```
Browser                API Layer              Parsing Service
  │                        │                        │
  │  POST /parse-resume    │                        │
  │  (multipart/form-data) │                        │
  │───────────────────────►│                        │
  │                        │  extractText(buffer)   │
  │                        │───────────────────────►│
  │                        │                        │ PDF/DOCX → plain text
  │                        │◄───────────────────────│
  │                        │  { resumeText: "..." } │
  │◄───────────────────────│                        │
  │  { resumeText, preview }                        │
  │  (stored in sessionStorage)                     │
```

**Notes:**
- File never touches disk server-side; process the buffer in memory
- Return the extracted text plus a truncated preview so the UI can show a sanity check
- sessionStorage on the browser holds resumeText for the session; cleared on tab close

---

### Flow 2: JD Paste → Structured JD

```
Browser                API Layer
  │                        │
  │  POST /parse-jd        │
  │  { jdText: "..." }     │
  │───────────────────────►│
  │                        │  (no parsing needed; text is already clean)
  │                        │  Optionally: LLM call to extract role, company, requirements
  │◄───────────────────────│
  │  { jdText, meta: { role, company, keyRequirements } }
```

**Notes:**
- Pasted text requires no extraction step; just validate non-empty
- A lightweight LLM call to extract structured metadata (role title, company, top requirements) is optional but improves downstream prompt quality
- Store jdText + meta in sessionStorage alongside resumeText

---

### Flow 2b: JD URL → Scraped → Structured JD

```
Browser                API Layer              URL Fetch Service
  │                        │                        │
  │  POST /parse-jd        │                        │
  │  { jdUrl: "..." }      │                        │
  │───────────────────────►│                        │
  │                        │  fetchJobDescription() │
  │                        │───────────────────────►│
  │                        │                        │ HTTP fetch → HTML → text
  │                        │◄───────────────────────│
  │                        │  { jdText: "..." }     │
  │                        │  [continues same as paste flow above]
  │◄───────────────────────│
  │  { jdText, meta }      │
```

**Notes:**
- Scraping is inherently brittle; design so paste is the primary path and URL is enhancement
- Add rate limiting on this endpoint to prevent abuse of server's outbound HTTP

---

### Flow 3: Match Analysis (Resume vs JD)

```
Browser                API Layer              LLM Pipeline         Claude API
  │                        │                        │                   │
  │  POST /analyse         │                        │                   │
  │  { resumeText, jdText }│                        │                   │
  │───────────────────────►│                        │                   │
  │                        │  buildAnalysisPrompt() │                   │
  │                        │───────────────────────►│                   │
  │                        │                        │  Construct prompt │
  │                        │                        │  with resume +    │
  │                        │                        │  JD context       │
  │                        │                        │──────────────────►│
  │                        │                        │                   │ Stream response
  │                        │                        │◄──────────────────│
  │                        │  SSE stream            │  Parse JSON blocks│
  │◄───────────────────────│◄───────────────────────│                   │
  │  { score, gaps,        │                        │                   │
  │    mapping, actions }  │                        │                   │
```

**Notes:**
- Stream the response so the UI can show progress; analysis prompts can be long
- Output schema: `{ matchScore: number, gaps: string[], jdResumeMapping: [...], prioritisedActions: string[] }`
- The browser already holds resumeText and jdText from steps 1 and 2; the client sends both in this request body (stateless — server holds no session)

---

### Flow 4: Resume Optimisation

```
Browser                API Layer              LLM Pipeline         Claude API
  │                        │                        │                   │
  │  POST /optimise        │                        │                   │
  │  { resumeText, jdText, │                        │                   │
  │    mode: "keywords"|   │                        │                   │
  │    "sections"|"full" } │                        │                   │
  │───────────────────────►│                        │                   │
  │                        │  buildOptimisePrompt() │                   │
  │                        │───────────────────────►│                   │
  │                        │                        │──────────────────►│
  │                        │                        │◄──────────────────│
  │◄───────────────────────│◄───────────────────────│                   │
  │  { keywords: [...] } or│                        │                   │
  │  { sections: {...} } or│                        │                   │
  │  { fullResume: "..." } │                        │                   │
```

**Notes:**
- `mode` parameter lets the same endpoint serve all three optimisation levels
- Alternatively: three separate endpoints (`/optimise/keywords`, `/optimise/sections`, `/optimise/full`) — cleaner for prompt isolation, easier to iterate independently
- Recommend separate endpoints: modes share little prompt logic and are easier to test in isolation
- The full resume output should be structured text that can be copied or downloaded; generating a PDF client-side (jsPDF) is optional enhancement

---

### Flow 5: Interview Prep — Question Generation

```
Browser                API Layer              LLM Pipeline         Claude API
  │                        │                        │                   │
  │  POST /interview-prep  │                        │                   │
  │  { resumeText, jdText }│                        │                   │
  │───────────────────────►│                        │                   │
  │                        │  buildInterviewPrompt()│                   │
  │                        │───────────────────────►│──────────────────►│
  │                        │                        │◄──────────────────│
  │◄───────────────────────│◄───────────────────────│                   │
  │  { questions: [        │                        │                   │
  │    { q, type, hint }   │                        │                   │
  │  ]}                    │                        │                   │
```

---

### Flow 6: Mock Q&A (Conversational)

```
Browser                API Layer              LLM Pipeline         Claude API
  │                        │                        │                   │
  │  POST /interview-chat  │                        │                   │
  │  { resumeText,         │                        │                   │
  │    jdText,             │                        │                   │
  │    question,           │                        │                   │
  │    userAnswer,         │                        │                   │
  │    history: [...] }    │                        │                   │
  │───────────────────────►│                        │                   │
  │                        │  buildChatPrompt()     │                   │
  │                        │  (system: coach role,  │                   │
  │                        │   prior turns from     │                   │
  │                        │   history array)       │                   │
  │                        │───────────────────────►│──────────────────►│
  │                        │                        │◄──────────────────│
  │◄───────────────────────│◄───────────────────────│                   │
  │  { feedback, score,    │                        │                   │
  │    betterAnswer }      │                        │                   │
```

**Notes:**
- Conversation history is maintained client-side (an array in sessionStorage); the client sends the full history on each turn
- This is the stateless pattern: server is always given complete context, holds nothing between requests
- Token budget matters here: long histories must be truncated from the oldest end

---

## Architectural Decisions: Lock-in vs Flexibility

### Decision 1: All Claude API calls are server-side (HIGH confidence, keep open)

The Claude API key stays on the server. The browser never touches it. This means:
- Can swap Claude for another LLM without touching any UI code
- Can add request logging, rate limiting, cost tracking in one place
- Auth layer (when added) sits at the API boundary — no other changes needed

**Lock-in risk if violated:** Impossible to add auth without a full client refactor.

---

### Decision 2: Stateless by contract (HIGH confidence, enables future migration)

Every API request from the browser includes all context it needs (resumeText, jdText, history). The server holds zero session state. This means:

- Any server instance can handle any request (horizontal scaling is free)
- Adding a database later means: intercept at the API layer, persist the inputs, return the same response — UI code is untouched
- Auth adds a session token to requests; the server uses it to look up stored context instead of requiring the client to resend it — but the API contract only tightens, it does not break

**Migration path (stateless → multi-user):**

```
v1 Stateless:           v2 Auth + Persistence:
Client sends full       Client sends session token
context every time      Server looks up context from DB
                        (or still accepts full context as override)
```

This is a pure server-side change. UI routes, component structure, and feature logic are unaffected.

---

### Decision 3: Document parsing is in-memory, no disk writes (HIGH confidence, keep open)

Files are processed from the upload buffer and discarded. This means:
- Stateless: no temp files to clean up
- Multi-user ready: no shared filesystem to contend with
- When persistence is added, store the extracted text in the DB, not the file

**Lock-in risk if violated:** If files are written to disk, adding multi-instance deployment requires a shared filesystem (NFS, S3) — significant complexity.

---

### Decision 4: Prompt templates are isolated modules (HIGH confidence, keep open)

Each feature's prompt lives in its own module (e.g., `prompts/analysis.ts`, `prompts/optimise.ts`). This means:
- Prompts can be iterated without touching route logic
- Output schemas are co-located with prompts — easier to keep in sync
- A/B testing prompts later requires no architectural change

**Lock-in risk if violated:** Prompts embedded in route handlers become untestable and hard to iterate.

---

### Decision 5: Streaming is built in from day one (MEDIUM confidence, recommended)

Claude API supports streaming. Building streaming into the response pipeline from the start means:
- Analysis and full-resume generation feel fast (progressive render)
- No timeout issues on long outputs
- Chat responses feel conversational

**Risk if deferred:** Retrofitting streaming into non-streaming routes requires changes at the API layer and the UI layer simultaneously.

---

### Decision 6: URL scraping is isolated and optional (HIGH confidence, keep open)

The URL fetch service is a distinct module, called only when a URL is provided. The rest of the system only ever sees plain text JD content — it does not know or care how it arrived. This means:
- URL scraping can be upgraded (e.g., add headless browser) without touching anything else
- URL scraping can be removed or rate-limited independently
- The JD text interface is stable regardless of input method

---

## Build Order (Dependency Graph)

Dependencies run top to bottom. Each item must exist before items below it that depend on it.

```
Layer 0 — No dependencies:
  ├── Document Parsing Service (PDF/DOCX → text)
  └── URL Fetch / Scraper Service (URL → text)

Layer 1 — Requires Layer 0:
  └── API Layer skeleton (routes, request validation, error handling)
      ├── POST /parse-resume  (uses Document Parsing Service)
      └── POST /parse-jd      (uses URL Fetch Service for URL path)

Layer 2 — Requires Layer 1 + Claude API access:
  └── LLM Pipeline (prompt builder, Claude client, output parser)

Layer 3 — Requires Layer 2:
  ├── POST /analyse           (match score, gaps, mapping, actions)
  ├── POST /optimise/*        (keyword, section, full resume)
  └── POST /interview-prep    (question generation)

Layer 4 — Requires Layer 3 (interview-prep output feeds this):
  └── POST /interview-chat    (mock Q&A with history)

Layer 5 — Requires Layer 1–4 to exist:
  └── UI Layer (renders all feature outputs, manages sessionStorage)
```

**Practical build sequence:**

1. Document parsing service (unit-testable in isolation, no LLM needed)
2. API skeleton with `/parse-resume` — gives immediate proof of file→text pipeline
3. LLM pipeline with `/analyse` — first end-to-end AI feature, validates Claude integration
4. `/optimise` endpoints — builds on analysis output; same context assembly pattern
5. `/interview-prep` — question generation; simpler than chat
6. `/interview-chat` — most complex (history management, conversational turns)
7. URL fetch service + `/parse-jd` URL path — isolated; lower risk to defer
8. UI layer — can start in parallel with steps 1-3 using mocked API responses; connect to real API incrementally

---

## Stateless → Multi-User Migration Path

### What changes

| Layer | v1 Stateless | v2 Multi-User |
|-------|-------------|---------------|
| Auth | None | JWT or session cookie checked in API middleware |
| Session state | Client holds all context in sessionStorage | Server looks up stored context from DB using user ID |
| Resume storage | Never persisted | Stored in DB after parsing; referenced by ID |
| JD storage | Never persisted | Stored in DB; reused across analyses |
| Analysis results | Never persisted | Stored and retrievable; history visible to user |
| UI | Sends full context every request | Sends token + IDs; or still sends full context as override |

### What does NOT change

- Document parsing service (pure function, no auth concern)
- LLM pipeline (accepts text input, returns structured output, no auth concern)
- URL fetch service (no auth concern)
- Prompt templates (no auth concern)
- Claude API client (no auth concern)
- All feature endpoints — signatures can remain identical; auth middleware validates the request before the handler fires

### Migration strategy

1. Add auth middleware that validates tokens but is a no-op pass-through in v1 (set a feature flag, not a code change)
2. Add a Users table and Resume/JD storage tables
3. After auth validates, check if the incoming resumeText matches a stored record; if the client sends a resumeId instead, fetch from DB
4. The API layer gains a thin persistence layer but all downstream logic is untouched

This is a server-side-only migration. Zero UI rewrites required if the API contract is maintained.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Claude API calls from the browser

**What:** Calling the Anthropic API directly from JavaScript running in the browser.
**Why bad:** Exposes the API key; cannot add rate limiting or auth; impossible to instrument.
**Instead:** All LLM calls go through the server-side API layer.

---

### Anti-Pattern 2: Storing files on the server filesystem

**What:** Writing uploaded PDFs to `/tmp` or a local uploads directory.
**Why bad:** Stateful; breaks multi-instance deployment; cleanup is error-prone; security surface.
**Instead:** Process file buffers in memory; if persistence is needed later, stream to S3/object storage.

---

### Anti-Pattern 3: One giant LLM call for everything

**What:** Sending resume + JD + all feature requests in one massive prompt.
**Why bad:** Token budget exhausted quickly; hard to debug; response structure becomes fragile; cannot stream individual features.
**Instead:** Separate prompts per feature, each focused on one output schema.

---

### Anti-Pattern 4: Embedding prompts inside route handlers

**What:** Writing prompt strings directly in the Express/FastAPI route function.
**Why bad:** Untestable; mixes concerns; prompt iteration requires touching routing code.
**Instead:** Prompt templates are isolated modules with typed input parameters and output schemas.

---

### Anti-Pattern 5: Trusting LLM JSON output without validation

**What:** `JSON.parse(claudeResponse)` directly into application logic.
**Why bad:** Claude occasionally produces malformed JSON or wraps it in unexpected text; unvalidated output causes runtime errors in production.
**Instead:** Extract JSON from fenced code blocks, then validate with Zod/Pydantic; retry with a corrective prompt on schema failure.

---

### Anti-Pattern 6: Deferring streaming until "phase 2"

**What:** Building all endpoints as request/response (no streaming) with a plan to add it later.
**Why bad:** Analysis and full-resume generation can take 15-30 seconds with a naive implementation; users abandon; retrofitting streaming changes both API layer and UI simultaneously.
**Instead:** Build streaming in from the first LLM endpoint; the pattern is the same for all subsequent endpoints.

---

### Anti-Pattern 7: Building auth before demand justifies it

**What:** Adding user accounts, sessions, and persistence before validating that users want the product.
**Why bad:** 3-4x development time on infrastructure before the core value proposition is proven; wrong auth model chosen for the actual usage pattern.
**Instead:** Stateless v1 as designed; the architecture above explicitly supports adding auth without a rewrite.

---

## Scalability Considerations

| Concern | v1 (single instance) | v2 (multi-user, low scale) | v3 (high scale) |
|---------|---------------------|---------------------------|-----------------|
| Claude API latency | Accept it; stream to mask | Same + request queuing | Same + caching repeated analyses |
| File upload size | In-memory buffer; limit to 5MB | Same | Move to presigned S3 upload |
| Concurrent users | Single Node/Python process | Add horizontal instances (stateless, so trivial) | Load balancer + auto-scaling |
| JD scraping | Direct fetch | Add timeout + retry | Dedicated scrape worker queue |
| Token costs | Per-request; no optimisation | Cache identical resume+JD pairs | Semantic deduplication |

---

## Sources

**Confidence note:** WebSearch was unavailable during this research session. All findings are drawn from:
- Direct knowledge of the Anthropic Claude API (SDK patterns, streaming, JSON output modes) — HIGH confidence
- Established patterns for LLM-backed document processing pipelines — HIGH confidence
- Stateless-first web app design and auth migration patterns — HIGH confidence
- PDF/DOCX parsing library landscape (pdfjs-dist, mammoth, pdf-parse) — HIGH confidence
- JD scraping approaches (Readability, cheerio, headless browser tradeoffs) — HIGH confidence

No findings presented as LOW confidence were included without explicit flagging. Specific library version numbers are intentionally omitted from this file — see STACK.md for versioned technology recommendations.
