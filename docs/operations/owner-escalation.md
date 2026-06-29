# Owner escalation packet

One decision packet bundling every owner-only launch gate, so several roadmap items can be unblocked in one sitting. Each gate uses the escalation format from `.agents/skills/run-product-studio/references/escalation-policy.md`: **decision needed · recommendation · two meaningful alternatives · consequence of delay · exact action requested**. Gates are ordered by how many roadmap items each unblocks (highest-leverage first).

This is a request for decisions and credentials. The autonomous agent has not crossed any of these gates and will not: it has drafted what is needed but will not create accounts, accept terms, spend money, deploy, send mail, make legal representations, or choose the brand/country without explicit owner authorization.

A note on honesty: nothing below is urgent in a fabricated sense. The product is a verified development preview with a clean test suite; none of it is live, and no real users are affected by waiting. The cost of delay is opportunity cost and sequencing, described plainly per gate.

---

## Gate 1 — Production infrastructure approval and credentials

**Unblocks (highest leverage):** production deployment; monitoring; backup/recovery; domain ownership; shared edge rate limiting (Gate 6 runs on it); production scheduling of the session-cleanup job; the isolated test database (Gate 7 can be a managed instance from the same provider); and is a prerequisite for real email delivery (Gate 4) reaching real inboxes from a deployed origin. Touches the "Production infrastructure, monitoring, backup, recovery, email, and domain ownership are approved" launch gate and several authentication "required before external registration" items.

- **Decision needed:** which hosting, managed PostgreSQL, monitoring, backup, and domain provider(s) to use for a first European deployment, and authorization to provision them.
- **Recommendation:** a single European-region managed stack to keep data residency simple before counsel review — managed Postgres with automated backups, a Node-compatible app host in an EU region, basic uptime/error monitoring, and one registered domain. Keep it minimal and reversible; do not over-build before validation. Provide credentials through a secret manager, never in the repo.
- **Alternative A:** a major general-purpose cloud (more control, more setup and operational burden, more standing cost before there is traffic).
- **Alternative B:** stay in development preview with no production infrastructure until member/host validation (Gate 3 / roadmap interviews) produces evidence of demand — cheapest, but blocks every other technical launch gate indefinitely.
- **Consequence of delay:** the app cannot be deployed, the cleanup job cannot be scheduled, edge rate limiting and the integration test DB have nowhere to live, and real email cannot be delivered. No user impact today (nothing is live); the cost is that the entire production readiness track is parked.
- **Exact action requested:** approve a provider set (or confirm Alternative B), create the accounts under owner ownership, and supply credentials via a secret manager the agent can be granted scoped access to. Confirm the intended deployment region.

---

## Gate 2 — Qualified EU counsel sign-off

**Unblocks:** the "Qualified European counsel reviews terms, privacy, consent, moderation, age assurance, and launch-country obligations" launch gate; final retention durations across the whole retention matrix in `docs/legal/privacy-rights-preparation.md`; the lawful basis for `requested_ip_hash` and token-audit rows; the consent/marketing boundary; deletion-finalization exceptions; and the role-gated feedback-triage retention item on the roadmap.

- **Decision needed:** engage qualified counsel in the chosen launch jurisdiction to review and sign off on terms, privacy notice, consent flows, age assurance, retention periods, lawful bases, and deletion exceptions.
- **Recommendation:** engage counsel in parallel with (not after) Gate 3's country choice on the assumption set already prepared, so the prepared drafts (`docs/legal/privacy-rights-preparation.md`, retention matrix, lawful-basis boundary) become reviewable artifacts rather than starting from zero. The agent can prepare draft terms/privacy/consent text for counsel to review; it must not represent them as approved.
- **Alternative A:** defer counsel until immediately before launch — lower near-term cost, but leaves retention durations, lawful bases, and the IP-hash basis unresolved, which blocks finalizing data handling and any real collection.
- **Alternative B:** launch-country-agnostic counsel review of the GDPR baseline now, with a country-specific top-up once Gate 3 lands — splits the cost and de-risks the common core early.
- **Consequence of delay:** no real personal data can be collected from real users with confidence; retention durations stay deliberately unset; `requested_ip_hash` retention stays unjustified; terms/privacy/consent cannot be published. Blocks the legal launch gate entirely.
- **Exact action requested:** authorize engaging counsel (and the budget for it), confirm the jurisdiction (or approve Alternative B's baseline-first approach), and nominate who signs off internally. The agent will hand counsel the prepared compliance-preparation docs and draft notices.

---

## Gate 3 — Final brand and launch country/city

**Unblocks:** the "Prepare final brand screen, social account packet, launch content, and measurement plan" roadmap item; country-specific privacy notice (feeds Gate 2); positioning/landing-conversion validation; the social launch packet; and real member/host outreach and interviews (currently blocked on owner participation).

- **Decision needed:** the final product/company name and the first launch country and city (Bucharest is a research hypothesis, "Sport Date" is a working name — neither is committed).
- **Recommendation:** confirm Bucharest and the validated Aviatorilor–Herastrau / Aurel Vlaicu–Floreasca corridor as the launch hypothesis to act on, and choose a final name, *conditioned on* the corridor-validation interviews (roadmap item) clearing their thresholds. Do not commit spend or brand assets before four credible founding hosts and repeated event supply exist.
- **Alternative A:** pick a different dense European city where the owner has stronger host relationships — relationships and supply matter more than the specific city, so owner network may outweigh the Bucharest research.
- **Alternative B:** keep the working name and run validation interviews first, deciding the brand only once the wedge is proven — avoids naming a product that may pivot.
- **Consequence of delay:** the privacy notice cannot be made country-specific (partially blocks Gate 2), no external outreach or social accounts can be prepared for publication, and the launch-content/measurement track stays parked. No user impact; the cost is that go-to-market preparation cannot finalize.
- **Exact action requested:** confirm or change the launch country/city, approve a final brand name (or explicitly defer it to post-validation), and confirm whether the owner will personally participate in the founding-host and member interviews that real outreach requires.

---

## Gate 4 — Email provider selection and credentials

**Unblocks:** real email-verification and password-reset delivery (the delivery adapter is built, default-disabled, and provider-gated); the "Email verification and password reset" roadmap item's final step ("sending real emails still requires an owner-approved email provider"); and any future transactional/marketing send.

- **Decision needed:** which transactional email provider to use and authorization to enable real sending, with EU-appropriate data handling.
- **Recommendation:** select one EU-friendly transactional provider for transactional-only mail (verification, reset), kept behind the existing single adapter seam, with suppression handling and a Data Processing Agreement reviewed under Gate 2. Enable it only after a deployed origin (Gate 1) and counsel review (Gate 2) exist, so links resolve to the canonical production origin and the processor relationship is lawful.
- **Alternative A:** self-hosted SMTP — maximum control over data, but materially higher deliverability and operational burden, and weaker reputation handling for a new domain.
- **Alternative B:** defer email entirely and keep both flows on the development console simulation until validation proves demand — zero provider cost, but no real verification or reset mail can be delivered, so the signup flow stays a preview.
- **Consequence of delay:** no real verification or reset email can be sent; both flows remain testable only via the console simulation; external registration cannot proceed. No user impact today.
- **Exact action requested:** approve a provider, create the account under owner ownership, supply API credentials via the secret manager, and confirm the sending domain (depends on Gate 1's domain). Authorize enabling delivery only when Gates 1 and 2 are also satisfied.

---

## Gate 5 — Named safety/moderation owner and escalation rota

**Unblocks:** the "A real moderation owner and escalation channel exist" launch gate; member messaging (the decision log holds open messaging until staffed human safety operations exist); and critical-response targets in the moderation operations design. Without it, messaging and any feature that depends on timely human safety response cannot go live.

- **Decision needed:** name an accountable trained safety/moderation owner and a backup escalation rota with defined response targets and an incident channel.
- **Recommendation:** name at least one accountable owner and one backup before any messaging or broad acquisition, sized to the small initial launch (it does not need a large team — it needs a real, reachable, trained human with a documented escalation path and the response levels already designed in `docs/safety/moderation-operations.md`).
- **Alternative A:** a third-party moderation/trust-and-safety vendor — faster to stand up coverage, but adds cost, data-sharing (feeds Gate 2), and less product context.
- **Alternative B:** keep messaging disabled and launch the event-coordination loop without open messaging until staffing exists — the product already works without open messaging, so this is a viable sequencing choice rather than a blocker on the whole launch.
- **Consequence of delay:** member messaging stays disabled and critical-response/transparency targets cannot be committed to. The non-messaging product can still operate, so the cost is a narrower launch, not a stalled one.
- **Exact action requested:** name the safety owner and backup, confirm an escalation channel and response-time targets, and confirm whether the launch proceeds with messaging disabled (Alternative B) or waits for staffing.

---

## Gate 6 — Shared edge/gateway rate limiting

**Unblocks:** the authentication "Shared rate limiting at the edge or gateway" item required before external registration; and finishes closing the account-enumeration timing channel (the in-app reset-request floor added this cycle reduces but does not eliminate it — see `docs/security/authentication.md`, "Account-enumeration posture"). Depends on Gate 1.

- **Decision needed:** approve a shared edge/gateway rate-limiting layer (with a backing store that survives restarts and coordinates across replicas) once production infrastructure exists.
- **Recommendation:** add edge rate limiting as part of the Gate 1 infrastructure rollout, reusing the provider's gateway/WAF or a shared store (e.g. a managed Redis), keyed by IP and normalized account. The in-app baseline already implements the rule shapes; the edge layer makes them effective across replicas and restarts and makes enumeration timing attacks impractical.
- **Alternative A:** rely on the hosting provider's built-in WAF/rate limits only — fastest, but coarser and less tuned to per-account auth abuse.
- **Alternative B:** ship a custom shared-store limiter on top of the existing in-app rules — most control and reuse of existing logic, but more to build and operate.
- **Consequence of delay:** abuse controls remain per-process in-memory only (do not survive restarts or scale across replicas), and the reset-request enumeration timing channel stays only floored, not closed. Acceptable for a development preview; not acceptable for real external registration.
- **Exact action requested:** as part of Gate 1, approve the edge/gateway rate-limiting approach and provision its backing store. This is mostly an infrastructure decision; the agent can implement and wire the limiter once the store exists.
- **Status (2026-06-30): Alternative B is now CODE-COMPLETE.** The shared-store limiter is implemented behind an async `RateLimitStore` seam in `apps/web/src/lib/rate-limit.ts`: an env-gated **Upstash Redis REST** adapter (atomic pipeline `INCR`+`PEXPIRE`, `GET`+`PTTL` read, **no new dependency**) that **activates automatically** the moment `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set, and otherwise leaves the existing in-memory limiter as the behavior-identical default. On any Upstash error it gracefully degrades to in-memory enforcement (never to unlimited). It is unit-tested with a mocked `fetch` (11 tests). The only owner action now needed for the shared backing store is **owner step 4** in `infrastructure-plan.md` (provision the Frankfurt Upstash database and hand over the two env vars); a real-Upstash opt-in integration test is the lone follow-up once it exists. A provider WAF/gateway layer (Alternatives A) remains an optional additional control.

---

## Gate 7 — Isolated PostgreSQL test database for integration tests

**Unblocks:** the "Integration tests against an isolated PostgreSQL database" authentication item and the repeatedly-tracked engineering follow-up to assert token single-use, sibling invalidation, and reset session-revocation against real SQL rather than recorded statements. This is the one gate that is **autonomous once provided** — the agent can write and run the tests itself; it only needs the instance.

- **Decision needed:** provide an isolated, disposable PostgreSQL instance the test suite may create/drop schemas against (CI and/or local).
- **Recommendation:** provision a throwaway PostgreSQL (a CI service container and/or a documented local Docker instance) separate from any real data, from the same provider chosen in Gate 1. Low cost, low risk, and it converts several "verified only at the recorded-statement level" residual risks into real-SQL assertions.
- **Alternative A:** an ephemeral in-memory/embedded Postgres in CI — no standing cost, fully isolated, but a small fidelity gap versus the managed engine.
- **Alternative B:** continue mocking the database and accept recorded-statement-level coverage until production — zero effort now, but leaves concurrency/constraint behavior (single-use under concurrent confirms, unique token-hash) unproven.
- **Consequence of delay:** the integration test stays blocked and several auth flows remain asserted only against recorded statements, not real SQL. No user impact; it is a test-confidence gap.
- **Exact action requested:** provide connection details for a disposable test PostgreSQL (or approve standing up a CI service container). Once provided, the agent will write and run the integration tests without further escalation.

---

## Summary table

| # | Gate | Primary roadmap items unblocked | One-line recommendation |
| --- | --- | --- | --- |
| 1 | Production infrastructure + credentials | Deploy, monitoring, backup, domain, cleanup scheduling, plus prerequisite for Gates 4/6/7 | Approve a minimal single-region EU managed stack; supply credentials via a secret manager. |
| 2 | EU counsel sign-off | Terms/privacy/consent, retention matrix, `requested_ip_hash` basis, deletion exceptions, feedback-triage retention | Engage counsel in parallel with country choice and hand them the prepared compliance drafts. |
| 3 | Final brand + launch country/city | Brand screen, social packet, launch content, country-specific privacy notice, real outreach | Confirm Bucharest + the validated corridor conditioned on interview thresholds; name (or defer) the brand. |
| 4 | Email provider + credentials | Real verification/reset delivery; transactional/marketing send | Pick one EU-friendly transactional provider behind the existing adapter; enable only after Gates 1 and 2. |
| 5 | Safety/moderation owner + rota | Messaging, critical-response targets, the moderation-owner launch gate | Name one accountable owner + backup with an escalation path, or launch with messaging disabled. |
| 6 | Shared edge/gateway rate limiting | Pre-registration shared abuse control; closes the enumeration timing residual | Add it during the Gate 1 rollout with a shared store; agent implements once the store exists. |
| 7 | Isolated PostgreSQL test DB | Real-SQL integration tests for the auth flows | Provide a disposable Postgres; autonomous once provided — agent writes and runs the tests. |
