# CX-20260702-anthracite-systematic-neon-accent-palette

- Status: `in-progress`
- Severity: `high`
- Priority: `P1 high` — owner-directed palette refinement (2026-07-02): anthracite background + a SYSTEMATIC multi-neon accent system, with readability as the top rule. Retunes the already-tokenized theme (token change, no schema).
- Customer journey: cross-cutting (visual system)
- Surface: `web`
- Environment and viewport/device: all widths
- Found by: Owner (direct feedback 2026-07-02, referencing rayon.design)
- Implementation owner: `experience-build-agent (Builder)`
- Related tickets: `CX-20260702-dark-neon-theme-tokens` (verified/implemented), `CX-20260702-migrate-hardcoded-colors-to-tokens` (implemented), `docs/design-refresh-2026.md`

## Owner direction (verbatim intent)

- **Readability is the top rule:** never low-contrast. If a surface is light, its text is dark; if dark, its text is light. Every pairing must meet WCAG AA (aim AAA for body).
- **Background = anthracite** (a dark charcoal/gunmetal grey — NOT pure black), with a *little* subtle texture (faint, tasteful, performant — e.g. a low-opacity noise or a very subtle gradient; must not hurt text contrast or reduced-motion).
- **Systematic multi-neon accents:** use several neon colors — **green, red, blue** — but **systematically / semantically**, not randomly.

## Proposed system (implementer to finalize + verify AA)

Semantic accent tokens, each used consistently for one meaning:
- **Neon GREEN** → primary / positive / success / "go" (join, publish, confirm, momentum). Map `--accent`.
- **Neon BLUE** → informational / links / secondary highlights / active navigation. Map `--accent-2`/`--accent-info`.
- **Neon RED** → destructive / urgency / danger / errors (leave, report, cancel warnings, validation errors). Map `--warn`/`--danger`. Keep it for genuine urgency only — do not over-use.
- Background family: `--bg` anthracite, `--surface`/`--surface-raised` slightly lifted anthracite; `--text` legible off-white, `--text-muted` legible; `--line` subtle.
- On any neon FILL, text is near-black (`--bg`) for contrast; neon-as-text sits on the anthracite surfaces and must still meet AA.

## Acceptance criteria

- [ ] `--bg` is anthracite (dark charcoal grey, not pure black) with a subtle, tasteful texture that respects `prefers-reduced-motion` and does not reduce text contrast.
- [ ] Green / blue / red neon accents are defined as SEMANTIC tokens and applied systematically: green = primary/positive, blue = info/links/nav, red = destructive/urgency — consistently across buttons, links, states, and safety/urgency affordances (report/leave/cancel/errors use red).
- [ ] Every text-on-surface and text-on-accent-fill pairing meets WCAG AA (compute + record ratios); body aims AAA; safety/trust content stays clearly legible.
- [ ] Readability rule holds everywhere: no light-on-light or dark-on-dark; inputs have visible borders/focus on the anthracite surfaces; visible `--focus` ring; 44px targets.
- [ ] No regression to the dark-theme migration; responsive at 1280/375; reduced-motion safe.
- [ ] `docs/design-refresh-2026.md` + `docs/design-system.md` updated to the anthracite + systematic-neon palette with the final hex values and ratios.
- [ ] Repository checks pass incl. production build. (Token change — no migration.)

## Handoff and retest log

- 2026-07-02 - Filed from owner direction (anthracite bg + systematic green/red/blue neons + readability); status `ready`.
- 2026-07-02 - Builder picked up; status `in-progress`, owner = experience-build-agent. Retuning `:root` tokens to anthracite + systematic neon green/blue/red, adding subtle static texture, mapping semantic aliases (`--accent-info`, `--danger`), and re-pointing links/info to blue.
