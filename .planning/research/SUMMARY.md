# Research Summary: JobSeeker

**Synthesized:** 2026-05-21
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Recommended Stack

Build on **Next.js 16 App Router** with TypeScript, Tailwind CSS v4, and shadcn/ui — `create-next-app --yes` scaffolds everything correctly. All Claude API calls, PDF/DOCX parsing, and JD scraping run inside **Next.js Route Handlers** (not Server Actions — they have a 1MB body limit and cannot stream). Use the **Anthropic SDK directly** (`@anthropic-ai/sdk` v0.97.x) rather than the Vercel AI SDK; Claude is the only model needed and the SDK's `stream()` + `zodOutputFormat()` cover all use cases cleanly. Parse PDFs with **pdfjs-dist** (mammoth for DOCX, cheerio + Node fetch for JD URLs). Validate all inputs and LLM outputs with **Zod**. Deploy to **Vercel** (zero-config, streaming works, preview deployments are useful for demos) — upgrade to Pro or move to Railway if Vercel's 10s Hobby timeout becomes a constraint on long analyses.

---

## Table Stakes

Must be present for a credible demo:

- PDF upload with text extraction + paste-as-text fallback (fallback is equally first-class)
- Resume text preview after parsing ("does this look right?") before running any analysis
- JD paste input; URL fetch is enhancement only
- Match score with component breakdown and rationale (not a black-box number)
- Keyword/skill gap list sorted by priority, not raw frequency
- Bullet-level rewrite suggestions with before/after diff and Accept/Reject per bullet
- JD-specific interview questions (not generic STAR questions)
- Resume-grounded answer coaching (answers reference the user's actual experience)
- Streaming progress on all LLM calls — 15-30s silent waits kill demos
- Copy-to-clipboard on every output block
- Clear "we don't store your resume" disclosure
- IP-based rate limiting before any public exposure

---

## Key Differentiators

What makes JobSeeker genuinely novel versus Jobscan, Teal, Rezi:

1. **End-to-end coherent flow in one tool.** No established player combines JD-specific match analysis + progressive resume rewriting + interview coaching backed by the user's actual resume content. Jobscan scores; Rezi rewrites; mock interview tools are separate. JobSeeker chains them.

2. **Progressive trust model.** Keyword suggestions to section rewrites to full tailored resume, with user review and acceptance at each step. Competitors either offer raw suggestions (no assembly) or auto-rewrite without transparency.

3. **Resume-grounded interview coaching.** Generating STAR-format answers using the candidate's specific experiences at named companies is not something Jobscan or Teal does. It is LLM-native and hard to replicate without Claude.

4. **Narrative gap analysis vs keyword matching.** "Your bullets show delivery management, but this JD needs strategic vendor negotiation — here's how to bridge that" is qualitatively different from "missing keyword: vendor negotiation."

5. **Stateless demo, zero friction.** No account creation before seeing value. Every competitor gates analysis behind signup.

---

## Top Pitfalls to Avoid

These are the highest-consequence failure modes identified across all research:

1. **Two-column PDF layouts produce garbled text** — show a parsed-text preview before running analysis; add a minimum-length gate (under 200 chars = abort with clear error). The entire pipeline degrades silently if this is skipped. Address in Phase 1.

2. **Resume rewrites hallucinate metrics and lose the candidate's voice** — the rewrite prompt must include an explicit constraint: "only use facts, numbers, and terms present in the original." Every rewrite needs a diff view; users must see exactly what changed. No exceptions. Address in Phase 2.

3. **Match scores drift and cluster arbitrarily** — define an explicit rubric (required skills 40%, experience level 25%, domain match 20%, education 15%) and request scores as structured JSON fields. Show component scores, not just a total. Address in Phase 2.

4. **LLM outputs need schema validation on every call** — JSON.parse(claudeResponse) directly is a production bug waiting to happen. Wrap all structured calls with Zod validation; retry once with a corrective prompt on schema failure. Establish this pattern in Phase 1 before writing any feature prompt.

5. **Streaming must be built in from the first LLM endpoint** — retrofitting streaming later requires simultaneous changes to the API layer and UI. Analysis and full-resume generation take 15-30 seconds; without streaming the app feels broken. Address in Phase 1.

6. **Prompt injection via user-supplied content** — wrap all resume and JD text in XML tags and instruct Claude in the system prompt that content inside these tags is data, not instructions. Establish this pattern in Phase 1.

7. **No rate limiting = one shared demo link exhausts the API budget** — implement per-IP limits (e.g., 10 analyses/hour) before sharing any link publicly. Set a hard monthly spend alert on the Anthropic console.

---

## Build Order

Derived from the dependency graph in ARCHITECTURE.md and confirmed by FEATURES.md's MVP prioritisation:

**Phase 1 — Foundation (no LLM)**
Document parsing service (PDF/DOCX to plain text), API skeleton (/parse-resume, /parse-jd), Zod validation pattern, prompt injection defense (XML wrapping), parsed-text preview UI, paste fallbacks, IP rate limiting, Claude mock mode for dev. Deliverable: file to clean text pipeline, end-to-end, with visible preview.

**Phase 2 — Core Analysis Loop**
LLM pipeline with streaming, /analyse endpoint (match score + gap list + prioritised actions), /optimise/keywords and /optimise/sections endpoints (bullet rewrites with diff view), score rubric defined in prompt, Zod schema validation on all LLM outputs. Deliverable: full analysis to rewrite suggestions flow, demo-ready.

**Phase 3 — Interview Coaching**
/interview-prep endpoint (JD-specific question generation, grounded in JD content explicitly), /interview-chat endpoint (resume-grounded answer coaching with accumulated session context). Deliverable: complete end-to-end JobSeeker value proposition.

**Phase 4 — Polish and Enhancements**
JD URL fetch with graceful degradation, section-level rewrites, full tailored resume assembly, DOCX upload, seniority/tone gap analysis, export options. Deliverable: demo hardened for wider sharing.

**Phase 5 — Multi-User (post-traction)**
Auth (NextAuth.js v5), PostgreSQL + Drizzle, resume/analysis persistence, shareable result links, per-user rate limits. Architecture is designed to accept this without UI rewrites — only the API layer gains a persistence layer.

---

## Open Questions

Decisions needed before or during Phase 1 execution:

1. **Vercel tier** — Hobby has a 10s serverless timeout; full resume analysis + rewriting can exceed this. Decide: start on Pro, or confirm streaming resets the timeout clock on Vercel's platform (which it does for streaming responses).

2. **Anonymous session IDs vs pure statelessness** — PITFALL 4.1 recommends storing results server-side with a short-lived anonymous session ID (UUID cookie, 24hr TTL) even in v1, to enable incremental migration to user accounts without a data model rewrite. Decide: accept this lightweight server-side state from the start, or accept a harder migration later.

3. **Claude model IDs** — verify current model aliases at project start. Research suggests Sonnet-tier for analysis/rewriting, Haiku-tier for interview Q&A feedback. Run `npx @anthropic-ai/sdk list-models` before writing any prompts; use dated model IDs (not aliases) in production.

4. **JD URL scraping scope** — LinkedIn and Indeed will not work without headless browsers. Decide which company career page formats (Greenhouse, Lever, Workday) to test and document as "supported"; set user expectations in the UI.

5. **Test corpus** — before any public demo, validate parsing against at least 10 real-world resume formats (single-column Word, two-column PDF, Canva export, image-PDF, DOCX with text boxes). Build this corpus in Phase 1.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16 confirmed from official docs; Anthropic SDK version confirmed from GitHub releases |
| Architecture patterns | HIGH | Stateless LLM pipeline patterns are well-established; no experimental choices |
| Feature landscape | HIGH for table stakes; MEDIUM for differentiators | Competitor feature set based on training data through August 2025; validate manually |
| Pitfalls | HIGH | All parsing and LLM failure modes are reproducible, documented behaviors |
| Build order | HIGH | Derived from hard functional dependencies, not judgment calls |

**Gaps to address during execution:**
- Verify current Claude model IDs before writing any prompts (research flags this explicitly)
- Validate competitor feature sets manually at launch (WebSearch unavailable during research)
- Build a diverse resume test corpus in Phase 1 before any public exposure
