---
name: JobSeeker
description: AI-powered resume and job description analyser that gives honest, warm, actionable feedback.
colors:
  surface-white: "oklch(0.995 0.003 80)"
  ink-deep: "oklch(0.145 0.004 80)"
  ink-mid: "oklch(0.35 0.004 80)"
  ink-muted: "oklch(0.556 0.004 80)"
  ink-subtle: "oklch(0.708 0.003 80)"
  surface-raised: "oklch(0.975 0.004 80)"
  surface-inset: "oklch(0.955 0.004 80)"
  border-soft: "oklch(0.912 0.004 80)"
  accent-amber: "oklch(0.72 0.12 68)"
  accent-amber-muted: "oklch(0.88 0.06 68)"
  danger: "oklch(0.577 0.245 27.325)"
  success: "oklch(0.60 0.14 142)"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink-deep}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "8px 20px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.ink-mid}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-deep}"
    rounded: "{rounded.lg}"
    padding: "8px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  card-default:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  badge-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-deep}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-default:
    backgroundColor: "{colors.ink-deep}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: JobSeeker

## 1. Overview

**Creative North Star: "The Honest Mirror"**

JobSeeker is a tool that tells job seekers the truth about their application: what's missing, what's weak, what to fix, in what order. The interface must carry that same honesty without becoming cold. Every visual choice should feel like it was made by someone who is on your side and who respects you enough not to soften things.

The system is built on cream and ink: a warm off-white surface tinted toward amber, near-black text with depth, and one amber accent used at high restraint. There are no decorative elements. Space does the heavy lifting. Sections breathe. The score is prominent without being a hero metric. The action items feel like a to-do list from someone who has done this before, not a generated report.

The system rejects its anti-references by name: not the generic SaaS cream (Notion-style zero-chroma neutrals, purple accent, identical card grids); not the flashy AI product (dark mode with neon gradients, glowing cards, hero metric templates); not HR software (corporate blues, formal enterprise type); not gamified job boards (progress bars everywhere, badge-heavy layouts, LinkedIn density). This interface should be calm, like something built for focus.

**Key Characteristics:**
- Warm off-white surface, never pure white or zero-chroma gray
- Single amber accent, used on ≤8% of any screen
- Generous vertical rhythm; sections never crowd each other
- Typography carries weight hierarchy without decorative support
- Cards defined by a soft ring, not a drop shadow
- Motion: state transitions only; nothing animates for decoration

## 2. Colors: The Cream and Ink Palette

One warm-tinted neutral family, one amber accent, one danger tone. Nothing more.

### Primary (Accent)

- **Warm Amber** (`oklch(0.72 0.12 68)`): Used sparingly as the single accent. Appears on high-impact badge fills, score progress fill when high, and interactive state highlights. Never used for body text or large backgrounds. Its scarcity is the point.
- **Amber Wash** (`oklch(0.88 0.06 68)`): Muted amber background for selected states, accepted-rewrite highlights, or informational callouts. Never used as a primary surface.

### Neutral

- **Surface White** (`oklch(0.995 0.003 80)`): Primary page background. Warm-tinted, never pure white. The 80° hue angle (yellow-warm) is the foundation for the cream-and-ink character.
- **Raised Surface** (`oklch(0.975 0.004 80)`): Card and panel backgrounds. Slightly inset from the page to create tonal elevation without shadow.
- **Inset Surface** (`oklch(0.955 0.004 80)`): Muted fills, scroll area backgrounds, code blocks, progress tracks. The third layer in the tonal stack.
- **Soft Border** (`oklch(0.912 0.004 80)`): Card rings, dividers, input strokes. Light enough to not compete with content.
- **Subtle Ink** (`oklch(0.708 0.003 80)`): Focus rings, secondary interactive states, placeholder text.
- **Muted Ink** (`oklch(0.556 0.004 80)`): Supporting text, rationale copy, badge body text, timestamps.
- **Mid Ink** (`oklch(0.35 0.004 80)`): Subheadings and medium-emphasis labels.
- **Deep Ink** (`oklch(0.145 0.004 80)`): Primary text, button fills, card titles. Near-black with warm tint.

### Semantic

- **Danger** (`oklch(0.577 0.245 27.325)`): Error states, destructive actions, aria-invalid borders.
- **Success** (`oklch(0.60 0.14 142)`): Accepted-rewrite badges, success confirmations only.

### Named Rules

**The One Voice Rule.** The amber accent appears on ≤8% of any given screen. When it appears everywhere, it appears nowhere. Reserve it for the moment that matters: the score fill when the result is strong, the "accepted" confirmation, the primary CTA.

**The Warm Tint Rule.** Every neutral in this system carries a 80° hue angle at chroma 0.003–0.005. Never use zero-chroma grays. The warmth is not visible in isolation; it is felt in contrast against pure-white or pure-black elements that don't belong here.

## 3. Typography

**Display / Body Font:** Inter (with system-ui, sans-serif as fallback)
**Mono Font:** Geist Mono (with ui-monospace, monospace as fallback)

**Character:** Inter at its best is quietly confident: humanist, readable, neutral without being generic. At tight tracking (`-0.02em` on display, `-0.01em` on headline) it reads editorial without trying to be. Paired with Geist Mono for streamed AI output and diff blocks, it signals precision without coldness.

### Hierarchy

- **Display** (700, 2rem, lh 1.1, tracking -0.02em): Page titles and the overall match score number. Maximum one per view state.
- **Headline** (600, 1.25rem, lh 1.3, tracking -0.01em): Section headings (Match Score, Action Items, Keyword Gaps, Suggested Rewrites). Appears roughly 4 times per result view.
- **Title** (600, 1rem, lh 1.4): Card titles, component-level labels, sub-section headings within cards.
- **Body** (400, 0.875rem, lh 1.6): All prose content: rationale text, action item details, descriptions. Max line length 65ch inside cards.
- **Label** (500, 0.75rem, lh 1.4, tracking +0.01em): Badges, score/weight annotation, tab labels, button text. Uppercase never; only sentence case.
- **Mono** (400, 0.75rem, lh 1.6): Streamed AI analysis output, diff blocks. Never used for UI chrome.

### Named Rules

**The Scale Rule.** Hierarchy through scale contrast only: display is 2× body, headline is 1.43× body. Avoid "weight-only" differentiation at the same size. If two things are 0.875rem, one of them should not be there.

**The Mono Boundary Rule.** Geist Mono is used exclusively for AI-generated content and diff output. It signals "this came from the model" without annotation. Never use it for UI labels, card titles, or navigation.

## 4. Elevation

This system uses tonal layering, not box shadows. Depth is communicated by surface color steps, not cast shadows. Three layers are defined; don't invent more.

**Layer 0 — Page** (`surface-white`): The base background. Everything sits on this.

**Layer 1 — Card / Panel** (`raised-surface`): Cards, panels, and input container backgrounds. A 0.02 lightness step above the page creates just enough separation for the eye without any decorative shadow.

**Layer 2 — Inset / Recessed** (`inset-surface`): Progress tracks, scroll areas, muted fill contexts inside cards. Recessed below Layer 1 by another 0.02 step.

**Interactive shadow exception:** One subtle ring-shadow appears on card hover for drag or interactive card contexts only. It is never decorative.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The ring (`ring-1 ring-foreground/10`) on cards creates definition without implying the card is "lifted." Shadows appear only when a surface is genuinely moving (drag, modal, popover). Decorative drop shadows are prohibited.

## 5. Components

### Buttons

The primary action in this product is "Analyse Match" — it should feel definitive, not playful.

- **Shape:** Gently rounded (0.625rem / `rounded-lg`). Not pill-shaped; not square. Confident but not aggressive.
- **Primary:** Deep ink background (`oklch(0.145 0.004 80)`), surface-white text. Padding 8px 20px. Font: label weight (500), 0.75rem. Transition: background on hover (150ms ease-out).
- **Hover:** Background steps to mid-ink (`oklch(0.35 0.004 80)`). No scale transform; no shadow on hover.
- **Focus-visible:** 3px ring at `ring/50` opacity. Border shifts to ring color. No outline.
- **Disabled:** 50% opacity, pointer-events none. No color shift.
- **Outline:** Transparent background, deep-ink text, `border-soft` border. Hover fills to `raised-surface`.
- **Ghost:** No border, no background. Muted-ink text. Hover fills to `inset-surface`. Used for undo actions and low-priority secondary controls.
- **Destructive:** Danger background at 10% opacity, danger text. Hover: danger at 20%. Used only for permanent destructive actions (not for "Reject" on rewrites — that is ghost or outline).

### Cards / Containers

Cards carry the bulk of the result UI: Score, Actions, Keywords, Rewrites. They must separate content without imposing structure on it.

- **Corner Style:** Rounded, prominent (1.125rem / `rounded-2xl`). Softer than the button; signals "container" not "control".
- **Background:** Raised surface (`oklch(0.975 0.004 80)`), not pure white.
- **Elevation:** Ring-1 at `foreground/10` opacity. No box shadow.
- **Internal padding:** 24px (`spacing.lg`) on all sides. Card header horizontal padding matches.
- **Card title:** Title weight (600, 1rem). Mid-ink or deep-ink depending on emphasis.
- **CardFooter:** Muted background (`muted/50`), top border at soft-border. Used for accept/reject actions on rewrites.

### Inputs / Textarea

Inputs are where users drop their resume text or paste a JD. They must feel like a workspace, not a form field.

- **Style:** No background fill (transparent on light). Border: `border-soft` at 1px, `rounded-lg`. Field-sizing content for textarea (grows with content).
- **Focus:** Ring 3px at `ring/50`; border shifts to ring color. No fill change on focus.
- **Placeholder:** Muted-ink, label weight.
- **Disabled:** `input/50` background fill, 50% opacity, not-allowed cursor.
- **Error:** Destructive border, destructive ring at 20% opacity.

### Badges

Used for impact levels (high/medium/low) and keyword tags. Two meaningful variants.

- **Default (high impact):** Deep ink fill, surface-white text. Pill-shaped (`rounded-pill`). Small (0.75rem, h-5).
- **Secondary (medium impact):** Raised-surface fill, deep-ink text.
- **Outline (low impact / keywords):** Transparent fill, border-soft border, deep-ink text. Used for keyword gap badges and low-priority items.
- **Success (accepted):** Amber-wash fill, success-tone text. Only appears on accepted rewrite badge.
- **Do not** use accent-amber as a badge fill except for the "accepted" state; it reads as urgent when it should read as calm.

### Progress Track

Used in the loading/streaming state and within ScoreCard component cells.

- **Track:** Inset surface fill (`oklch(0.955 0.004 80)`), full width, 4px height (h-1), pill ends.
- **Indicator:** Deep-ink fill at rest; amber fill when score is ≥70. Smooth transition (300ms ease-out-quart).
- **Indeterminate:** Used during streaming. Animates via tw-animate-css indeterminate pattern. No custom animation; respect `prefers-reduced-motion`.

### Score Display (Signature Component)

The overall match score is the primary output. It is displayed as a large number with a percent symbol, not inside a circular gauge or a hero card.

- **Score number:** Display weight (700, 2rem, tracking -0.02em). Deep ink.
- **Percent symbol:** Headline weight (600, 1.25rem), muted-ink. Vertically aligned to baseline of the score.
- **No background fill, no ring, no gauge.** The number stands alone. The components table below provides context through labeled progress bars.
- **Score context components:** Title weight label left-aligned, muted-ink weight/score annotation right-aligned. Progress bar full width below.

### Diff Block (Signature Component)

The rewrite diff shows original vs. rewritten text inline, using character-level diff marks.

- **Container:** Card, no additional background on the diff text area.
- **Deleted text:** Muted, inline strikethrough. Background: danger at 8% opacity.
- **Inserted text:** Body weight, no special color. Background: amber-wash at 30%.
- **Font:** Mono, 0.75rem, lh 1.6. Makes the diff legible without being a code block.
- **Never** use red text for deletions or green text for insertions; these carry accessibility risk and visual noise. Background tints only.

## 6. Do's and Don'ts

### Do:

- **Do** tint every neutral toward 80° hue (warm amber direction) at chroma 0.003–0.005. Pure `oklch(X 0 0)` grays are not permitted.
- **Do** use Inter at -0.02em tracking for display text and -0.01em for headlines. Default tracking at body size.
- **Do** express elevation through the three tonal surface layers (surface-white → raised-surface → inset-surface). No box-shadows at rest.
- **Do** keep card ring at `ring-1 ring-foreground/10`. This creates definition without depth.
- **Do** preserve generous vertical rhythm between result sections: `space-y-6` minimum between ScoreCard, ActionList, KeywordBadges, and RewriteDiff groups.
- **Do** use Geist Mono exclusively for AI-generated streamed content and diff blocks. Inter for all UI chrome.
- **Do** respect `prefers-reduced-motion`; the streaming progress animation must check for it.
- **Do** ensure all text meets WCAG 2.1 AA contrast (4.5:1 for body text, 3:1 for large text and UI components). Deep ink on surface-white achieves this comfortably.
- **Do** keep the amber accent (`oklch(0.72 0.12 68)`) to ≤8% of any screen's visible area.
- **Do** use `rounded-2xl` for cards and `rounded-lg` for controls. The radius hierarchy (container > control) is meaningful.

### Don't:

- **Don't** use pure white (`#fff` / `oklch(1 0 0)`) or pure black (`#000` / `oklch(0 0 0)`) anywhere. Every neutral carries a warm hue tint.
- **Don't** use gradient text (`background-clip: text` with a gradient). Never intentional here. One solid color.
- **Don't** build a "hero metric" layout: big score number + small label + ring gauge + gradient card. The score is displayed as inline text in context, not as a featured hero block.
- **Don't** use dark mode with neon gradients, glowing cards, or glassmorphism. This is a light-mode product. If dark mode is added later, it uses the same tonal-layering approach with dark surfaces, no glow effects.
- **Don't** reach for corporate blues or HR-software aesthetics: no navy primary, no teal accent, no formal serif headers.
- **Don't** create identical card grids: icon + heading + text repeated in equal-sized cards. Each result card (score, actions, keywords, rewrites) has a distinct information pattern and should look distinct.
- **Don't** use gamification patterns: score badges on every item, XP language, "you're doing great!" copy, green checkmarks on every action item. The tone is honest and respectful, not cheerleader-shallow.
- **Don't** use `border-left` greater than 1px as a colored accent stripe on cards or list items. Rewrite with full card borders, background tints, or numbered leading (the action list already uses numbered rank correctly).
- **Don't** add animations to layout properties (height, width, margin). Animate opacity and transform only.
- **Don't** use LinkedInstyle density: tightly packed rows, badge-heavy item displays, progress bars on every list element.
