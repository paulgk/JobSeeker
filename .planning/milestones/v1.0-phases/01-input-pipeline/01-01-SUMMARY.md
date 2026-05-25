---
phase: 01-input-pipeline
plan: 01
subsystem: scaffold
tags: [next.js, tailwind, shadcn-ui, pdfjs-dist, unpdf, zod, upstash, typescript]

# Dependency graph
requires: []
provides:
  - Next.js 16 App Router project with TypeScript and Tailwind v4
  - shadcn/ui component library (card, tabs, textarea, button, alert, badge)
  - Phase 1 npm deps: unpdf, pdfjs-dist, cheerio, zod, @upstash/ratelimit, @upstash/redis
  - next.config.ts with serverExternalPackages for pdfjs-dist
  - Two-panel home page skeleton (Resume left, JD right)
  - .env.example documenting required Upstash Redis vars
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added:
    - next@16.2.6
    - tailwindcss@4
    - shadcn/ui (Radix/Nova preset)
    - unpdf@1.6.2
    - pdfjs-dist@5.7.284
    - cheerio@1.2.0
    - zod@4.4.3
    - "@upstash/ratelimit@2.0.8"
    - "@upstash/redis@1.38.0"
  patterns:
    - App Router with src/ directory layout
    - shadcn/ui for all UI components
    - Two-panel responsive grid (single col mobile, side-by-side lg+)
    - serverExternalPackages for Node.js-only PDF libs

key-files:
  created:
    - package.json
    - next.config.ts
    - tsconfig.json
    - components.json
    - .env.example
    - src/components/ui/card.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/button.tsx
    - src/components/ui/alert.tsx
    - src/components/ui/badge.tsx
    - src/lib/utils.ts
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css

key-decisions:
  - "Used shadcn/ui Radix/Nova preset (default, non-interactive init with --defaults)"
  - "node_modules copied from /tmp scaffold had broken .bin symlinks — fixed by deleting and reinstalling"
  - ".gitignore updated with !.env.example exception so the template can be committed"

patterns-established:
  - "shadcn/ui Card as base container for all main panels"
  - "Two-panel grid layout established in page.tsx for Plans 02 and 03 to extend"

# Metrics
duration: 9min
completed: 2026-05-22
---

# Phase 1 Plan 01: Scaffold Summary

**Next.js 16 App Router bootstrapped with Tailwind v4, shadcn/ui (Radix/Nova), and all Phase 1 dependencies including unpdf/pdfjs-dist, zod, and Upstash — two-panel skeleton home page live at localhost:3000.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-22T04:59:09Z
- **Completed:** 2026-05-22T05:08:15Z
- **Tasks:** 2/2 completed
- **Files modified:** 14

## Accomplishments

- Next.js 16.2.6 App Router project initialized with TypeScript, Tailwind v4, ESLint
- Phase 1 npm dependencies installed: unpdf, pdfjs-dist, cheerio, zod, @upstash/ratelimit, @upstash/redis
- next.config.ts configured with `serverExternalPackages: ['pdfjs-dist']` to prevent webpack bundling errors
- shadcn/ui initialized (Radix/Nova preset) with card, tabs, textarea, button, alert, badge components
- .env.example documents required Upstash Redis vars for production rate limiting
- Home page replaced with two-panel Card grid — Resume (left) and Job Description (right)
- TypeScript compiles clean (`tsc --noEmit` exits 0)
- Dev server starts and serves http://localhost:3000 with no errors

## Files Created/Modified

- `package.json` — jobseeker project, all Phase 1 dependencies
- `next.config.ts` — serverExternalPackages for pdfjs-dist
- `components.json` — shadcn/ui configuration (Radix/Nova preset, Tailwind v4)
- `.env.example` — UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN template
- `src/app/layout.tsx` — Inter font, JobSeeker metadata, clean body classes
- `src/app/page.tsx` — two-panel Card skeleton layout
- `src/app/globals.css` — shadcn/ui CSS variables and @theme definitions (modified by init)
- `src/components/ui/` — card.tsx, tabs.tsx, textarea.tsx, button.tsx, alert.tsx, badge.tsx
- `src/lib/utils.ts` — shadcn/ui cn() utility

## Decisions Made

- Used `npx shadcn@latest init --defaults` (non-interactive) which selected Radix/Nova preset — acceptable default, consistent shadcn style
- .gitignore patched with `!.env.example` negation so the env template gets committed but .env.local stays ignored
- Node.js 24 was in use — Next.js 16 requires >=20.9.0 which is satisfied

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Broken node_modules .bin symlinks from /tmp scaffold copy**
- **Found during:** Task 1 verification (npm run dev)
- **Issue:** create-next-app refused to init in the current dir (capital letter in "JobSeeker"). Scaffold was created in /tmp/jobseeker-scaffold and files copied. The .bin/ entries were copied as plain JS files instead of symlinks, causing `next` and `tsc` to fail with MODULE_NOT_FOUND on relative paths.
- **Fix:** Deleted node_modules entirely, ran `npm install` in the project root which recreated all .bin entries as proper symlinks.
- **Verification:** `ls -la node_modules/.bin/next` shows symlink; `npm run dev` starts successfully.
- **Committed in:** 56ca0c2 (Task 1 commit covered the reinstall)

**2. [Rule 1 - Bug] .gitignore blocked .env.example from being committed**
- **Found during:** Task 1 git staging
- **Issue:** Default Next.js .gitignore uses `.env*` which matches `.env.example`, preventing the template from being committed.
- **Fix:** Added `!.env.example` exception line to .gitignore.
- **Files modified:** .gitignore
- **Committed in:** 56ca0c2

---

**Total deviations:** 2 auto-fixed (1 blocking infrastructure issue, 1 bug)
**Impact on plan:** Both fixes required for correct operation. No scope creep.

## Next Phase Readiness

Plans 02 (Resume Panel), 03 (JD Panel), and 04 (Rate Limiting + Session) can now execute in parallel. The two-panel page.tsx skeleton has clear comment markers for where each panel component will be slotted in.

---
*Phase: 01-input-pipeline*
*Completed: 2026-05-22*
