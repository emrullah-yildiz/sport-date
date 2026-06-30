# CX-20260630-discover-filter-input-placeholders-truncated

- Status: `ready`
- Severity: `low`
- Customer journey: Using the discovery filter bar on `/discover`.
- Surface: `web`
- Environment and viewport/device: Local dev, Chromium, 1920 / 1440 / 1024 (most pronounced at 1024).
- Found by: Visual QA (per-element overflow scan + visual)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a member filtering events, I want the SPORT and LANGUAGE filter fields to show their full placeholder hint so I know what each field does before I have typed anything.

## What I observed

In the `/discover` filter bar, the four fields are laid out in a fixed `repeat(4,1fr) auto` grid. The SPORT and LANGUAGE inputs carry placeholders "Any sport in your profile" and "Any compatible language", but the columns are narrow enough that the placeholder text is clipped by the input box:

- SPORT input at 1024: scrollWidth 230 vs clientWidth 181 (+49px clipped) → shows "Any sport in your prof…".
- LANGUAGE input: shows "Any compatible langu…".
- Also flagged at 1920/1440 (+9px) for the CITY/value input when a long value is present.

This is native input text truncation (no scrollbar shown), so the hint is silently cut. The empty-discovery state screenshot shows it clearly.

## What I expected

The placeholder hint should be fully visible at the standard desktop widths, or the layout/placeholder should adapt (wider columns, shorter placeholder, or a label-only hint) so no hint is half-shown.

## Reproduction

1. Open `/discover` at 1024 (and 1440).
2. Look at the SPORT and LANGUAGE filter inputs before typing.
3. Observe the placeholder text cut off inside the box.

Reproduction rate: `3/5 widths (1920/1440/1024; fields stack and are full width at 768/390)`

## Customer impact

Minor usability. No data/safety concern. A first-time member may not realize the field defaults to "any sport in your profile" / "any compatible language" because the explanation is clipped.

## Evidence and limits

- Evidence: `scratchpad/audit2/118-discover-empty-empty-1024.png`, `116-discover-empty-empty-1920.png`; `overflow-findings.json` (page=discover-empty, tag=INPUT, x=1).
- Redactions made: none.
- Facts: `.discover-filters` uses `grid-template-columns: repeat(4,1fr) auto`; inputs truncate placeholder at the resulting widths.
- Hypotheses to verify: shorter placeholders, or letting fields grow / wrap, removes the truncation.
- Paths or surfaces not tested: very large widths beyond 1920.

## Duplicate check

- Search terms used: discover, filter, placeholder, input, truncate, overflow.
- Tickets reviewed: all CX-2026* tickets (incl. empty-discovery-missing-language — that is about missing language data, not placeholder clipping).
- Why this is new: distinct from the empty-discovery language ticket; this is filter-bar placeholder clipping.

## Acceptance criteria

- [ ] SPORT and LANGUAGE filter placeholders are fully readable at 1920/1440/1024 (or replaced with hints that fit).
- [ ] No filter input clips its placeholder/hint without an affordance.
- [ ] Filter bar remains usable at mobile widths (stacked).
- [ ] Relevant repository checks pass.

## Handoff and retest log

- `2026-06-30 19:00 EEST` - Filed by Visual QA; status `ready`.
