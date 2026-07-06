# CX-20260706-contact-email-renders-email-protected

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — the privacy/data-rights contact path (a GDPR-relevant control) renders as the literal text "[email protected]" in no-JS/reader/snippet contexts
- Customer journey: a member wants to send a privacy question or data-rights request → the Privacy Notice says "Email [email protected]" → in reader mode / no-JS / copied text there is no actual address
- Surface: `web` — live `/privacy`, `/terms`, `/research`, `/safety-guidelines` footer ("Questions? [email protected]")
- Environment and viewport/device: no-JS user agents, reader modes, copy-paste, search snippets; regular JS browsers decode it correctly
- Found by: Seraph user-sim daily pass (live fetch; raw HTML shows Cloudflare `/cdn-cgi/l/email-protection#…` links)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a member exercising a privacy right, I want the contact address to be plainly readable and copyable everywhere, so that the GDPR contact route never depends on JavaScript. In user voice: "Your privacy page says to email '[email protected]'. That is not an address. Where do I actually write?"

## What I observed (live, 2026-07-06)

Cloudflare's email obfuscation (scrape shield) rewrites the support address on public pages into `<a href="/cdn-cgi/l/email-protection#b6c5c3…">[email protected]</a>`. With JS enabled it decodes; without JS (readers, some in-app browsers, text extraction, search snippets, printed pages) the visible text is literally "[email protected]" on `/privacy` ("Privacy questions or a data-rights request? Email [email protected]"), `/terms`, `/research`, and the `/safety-guidelines` footer.

## What I expected

The privacy/data-rights and safety contact address is plain text (or otherwise robust without JS) on the legal/safety/research pages. Spam-harvesting concerns can be handled differently (dedicated alias, filtering) — the rights-contact path should not be JS-gated.

## Reproduction

1. `curl -s https://www.keepitup.social/privacy | grep email-protection` — obfuscated link present.
2. View `/privacy` in a no-JS context or reader mode — visible text is "[email protected]".

Reproduction rate: 6/6 occurrences across the fetched public pages.

## Customer impact

A member in a no-JS context cannot find the privacy/safety contact at all; in normal browsers it works, so impact is partial — but this is the GDPR rights route, so it must be robust. Fix is likely a Cloudflare setting (disable Scrape Shield email obfuscation for the zone) or serving the address in a form Cloudflare does not rewrite; note this may be an owner-executed dashboard change — if so, prepare the exact toggle instructions and escalate as an owner action rather than building around it.

## Duplicate check

- Search terms used: "email-protection", "email protected", "cdn-cgi", "contact email".
- Tickets reviewed: full tickets dir + archive grep — no hits.
- Why this is new: first observation of the Cloudflare rewrite on the live legal pages.

## Acceptance criteria

- [ ] The support/privacy contact address is human-readable and copyable on `/privacy`, `/terms`, `/research`, `/safety-guidelines` without JavaScript.
- [ ] No other public page still renders "[email protected]" (curl check).
- [ ] If the fix is a Cloudflare dashboard toggle, the exact steps are documented and escalated to the owner; the ticket is not closed until the live pages verify clean.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass, live-site fetch + raw HTML inspection); status `ready`.
