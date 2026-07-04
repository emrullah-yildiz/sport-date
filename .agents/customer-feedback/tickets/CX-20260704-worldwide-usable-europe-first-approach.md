# CX-20260704-worldwide-usable-europe-first-approach

- Status: `implemented`
- Severity: `medium`
- Priority: `P1` — owner directive (2026-07-04). Clarify KeepItUp is usable worldwide; "Europe-first" is our privacy/safety/compliance/community-building APPROACH, not a geographic restriction. Refines the earlier "first events in Europe" copy pass.
- Customer journey: any visitor/member (incl. non-EU) understands they can use KeepItUp to organize/join sports events anywhere; participation isn't geo-restricted; local availability depends on hosts.
- Surface: landing, signup, event creation, discovery, trust, FAQ, metadata + docs
- Environment and viewport/device: web (+ mobile)
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`
- **SEQUENCING: run AFTER `CX-20260704-interactive-onboarding-gender-orientation` merges** — both edit signup/landing; do not run concurrently. `git pull --rebase` onto the latest main first.

## Core message (use this framing; adapt length per surface)

> "KeepItUp can be used worldwide to organize sports events. We are Europe-first in privacy, safety standards, and community building, but participation is not geographically restricted. Local event availability depends on hosts in each area."

## Requirements (all mandatory)

- **Do NOT introduce any country or city restriction** (no geo-gating of signup, discovery, or event creation).
- **Replace copy suggesting KeepItUp is available only in Europe** (e.g. "first events in Europe" / "Europe first" phrasings that read as a location limit) with worldwide-usable framing.
- **Preserve "Europe-first" as the privacy/safety/compliance/community-building approach** — reframe it as our *standard*, explicitly NOT a geographic restriction.
- **Do NOT claim KeepItUp operates, hosts, supervises, or provides support in every location.** Make clear **events are organized by users**; local availability depends on hosts in each area.
- **Keep the existing precise-location privacy protections unchanged** (approximate area in discovery; exact venue only post-acceptance — do not weaken).

## Surfaces to review + update

1. **Landing** (`app/landing/page.tsx`) — hero badge/subtitle, the open-beta band, safety card, footer, final CTA.
2. **Signup** (`SignUpForm` / steps / signup page metadata) — any "Europe first/only" line.
3. **Event creation** (`CreateEventForm`) — ensure no geo restriction implied; events are host-organized anywhere.
4. **Discovery** (`/discover`, discover API/copy) — "worldwide, availability depends on hosts near you" framing; keep the honest empty state.
5. **Trust** (`app/trust/page.tsx`) — frame Europe-first as the privacy/safety standard, not a location limit.
6. **FAQ** — if a FAQ exists, add/adjust a "Where can I use KeepItUp?" answer with the core message; if none exists, add a short FAQ entry on the trust or landing surface (don't invent a whole page unless trivial).
7. **Metadata** (`app/layout.tsx` + `landing` metadata + OG/Twitter descriptions) — remove Europe-only implication; worldwide-usable, privacy-first.
8. **Footers** (`SiteFooter`, landing footer, `/e/[id]` invite footer) — same reframing.
9. **BetaTermExplainer** — align its points.

## Acceptance criteria

- No member-visible copy states or implies KeepItUp is usable only in Europe; the worldwide-usable + Europe-first-as-approach framing is consistent across all surfaces above.
- No new geo restriction in code (signup/discovery/event-create accept all locations — unchanged behavior).
- Precise-location privacy unchanged (tests still pass).
- Copy makes clear events are user-organized and local availability depends on hosts; no claim of operating/hosting/supervising/support everywhere.
- **Add or update tests for material UI copy** (e.g. landing/footer/metadata assert the worldwide framing and assert the "Europe only" phrasings are absent — mirror the existing `landing/page.test.tsx` badge assertions).
- **Run tests + typecheck + lint + production build — all green.**
- **Update `docs/operations/agent-state.md`** noting this messaging clarification.
- Update any other relevant docs (positioning/marketing docs are the CEO's — coordinate, but member-visible product copy + trust/FAQ are in scope here).

## Guardrails

- Honest, anti-dark-pattern; do not overclaim global operation/support. "Usable worldwide" ≠ "we run events everywhere."
- No dark patterns; dignified, inclusive.

## Process

- No migration expected. `git pull --rebase` first. Full DoD. **Commit AND PUSH to main** (owner explicitly requested the verified change be pushed). Then report the commit hash + test counts.

## Handoff log

- 2026-07-04 | build | in-progress → implemented by `agent`. Reframed member-visible copy to worldwide-usable + Europe-first-as-approach across landing (hero badge, safety card, open-beta band, footer, metadata), `layout.tsx` metadata + OG/Twitter, `SiteFooter`, `/e/[id]` invite footer, `BetaTermExplainer` points, and added a "Where can I use KeepItUp?" Trust card. No geo restriction added; precise-location privacy unchanged. Tests: landing `page.test.tsx` updated + new `SiteFooter.test.tsx` / `trust/page.test.tsx`. Checks: typecheck + lint + full web suite (950 pass / 12 skip) + production build all green.
