# CX-20260704-research-self-hosted-market-survey

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — owner authorized running market surveys (2026-07-04, "do market surveys using support@keepitup.social, pick the environment yourself"). CEO environment decision: **self-hosted in our app** — no third-party account needed, GDPR under our own policy, data in our DB.
- Customer journey: visitor (from IG bio/posts or landing) → /research → answers anonymously in ~2 min → optional opt-in to deeper questions + follow-up contact → thank-you.
- Surface: new public route `/research` + API + DB table
- Environment and viewport/device: web, mobile-first (traffic is IG)
- Found by: Acting CEO (owner directive 2026-07-04)
- Implementation owner: `agent`
- Related tickets: supersedes the survey half of `CX-20260701-owner-action-run-surveys-and-forum-outreach` (forum-posting half remains owner-gated)

## Task

Implement the research survey from `docs/marketing/member-survey-and-forum-kit.md` **Part A** as a public, anonymous, self-hosted survey at `/research`.

- **Step 1 = Survey 1** (Q1–Q6, Q8): the short "how adults meet through activity today" set, verbatim from the kit (non-leading wording is deliberate — do not rewrite).
- **Step 2 (optional, after submit):** "5 more minutes?" opt-in extension with Survey 2's Q10–Q15 (incl. willingness-to-pay bands).
- **Q7 contact** (research-conversation opt-in): collected on a separate final screen, with its own explicit consent checkbox, stored in a separate column/table from the anonymous answers, purpose-limited copy ("used only to schedule this study; deleted after"). Contact for questions/deletion: `support@keepitup.social` (import from `SUPPORT_EMAIL` in `lib/brand.tsx`).
- Show the kit's intro notice verbatim before questions ("anonymous… not a sign-up… skip any question…").
- Storage: new table (e.g. `research_responses`) via a normal numbered migration — additive only. JSON answers + created_at; NO ip/user-agent stored; no auth, no cookies required.
- Rate-limit submissions per IP using the existing rate-limit infra (prevent spam without storing the IP in the response row).
- Every question skippable; "prefer not to say" options preserved.
- Admin/analysis: a simple authenticated-or-scripted way to read aggregate counts is enough (even a `scripts/` query script). No public results.

## Acceptance criteria

- `/research` works logged-out on mobile; all questions skippable; submits with partial answers.
- Anonymous answers and contact info are separable at the schema level; deleting a contact leaves the anonymous row intact.
- Privacy notice on-page: what's collected, why, retention ("responses reviewed for product research; contact info deleted once the study is scheduled/complete"), deletion contact support@keepitup.social, link to /privacy.
- Migration is additive; typecheck/lint/test/prod-build green; tests cover: submission stores answers, contact consent required for contact storage, rate limit path.
- No dark patterns; no implied traction ("join thousands…" forbidden); it stays visibly a research study, not a signup.

## Guardrails

- The kit's "no data collection until…" preconditions are satisfied by the owner's 2026-07-04 authorization + on-page notice + support@keepitup.social as responder; EU-counsel review remains an open owner card — keep the collected surface minimal accordingly.
- WTP answers are directional only — never quote them as pricing evidence or traction.

## Why (CEO note)

Real willingness-to-pay + behavior signal, fully in-house, distributable through channels we already own (IG bio/captions, landing footer). Directly informs Phase-3 pricing confidence without spending anything.
