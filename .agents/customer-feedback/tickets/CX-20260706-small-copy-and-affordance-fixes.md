# CX-20260706-small-copy-and-affordance-fixes

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — four small member-facing honesty/affordance gaps, bundled for one efficient pass
- Customer journey: various (photos, event-room reporting, public invite)
- Surface: `web`
- Environment and viewport/device: mobile 390px + desktop
- Found by: Seraph user-sim daily pass (code walk)
- Implementation owner: `unassigned`
- Related tickets: `none found` for each item (searched: alt text, minLength, report hint, Request a place CTA, GDPR-grade)

## Findings (user voice)

1. **P2 — Photos panel promises alt text but offers no input.** "The photos section talks about alt text, but there's nowhere to type it." (`apps/web/src/components/ProfilePhotos.tsx:255-257`). Either add the alt-text input or remove the mention — don't describe a control that doesn't exist.
2. **P2 — Report dialog rejects short reports with no visible hint.** "I tried to report something and it wouldn't submit — nothing told me I needed at least 20 characters." (`apps/web/src/components/EventRoomChat.tsx:286`, `minLength=20`). Show the requirement up front and a clear inline message when unmet; safety flows must never fail silently.
3. **P2 — Logged-out "Request a place" CTA actually opens signup.** "The button said 'Request a place' — it took me to a signup wizard instead." (`apps/web/src/app/e/[eventId]/page.tsx:173-177`). Label the action truthfully for signed-out visitors (e.g. "Create a profile to request a place") so the button does what it says.
4. **P3 — "GDPR-grade privacy for everyone" is jargon to a stranger.** On the public invite footer (`apps/web/src/app/e/[eventId]/page.tsx:209`) a stranger who has never heard of GDPR gets a compliance acronym instead of reassurance. Say the human version first ("your privacy protected to strict EU standards"), keep GDPR as the qualifier.

## Acceptance criteria

- [ ] Each surface says only what is true and every stated control exists.
- [ ] Report dialog communicates its minimum length before and at submit; screen-reader users get the same message (associated described-by / live region).
- [ ] Signed-out invite CTA label matches its destination; signed-in behavior unchanged.
- [ ] typecheck / lint / tests / prod build green.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass); status `ready`.
