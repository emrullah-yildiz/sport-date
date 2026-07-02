# CX-20260702-feedback-history-page-value-capitalized-distorts-member-text

- Status: `ready`
- Severity: `low`
- Priority: `P3 polish` — (Reach 3 × Impact 2 × Confidence 4) / Effort 1 = 24. One-line CSS scoping fix; keeps a member's own words faithful.
- Customer journey: reflection / feedback ("What you've shared" history)
- Surface: `web`
- Environment and viewport/device: all widths (`/feedback`, observed 1280 + 375)
- Found by: User-simulator (feedback journey, 2026-07-02)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-feedback-headline-assumes-breakage-excludes-ideas` (same surface, copy); `CX-20260701-feedback-success-flat-dead-end-no-forward-path` (verified, same surface)

## Customer outcome

As a member reviewing "What you've shared", I want the page/screen I typed to appear exactly as I wrote it, so I recognise my own note and trust the record is faithful — not silently rewritten.

## What I observed

On `/feedback`, after submitting feedback the item appears in the "What you've shared" history. The **Page** value I typed is displayed **Title-Cased**, not as I entered it:

- I typed **`Event room`** in the "Page or screen" field → history shows **`Event Room`**.
- I typed **`/feedback`** → history shows **`/Feedback`** (the letter after the slash is force-capitalised).

The cause is visible in the rendered result and is not limited to controlled labels: the value definition cell carries a blanket `text-transform: capitalize` (`.feedback-ticket dd` in `globals.css` line ~1041), which also title-cases the calm sentence-case category labels ("An idea for improvement" → "An Idea For Improvement", "Something did not work" → "Something Did Not Work"). But the clearest defect is on the **free-text Page field**, where it distorts the member's own words. A member who enters a real path like `/discover` would see `/Discover`, which reads as a wrong, case-shifted path.

Observed 2026-07-02, dev localhost:3000, signed-in pooled synthetic adult, real Chromium at 1280 and 375. No overflow; no console/page/5xx errors during the flow.

## What I expected

The Page value the member typed is echoed back verbatim (`Event room`, `/feedback`, `/discover`) — capitalization untouched — because it is member-authored free text, and paths in particular are case-meaningful. Controlled category/impact/surface labels can keep whatever case the design intends, but the member's own free-text entry should not be transformed.

## What I expected to avoid (guardrails)

No dark patterns. Purely a display-fidelity fix — do not alter what is stored or add validation friction. Keep AA contrast and the calm history styling unchanged.

## Reproduction

1. Sign in and open `/feedback`.
2. In "Page or screen" type a mixed/lowercase value, e.g. `Event room` or `/feedback`.
3. Fill summary + details, submit.
4. In "What you've shared", read the Page value on the new card.

Reproduction rate: `confirmed; deterministic CSS transform`

## Customer impact

Low. The member's own words are quietly rewritten, which erodes the sense that the record is faithful and can make an entered path look wrong (case-shifted). No authorization, privacy, safety, or data-loss dimension — stored data is unaffected; this is display-only. Legibility/trust polish.

## Evidence and limits

- Evidence: live-observed history card — Page shown as `Event Room` for typed `Event room`, and `/Feedback` for typed `/feedback` (screenshot captured to scratch, redacted — synthetic account, no member data).
- Redactions made: none needed (synthetic account).
- Facts: `.feedback-ticket dd { ... text-transform: capitalize; }` at globals.css ~line 1041; `.feedback-ticket > header span` also capitalizes (line ~1035).
- Hypotheses to verify during implementation: whether the same `dd` cell is reused for values that legitimately want capitalize (Surface/Impact) — scope the fix so member free-text (Page) is untouched while controlled labels keep their intended case.
- Paths or surfaces not tested: mobile app feedback entry (web only this pass).

## Duplicate check

- Search terms used: `feedback`, `capitalize`, `text-transform`, `history`, `page` across `.agents/customer-feedback/tickets/` and `archive/`.
- Tickets reviewed: `CX-20260701-feedback-headline-assumes-breakage-excludes-ideas` (headline copy — different), `CX-20260701-feedback-success-flat-dead-end-no-forward-path` (verified; success focus/forward-path — different).
- Why this is new: no existing ticket covers the history-card capitalization of member free-text.

## Acceptance criteria

- [ ] A Page value the member typed (e.g. `Event room`, `/discover`) is displayed in the history exactly as entered — no forced capitalization.
- [ ] Controlled category/impact/surface labels remain in their intended, consistent case.
- [ ] No change to stored data; no new input validation friction.
- [ ] Mobile and desktop history layouts remain usable; no overflow introduced at 375 or 1280; AA contrast unchanged.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by User-simulator (feedback journey pass); status `ready`.
