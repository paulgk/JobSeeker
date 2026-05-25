# Feature Landscape: AI-Powered Resume Analysis & Job Search

**Domain:** AI-powered resume analysis, JD matching, and interview preparation
**Researched:** 2026-05-21
**Confidence note:** WebSearch and WebFetch were unavailable during this research session. All findings draw from training knowledge (cutoff August 2025) covering Jobscan, Teal, Resume.io, Kickresume, Rezi, LinkedIn Resume Builder, and GPT-powered newcomers through mid-2025. Confidence is HIGH for established product features (these products are stable and well-documented); MEDIUM for "emerging AI-first" feature trends (moving fast); LOW for anything specific to post-August 2025 releases.

---

## Competitive Landscape Snapshot

| Product | Primary Angle | AI Depth | Pricing Model |
|---------|--------------|----------|---------------|
| Jobscan | ATS keyword match scoring | Medium (keyword analytics, not generative) | Freemium, scan limits |
| Teal | Job tracker + resume builder combo | Medium (AI suggestions in builder) | Freemium |
| Resume.io | Template-first resume builder | Low-Medium (AI writing suggestions) | Subscription |
| Kickresume | Template + AI content generation | Medium | Freemium |
| Rezi | ATS-optimized builder, AI bullet writer | Medium-High | Subscription |
| LinkedIn Resume Builder | LinkedIn profile → resume export | Low (LinkedIn data only) | Free, tied to Premium |
| Enhancv | Narrative-focused, visual templates | Low-Medium | Subscription |
| Zety | Template + content suggestions | Low | Subscription |
| Poe/ChatGPT (ad hoc) | Generative, no structure | High (raw LLM) | Varies |

**Pattern:** Established players are template-first or tracker-first with AI bolted on. No established player fully integrates JD-specific resume rewriting + interview coaching in one coherent flow. This is the whitespace JobSeeker occupies.

---

## Category 1: Resume Input & Parsing

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PDF upload and text extraction | Users have resumes in PDF; non-negotiable entry point | Medium | PDF-to-text is reliable for simple layouts; multi-column, tables, and text-in-image are hard. Libraries: pdfminer, pdf2image+OCR, or cloud APIs. |
| Paste-as-text fallback | Lowest friction; covers edge cases PDF parsing fails | Low | Must be first-class, not an afterthought. Many power users prefer paste. |
| Resume content retained within session | User shouldn't re-paste for every JD analysis | Low | In-memory session state; stateless v1 still needs this within a browser session. |
| Graceful parsing failure messaging | If PDF extraction garbles content, tell the user clearly | Low | Silent failure is a trust killer. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| DOCX / Word upload | Covers users who draft in Word; text extraction is simpler than PDF | Low-Medium | python-docx or mammoth.js. Lower priority than PDF but adds coverage. |
| LinkedIn profile import (via URL or export) | Many users keep LinkedIn more current than their resume | High | LinkedIn blocks scraping aggressively; their official export is a ZIP with a CSV — workable but awkward. Do not attempt live URL scraping in v1. |
| Resume structure detection | Automatically identify sections (Experience, Skills, Education) without user labelling | Medium | Enables section-specific rewrites later. LLM-based detection is reliable for standard formats. |
| Multi-resume storage | Power users tailor a different base resume per role family | High | Requires session or account persistence — out of scope for stateless v1. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-app resume builder / structured editor | Established players own this; massive scope for low ROI at v1 | Accept upload. Focus energy on analysis and rewriting outputs. |
| "Resume score" without a JD | Generic scores (ATS score, overall quality) are largely meaningless and erode trust | Only score against a specific JD — this is the JobSeeker positioning. |
| Resume template marketplace | Template design is a commodity; Resume.io and Kickresume have 50+ each | Out of scope permanently unless pivot. |

---

## Category 2: Job Description Input & Parsing

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| JD paste (plain text) | Lowest friction, most reliable | Low | Always works; must be primary path. |
| JD section extraction | Identify responsibilities, requirements, nice-to-haves, company info | Medium | LLM-based extraction is reliable; prompt engineering determines quality. |
| Required vs preferred skill identification | Users need to know which gaps are blocking vs nice-to-have | Medium | Requires careful prompt design; "required" language varies widely across JDs. |
| Job title and seniority detection | Enables seniority-appropriate advice ("this role is senior; your bullets read junior") | Low | Simple extraction, high value. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| JD URL fetch and extraction | Users can paste a URL instead of copying text; faster workflow | Medium-High | HTTP fetch is easy; JS-rendered pages (Greenhouse, Lever, Workday) require headless browser. Treat as enhancement, not v1 core. |
| JD comparison across multiple roles | "Which of these three JDs is the best fit for my resume?" | High | Session management complexity; post-v1. |
| Company context enrichment | Pull company info (size, culture, funding stage) to enrich coaching | High | Requires third-party data or scraping; post-v1. |
| JD save / history | Return to previous analyses | Medium | Requires persistence; out of scope stateless v1. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Job board integration / job search | Aggregating listings is a different product (Indeed, LinkedIn); competing there is a losing game | Focus on analysis of JDs the user brings. |
| Auto-apply functionality | Low application quality, account ban risk, legal gray area | Explicitly out of scope. |
| Employer database / company reviews | Glassdoor/Levels.fyi own this space | Link out if needed, do not replicate. |

---

## Category 3: Match Analysis & Scoring

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Overall match score (0-100 or letter grade) | Users want a single number to orient them; every competitor has this | Low-Medium | Score must be explained, not just asserted. Black-box scores erode trust. |
| Keyword gap list | Which required keywords/skills appear in the JD but not the resume | Low-Medium | Jobscan built an entire business on this. Users deeply expect it. |
| Skills match breakdown | Required skills: present / partial / missing | Medium | More useful than a flat keyword list; context matters. |
| Prioritised action items | "Here are the 3 most important things to fix" | Medium | Sorting gap list by impact is the hard part; raw gap lists overwhelm users. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Side-by-side JD vs resume mapping | Visual alignment showing which resume content addresses which JD requirement | Medium-High | High perceived value; JD requirement on left, matching resume evidence on right, gaps highlighted. |
| Narrative gap analysis (not just keywords) | "Your bullets show delivery management, but the JD needs strategic vendor negotiation — these are related but not the same" | Medium | LLM-native; competitors doing keyword matching can't easily replicate this. |
| Seniority gap analysis | "This role expects P5/Staff level; your resume reads P3/Senior" | Medium | High value for career changers and those aiming up. |
| Transferable skills identification | "Your logistics coordination background maps to project management in this JD" | Medium | Especially valuable for career changers — a key persona for JobSeeker. |
| ATS compatibility flag | Warning when resume format (tables, images, text boxes) may fail ATS parsing | Low-Medium | Jobscan's core differentiator; worth including as a one-time advisory. |
| Cultural fit signals | Detect culture language in JD (fast-paced, collaborative, data-driven) and compare to resume tone | High | Fuzzy, hard to validate; post-v1. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Keyword stuffing encouragement | "Add these 47 keywords" prompts users to pad resumes; backfires with human reviewers and modern AI screening | Frame as "integrate naturally" with rewrite suggestions that demonstrate skills contextually. |
| Fake precision scores | "87.3% match" implies precision that doesn't exist | Use ranges or letter grades; explain the scoring components. |
| Separate ATS score + general score | Two scores confuse users about which to optimise for | One score, explained clearly. |

**Dependencies:** Prioritised action items depend on skills match breakdown. Side-by-side mapping depends on JD section extraction. All of Category 3 depends on both Category 1 and Category 2 being complete.

---

## Category 4: Resume Optimisation & Rewriting

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Keyword integration suggestions | "You could add 'stakeholder management' to your Project Lead bullet" | Low-Medium | Expectation set by Jobscan, Teal, Rezi. Must be at minimum present. |
| Bullet point rewrite suggestions | AI rewrites specific bullets to better reflect JD language and surface buried skills | Medium | Core differentiator for JobSeeker but becoming table stakes as competitors add it. |
| User review-and-accept flow | Show original vs rewritten; user chooses | Low | Non-negotiable for trust. Auto-replacing without showing diff is a trust killer. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Section-level rewrites | Rewrite an entire section (e.g., Summary, Skills) not just individual bullets | Medium | More impactful than single bullets; summary rewrites especially valued. |
| Full tailored resume output | Produce a complete resume version optimised for the specific JD | Medium-High | The highest-value output; competitors mostly stop at suggestions. Requires assembling all accepted changes into a coherent document. |
| Progressive trust model | Suggestions → section rewrites → full tailored resume (user controls depth) | Low (design) | This is architecture, not a feature itself — but it's the key UX differentiator. |
| Tone and seniority adjustment | Rewrite in a more senior / strategic / technical register to match JD expectations | Medium | Especially valuable for stretch applications. |
| Before/after diff view | Clearly show what changed between original and rewritten content | Low-Medium | Increases trust in AI suggestions; reduces "what did it change?" anxiety. |
| Downloadable tailored resume (PDF) | Users need the final product in a portable format | Medium | PDF generation with reasonable formatting; not a design tool. Simple, clean output. |
| Preservation of personal voice | Rewrites should not strip out the user's authentic language and personality | Medium | Prompt engineering challenge; requires user-adjustable "preserve my voice" setting or at least awareness. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-apply the rewritten resume without review | Users lose control; rewriting errors go undetected; trust destroyed | Always show diff; always require explicit acceptance. |
| In-app formatting / template designer | Scope explosion; not the value proposition | Output clean plain text or a simple single-column PDF; don't compete with Resume.io on design. |
| "One-click optimize" without explanation | Black-box rewriting erodes trust and learning | Show the reasoning: "I changed this bullet because the JD emphasizes X and your original didn't mention it." |
| Fabricating experience | AI that invents job titles, companies, or achievements user didn't have | Strictly constrained rewriting: rephrase and reframe only what exists; never invent. |

**Dependencies:** Section rewrites depend on resume structure detection (Category 1) and match analysis (Category 3). Full tailored resume output depends on section rewrites being individually reviewable. PDF download depends on full tailored resume output.

---

## Category 5: Interview Preparation

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| JD-specific interview question generation | "What questions will they ask for this role?" is the #1 user question post-application | Low-Medium | LLM is strong here; any AI-first tool must offer this. |
| Question categorisation | Behavioural, technical, situational, culture-fit — users prep differently for each type | Low | Simple categorisation from LLM output; high perceived value. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Resume-grounded answer coaching | "Here's how to answer this question using your specific experience at Acme Corp" | Medium-High | This is genuinely novel: answers are personalised to the user's resume, not generic STAR templates. No established player does this well. |
| STAR framework scaffolding | Structure coaching answers in Situation-Task-Action-Result format | Low | Expected by users who know interview prep; easy to implement in prompts. |
| Mock Q&A practice mode | User types an answer; AI critiques it | Medium | Conversational flow; requires turn-based UI. Valuable but complex. Difference between v1 and v2. |
| Answer quality feedback | "Your answer is too vague on outcomes — add a metric" | Medium | Depends on mock Q&A mode; requires rubric-driven evaluation prompt. |
| Role-specific technical question bank | For engineering roles, generate LC-style conceptual questions; for product roles, generate product sense questions | Medium | LLM handles this well with role detection from JD; high perceived value. |
| Weakness / difficult question coaching | "Tell me about yourself", "Why are you leaving?", "Salary expectations" | Low | These are generic but universally needed; easy LLM win. |
| Interview prep checklist | "Before your interview at [Company], research these 5 things" | Low | Simple generation from JD + company name; high perceived polish. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Generic interview tips content | "Always research the company" is noise; users have read this 50 times | Make every output JD-specific and resume-specific. Generic = low value = churn. |
| Video mock interview with AI scoring | High engineering complexity, low accuracy, creepy factor; Yoodli and HireVue own this space | Text-based coaching first; video is a later, separate product decision. |
| Automated follow-up email generation | Scope creep; not part of the interview coaching loop | Out of scope; keep focus tight. |

**Dependencies:** Resume-grounded answer coaching depends on both resume parsing (Category 1) and JD parsing (Category 2). Mock Q&A mode depends on JD-specific question generation. Answer feedback depends on mock Q&A.

---

## Category 6: UX and Trust Infrastructure

These are not headline features but are the invisible floor — missing any of them causes drop-off.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Instant feedback on AI processing | Progress indicator while LLM calls run; 5-15s waits feel broken without it | Low | Streaming responses or at minimum a spinner with estimated time. |
| Copy-to-clipboard on all outputs | Users paste AI output into their own docs; one-click copy is expected | Low | Every output block needs a copy button. Missing = friction that users resent. |
| Mobile-readable output | Even if input is desktop-only, outputs should be readable on mobile | Low-Medium | Responsive layout for results; input forms can be desktop-first. |
| Clear data handling statement | "We don't store your resume" — users are anxious about resume data privacy | Low | Simple, prominent disclosure; no legal team needed for a demo app. |
| Error recovery | LLM API timeout or failure should give user a retry, not a broken state | Low-Medium | Error boundaries around every AI call. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Session persistence within browser tab | Resume stays loaded as user switches between JDs | Low | LocalStorage or in-memory state; not server-side storage. |
| Shareable results link | User shares analysis with a mentor or career coach | Medium | Requires server-side storage of result snapshot; out of scope stateless v1 unless using URL-encoded state. |
| Export analysis as PDF | Download the full gap analysis and action plan | Low-Medium | Print stylesheet or client-side PDF; useful for users working with career coaches. |
| Explanation transparency | "Here's why this score is 68: you're missing X, Y, Z" | Low | Prompt engineering to include rationale; builds trust and repeat use. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Forced account creation before seeing value | Kills demos instantly; users won't sign up to try something unproven | Show results immediately; gate persistence (not analysis) behind account. |
| Upsell modals during analysis | Interrupting the core flow with pricing destroys demo quality | For demo+personal use phase, no monetization friction at all. |
| Email capture walls | Same problem as forced accounts; only justified post-traction | Defer entirely to post-demo phase. |
| Dark patterns (hiding data retention, pre-ticking email opt-ins) | Trust destruction; this demographic (job seekers) is privacy-aware | Radical transparency: what you store, for how long, how to delete. |

---

## Feature Dependency Map

```
Resume Input (Cat 1)
    └── Resume Structure Detection
            ├── Match Analysis (Cat 3) — requires parsed JD + parsed resume
            │       ├── Skills Match Breakdown
            │       │       └── Prioritised Action Items
            │       └── Side-by-Side Mapping
            └── Resume Optimisation (Cat 4) — requires match analysis to know what to fix
                    ├── Keyword Suggestions (no structure needed)
                    ├── Bullet Rewrites (requires bullet identification from structure)
                    ├── Section Rewrites (requires section identification)
                    └── Full Tailored Resume (requires all accepted section rewrites)
                            └── PDF Export

JD Input (Cat 2)
    └── JD Section Extraction
            ├── Required vs Preferred Skill Identification
            ├── Match Analysis (Cat 3) — as above
            └── Interview Prep (Cat 5)
                    ├── JD-Specific Question Generation
                    └── Resume-Grounded Answer Coaching (requires resume too)
                            └── Mock Q&A (requires questions + resume)
                                    └── Answer Feedback
```

---

## MVP Prioritisation Recommendation

### Must-Have for V1 (Demo Quality)

These form a complete, demonstrable loop:

1. PDF upload + paste fallback (resume input)
2. JD paste (JD input)
3. Match score + keyword gap list + prioritised action items (match analysis)
4. Bullet rewrite suggestions with before/after, review-and-accept (optimisation)
5. JD-specific interview questions + resume-grounded answer coaching (interview prep)
6. Copy-to-clipboard on all outputs + streaming progress indicators (UX floor)
7. Clear data disclosure (trust)

This covers the full JobSeeker value proposition end-to-end at demo quality.

### High Value, Phase 2

- Side-by-side JD vs resume mapping (visual; impressive for demos)
- Section-level rewrites (summary especially)
- Full tailored resume assembly + PDF export
- Mock Q&A practice mode with answer feedback
- Seniority and tone gap analysis

### Phase 3 / Post-Traction

- JD URL fetch (add headless browser handling)
- Shareable results link (requires server persistence)
- Multiple resume management (requires accounts)
- Career changer transferable skills mapping (deeper LLM prompting)

### Explicit Non-Builds

- In-app resume builder / template designer
- Job board integration or auto-apply
- Video mock interviews
- Company database / employer reviews
- Billing / monetization UI (demo phase)
- Forced accounts before value delivery

---

## Sources & Confidence

| Area | Confidence | Basis |
|------|------------|-------|
| Competitor feature set (Jobscan, Teal, Rezi, Resume.io) | HIGH | Well-documented products, stable feature sets as of August 2025 training cutoff |
| Table stakes identification | HIGH | Consistent across all major products; user expectations well-established |
| Differentiator identification | MEDIUM | AI-first features moving fast; some "differentiators" may have become table stakes post-August 2025 |
| Anti-features | HIGH | Patterns grounded in UX principles and observed industry failures; not time-sensitive |
| Complexity estimates | MEDIUM | Based on standard web app development patterns; actual effort depends on chosen stack |
| Feature dependencies | HIGH | Logical/functional dependencies; stable |

**Note:** WebSearch and WebFetch were unavailable during this research session. For validation, the following sources should be manually checked before roadmap finalisation:
- https://www.jobscan.co/features
- https://www.tealhq.com/features
- https://rezi.ai/features
- https://kickresume.com/en/features/
- Product Hunt listings for "AI resume" (2024-2025) for emerging competitors
