# CX-20260630-session-management-web-session-not-listed

- Status: `ready`
- Severity: `medium`
- Customer journey: Account security — reviewing and signing out my signed-in devices/sessions from the profile
- Surface: `web`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), dev Neon branch, Chromium (Playwright) 1280x900 and 390x844. Observed 2026-06-30.
- Found by: Customer Experience Agent (full end-to-end workflow pass, `apps/web/qa/full-flows.mjs`)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a cautious adult who signs in to Sport Date from a web browser, I want to see the sessions that currently have access to my account and be able to sign out a session I no longer trust (for example, a shared or public computer), so that I can recover control of my account without changing my password or contacting support.

## What I observed

Observed 2026-06-30, reproduced 2/2 (desktop 1280 and mobile 390), confirmed against the component source.

- On my profile there is an "Account security — Signed-in mobile devices" panel. While I am signed in *in this very browser*, it reads: "Review native sessions without exposing their access or refresh credentials." and then "No mobile device sessions yet." (Screenshot `04-sessions-web.png`.)
- There is nothing to review and no "Revoke" control, because the panel only lists **native/mobile app device sessions**. My current **web/browser session is invisible here and cannot be revoked** from this surface.
- The only session-ending control available to a web member is the top-of-page "Sign out" button, which ends *this* browser's session — it does not let me see or end a session on another browser/computer.
- The panel's own heading ("Signed-in mobile devices") and body ("Review native sessions") are honest about being mobile-only, but the surrounding hero copy promises "live controls for ... device sessions," which a web-only member reasonably reads as "all my sessions."

## What I expected

A signed-in web member should be able to see their active web session(s) listed in the same "Account security" panel and revoke any session other than (or including) the current one, with a clear confirmation. At minimum, when there are no mobile sessions, the panel should explain that web sessions are managed separately (and how), rather than showing an empty "No mobile device sessions yet" state that reads as "you have no active sessions" while the member is plainly signed in.

## Reproduction

1. Register or sign in as a web member and land on `/profile`.
2. Scroll to "Account security — Signed-in mobile devices".
3. Observe "No mobile device sessions yet" with no list and no revoke control, despite being actively signed in on the web.

Reproduction rate: `2/2 safe attempts`

## Customer impact

Practical: a web member who used a shared/public computer, or who suspects their session is compromised, has no self-service way to view or end that session from the account-security surface; their only lever is the local "Sign out" (which they may not have access to on the other machine) or a full password change. Emotional: the empty "no sessions" state during an active session is confusing and slightly undermines trust in the security tooling.

- Authorization/security: yes — this is about session lifecycle and the member's ability to revoke access. It is not a leak (no credentials are exposed; the mobile panel is explicitly redacted), but it is a missing recovery control on the web surface.
- Privacy: indirect (no precise location or sensitive data exposed by this gap).
- Data loss: no.

## Evidence and limits

- Evidence: screenshot `04-sessions-web.png` (redacted; profile of a synthetic `qa+...@sport-date.invalid` adult). Component: `apps/web/src/components/MobileSessionControls.tsx` (fetches `/api/account/mobile-sessions`, lists only native device sessions).
- Redactions made: synthetic email only; no real PII, tokens, or precise locations.
- Facts: the panel queries mobile/native sessions and shows "No mobile device sessions yet" for a web member; no web-session listing or revoke exists on this surface; logout ends only the current browser session.
- Hypotheses to verify during implementation: whether a per-session web-session model exists server-side to surface; whether the intended design is "web sessions are managed only via logout / password reset" (in which case the fix is copy/guidance, not a new list).
- Paths or surfaces not tested: revoking an actual *mobile* session (no native client available in this environment); multi-browser web-session revocation (no web-session list exists to exercise).

## Duplicate check

- Search terms used: "session", "device", "mobile-sessions", "revoke", "account security" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: landing-hero-reduced-motion, native-date-inputs, native-select-dropdowns, new-member-empty-discovery-missing-language, signup-sport-cards-letter-monograms.
- Why this is new: no existing ticket concerns session/device management or the web-session revocation gap.

## Acceptance criteria

- [ ] A signed-in web member can see at least their current web session in the "Account security" panel (or is clearly told, without internal terminology, that web sessions are ended by signing out / resetting the password and why).
- [ ] If web sessions are listed, the member can revoke a session and sees a confirmation; a revoked session can no longer access the account.
- [ ] The empty state no longer implies "you have no active sessions" while the member is signed in.
- [ ] The mobile and web layouts of the panel remain usable (verified at 390px and desktop).
- [ ] Keyboard, screen-reader naming, and focus are correct for any new list/revoke controls.
- [ ] No access or refresh credentials are exposed for any session.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- `2026-06-30` - Filed by Customer Experience Agent; status `ready`.
