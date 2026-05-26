# Phase 8: History Enhancements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 08-history-enhancements
**Areas discussed:** Inline editing (company & role), Interview prep trigger, Empty/unknown state handling, Workflow improvements

---

## Inline Editing — Company & Role

| Option | Description | Selected |
|--------|-------------|----------|
| Detail page only | Edit fields on /history/[id] only; list stays read-only | ✓ (Claude's judgment) |
| Both list and detail | Quick edit on list row + full editing on detail | |

**User's choice:** "use skill impeccable to decide" — deferred to Claude
**Notes:** Claude chose detail-page-only. History list row is already dense; inline editing belongs on the detail view.

---

## Edit Interaction Style

| Option | Description | Selected |
|--------|-------------|----------|
| Click-to-edit fields (inline) | Click text → becomes input, auto-saves on blur/Enter | ✓ |
| Edit button reveals form | Explicit button shows form with Save/Cancel | |

**User's choice:** Click-to-edit fields (inline)
**Notes:** Notion/Linear style — no extra button, auto-save on blur or Enter.

---

## Save Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-save on blur / Enter | No Save button — matches StatusSelect pattern | ✓ |
| Explicit Save button | Small Save/Cancel per field | |

**User's choice:** Auto-save on blur / Enter (no button)

---

## Interview Prep Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on detail page | "Start Interview Prep" button in Interview tab, streams Q+A there | ✓ (Claude's judgment) |
| Navigate to home page | Button goes to /?applicationId=X, home page runs it | |

**User's choice:** "You decide" — deferred to Claude
**Notes:** Claude chose inline on detail page. Less navigation friction; user is already looking at the application.

---

## Unknown State Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder text + pencil icon | Muted/italic style + icon | |
| Orange "Edit needed" badge | Warning badge next to unknown values | ✓ |

**User's choice:** Highlight with a warning badge

---

## Workflow Improvements

| Option | Description | Selected |
|--------|-------------|----------|
| Auth UX — 401 redirect | Fix silent "Failed to connect" → redirect to /sign-in | ✓ |
| Save error visibility | Surface save_error as toast/banner instead of console.warn | ✓ |
| Both | Both of the above | ✓ |

**User's choice:** Both of the above

---

## Claude's Discretion

- Where to put inline editing: chose detail-page-only (list is too dense)
- Interview prep location: chose inline on detail page (avoids navigation)
- Exact "Edit needed" badge color token: closest amber/orange from design system
- Toast vs inline banner for save_error: use whatever shadcn/ui provides

## Deferred Ideas

- Delete application from history (HIST-V2-03 — already in v2 backlog)
- Score trend chart (HIST-V2-01)
- Notes field (HIST-V2-02)
- Bullet-level rewrite suggestions (OPT-V2-01)
