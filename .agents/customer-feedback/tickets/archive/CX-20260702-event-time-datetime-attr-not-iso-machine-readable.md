# CX-20260702-event-time-datetime-attr-not-iso-machine-readable

- Status: `verified`
- Severity: `low`
- Priority: `P3 polish` — (Reach 5 × Impact 2 × Confidence 5) / Effort 1 = 50 → but this is a presentational/semantics defect with no member-visible breakage and no safety/privacy/authorization floor, so it is held at **P3 polish**. It touches the two scan-critical discovery surfaces (feed + detail) that were just rebuilt, and is a one-line normalization, hence high reach/confidence and tiny effort.
- Customer journey: discovery → intent (the `<time>` element on the feed card and the shared-invitation detail page)
- Surface: `web`
- Environment and viewport/device: all widths; observed in the server-rendered HTML at 1280 (the value is identical at every width)
- Found by: User-simulator (seeker discover→commit→room pass, 2026-07-02)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-event-detail-facts-block-flat-hierarchy-unscannable` (implemented — rebuilt the SAME `.event-detail-when` `<time>` this ticket is about, but for visual hierarchy; the `datetime` attribute value was not in that ticket's scope); `CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed` (verified — the feed `.discovery-when` `<time>`, same story); `CX-20260630-native-date-inputs-unstyled-mismatch` (verified — that is the `datetime-local` *form input's* styling, a completely different element and concern).

## Customer outcome

As a member (including one using a screen reader, a "add to calendar" browser affordance, or any tool that reads the semantic time of an event), I want the event's start time to be exposed as a valid, machine-readable value on the `<time>` element, so that assistive tech and tooling get a correct, timezone-unambiguous instant — not a human string that happens to also leak the server's timezone.

## What I observed

On both `/discover` (feed cards) and `/discover/events/[id]` (the shared-invitation detail page), the dominant date/time is rendered inside a `<time dateTime=…>` element. The **visible** text is correct and calm ("Sun 5 Jul" / "19:00", the just-shipped hierarchy). But the `dateTime` *attribute* — the machine-readable value — is a localized JavaScript `Date.toString()`:

- Detail page: `<time dateTime="Sun Jul 05 2026 19:00:00 GMT+0300 (Eastern European Summer Time)">`
- Feed cards: `<time dateTime="Thu Jul 02 2026 18:00:00 GMT+0300 (Eastern European Summer Time)">`, `<time dateTime="Fri Jul 03 2026 19:00:00 GMT+0300 (Eastern European Summer Time)">`, etc.

That string is **not a valid HTML `datetime` value** (the spec requires an ISO-8601-style date/time/datetime), so a user agent or assistive tool that tries to parse it gets nothing useful. It also embeds the *server's* timezone label ("Eastern European Summer Time") into the markup, which is incidental server-environment leakage rather than the event's own `event.timeZone`.

Notably the RSC/Flight payload for the same element carries the correct ISO instant (`$D2026-07-05T16:00:00.000Z`), and the room chat's `<time dateTime={message.createdAt}>` is a proper ISO string — so the app already knows how to do this correctly; it is specifically the `startsAt`-fed `<time>` on the feed and detail that is wrong.

Observed live 2026-07-02 as pooled seeker-B (single login). Reproduced on the feed and on `/discover/events/03545ff1-…` and `/discover/events/6c38406e-…`.

## What I expected

The `dateTime` attribute should be a valid machine-readable ISO-8601 value for the event's start instant (e.g. `2026-07-05T16:00:00.000Z`, or a zoned ISO string built from the event's own `timeZone`), matching what the RSC payload and the chat `<time>` already emit — while the visible "Sun 5 Jul / 19:00" text stays exactly as it is now.

## Reproduction

1. Log in as any member (a pooled QA account works).
2. Open `/discover`; view source / inspect the first event card's `<time>` element. Note `dateTime` is a value like `"Thu Jul 02 2026 18:00:00 GMT+0300 (Eastern European Summer Time)"`.
3. Open any `/discover/events/[id]`; inspect the `.event-detail-when` `<time>` — same non-ISO `dateTime`.
4. Compare with the event room chat `<time>` (`message.createdAt`), which is correctly `"2026-07-02T03:30:43.164Z"`.

Reproduction rate: `confirmed` (every `startsAt`-fed `<time>` on the served HTML; 3/3 events + feed cards inspected).

## Customer impact

Practical: assistive technology and any calendar/date tooling that relies on the `<time>` machine value get an unparseable string, so the one place the page promises a machine-readable time delivers none. The visible time is unaffected, so a sighted member reading the screen is not harmed today. Emotional: none directly. This is a **semantics/accessibility-hygiene** defect, not a safety, privacy (no precise location is involved — area-only is unchanged), authorization, or data-loss issue. The incidental server-timezone label in markup is cosmetic, not a location leak (it is the server's TZ, not the member's or the venue's).

## Evidence and limits

- Evidence: `apps/web/src/app/discover/page.tsx:98` (`<time dateTime={event.startsAt}>` in `.discovery-when`); `apps/web/src/app/discover/events/[eventId]/page.tsx:34` (`<time dateTime={event.startsAt}>` in `.event-detail-when`); served HTML values quoted above; contrast with `apps/web/src/components/EventRoomChat.tsx:154` (`<time dateTime={message.createdAt}>` — correct ISO) and the RSC payload `$D2026-07-05T16:00:00.000Z`.
- Redactions made: host first name not quoted; no credentials/tokens/precise locations in evidence.
- Facts: `DiscoverableEvent.startsAt` / the detail event's `startsAt` are typed `string` (`apps/web/src/lib/events.ts:8,18`) but are populated from `row.starts_at` (a Postgres timestamp), which the DB driver returns as a JS `Date` at runtime — hence `Date.toString()` in the SSR `dateTime` attribute and `$D<iso>` in the Flight stream. `message.createdAt` is a real ISO string, so chat is unaffected.
- Hypotheses to verify during implementation: whether to normalize at the data layer (map `row.starts_at` to `new Date(...).toISOString()` where `startsAt` is produced, which also makes the `string` type honest) or at the render site (`dateTime={new Date(event.startsAt).toISOString()}`). The data-layer fix is preferable so the `string` type stops lying and any other consumer gets ISO; confirm no other consumer relies on the current Date-object behaviour (e.g. `formatDiscoveryDate` receiving a Date vs string).
- Paths or surfaces not tested: the host-owned `/events/[id]` and `/hosting` templates were not checked for the same `<time>` pattern; worth a grep for other `dateTime={…startsAt…}` sites during the fix.

## Duplicate check

- Search terms used: `datetime`, `dateTime`, `<time`, `machine-readable`, `ISO 8601`, `startsAt`, `toISOString`, `formatDiscoveryDate`, `discovery-when`, `event-detail-when`, `GMT+`, `Eastern European`, `timezone leak`.
- Tickets reviewed (active + archive): `event-detail-facts-block-flat-hierarchy-unscannable` (rebuilt the visual hierarchy of this `<time>`; the `datetime` attribute value was never in scope — its AC are about size/weight/availability wording, not the attribute), `discover-cards-inverted-hierarchy-unscannable-feed` (same, feed side), `native-date-inputs-unstyled-mismatch` (the `datetime-local` form INPUT styling — different element), `event-create-form-no-step-progress-friction` / `event-create-error-recovery-whack-a-mole` (the create form's `datetime-local` `min`/validation — different element and journey), `typography-right-size-and-scale` (type scale, not attributes).
- Why this is new: no existing ticket addresses the machine-readable `dateTime` *attribute value* on the discovery `<time>` elements. The hierarchy tickets touched the same element for a different (visual) reason and are already implemented/verified; refiling would not fix this.

## Acceptance criteria

- [ ] On `/discover` cards and `/discover/events/[id]`, every event `<time>` element's `dateTime` attribute is a valid ISO-8601 machine-readable value for the event's start instant (parseable by `new Date(attr)` / an HTML `<time>` parser), not a `Date.toString()` string.
- [ ] The visible date/time text ("Sun 5 Jul" / "19:00", from `formatDiscoveryDate`) is unchanged, and no member-visible layout, hierarchy, or wording changes.
- [ ] The server's incidental timezone label (e.g. "Eastern European Summer Time") no longer appears in the `dateTime` attribute markup.
- [ ] The fix is consistent with the already-correct room chat `<time>` (ISO) — feed, detail, and chat all emit valid `datetime`.
- [ ] Approximate-area-only privacy is unchanged; no venue/precise location or member timezone is newly exposed.
- [ ] No overflow or regression at 1280 or 375px; AA contrast and the shipped hierarchy are untouched (presentational surface unchanged).
- [ ] Relevant automated tests and repository checks pass (ideally a test asserts the rendered `dateTime` parses as a valid date).

## Handoff and retest log

- 2026-07-02 - Filed by User-simulator (seeker discover→commit→room pass); status `ready`. Live-confirmed the non-ISO `dateTime` on the feed and two detail pages as pooled seeker-B (single login, reused); deduped against active + archive (hierarchy, typography, and the unrelated `datetime-local` form-input tickets). Presentational/semantics only — no safety, privacy, authorization, or data-loss floor.
- 2026-07-02 - Implemented (Builder). Event times render inside `<time>` on the feed card (`apps/web/src/app/discover/page.tsx:216`, `.discovery-when`) and the shared-invitation detail (`apps/web/src/app/discover/events/[eventId]/page.tsx:49`, `.event-detail-when`); both call the shared `formatDiscoveryDate(startsAt, timeZone)` helper. Fixed at that seam: `formatDiscoveryDate` (`apps/web/src/lib/discovery-card.ts`) now also returns `machineDateTime`, and both `<time dateTime>` attrs use `when.machineDateTime` instead of the raw `event.startsAt`. The ISO instant is derived correctly with `new Date(startsAt).toISOString()` — the true UTC instant in `Z` form (e.g. `2026-07-05T16:00:00.000Z`), correct whether `startsAt` is an ISO string OR the Postgres driver's JS `Date` (whose `toString()` was the old non-ISO, server-tz-leaking value); this matches the RSC payload and the already-correct room-chat `<time>`. Visible day/time text is unchanged (still in the event's own `timeZone`); helper fails safe (empty attr) on an unparseable start. No layout/wording/hierarchy change, no migration, no new data/location exposure. Tests added in `apps/web/src/lib/discovery-card.test.ts` parse the rendered `machineDateTime` as a valid instant, assert it round-trips the correct time, drops the `GMT`/server-tz label, and leaves the visible text unchanged. Checks (apps/web): typecheck pass, lint pass (pre-existing warnings only), test 719 pass / 12 skip (incl ethical-guardrails green), production build pass. Commit `0073e46`, pushed to origin/main. Handing to Explorer for independent retest.
