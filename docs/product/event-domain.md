# Event domain

## Product intent

An event is a small, time-bound invitation to meet through one sport. It must communicate enough for a cautious adult to decide whether to request a place while withholding details that could enable stalking, scraping, or unauthorized attendance.

## Lifecycle

- `draft`: visible only to the host and not eligible for requests.
- `published`: discoverable to eligible members and open while capacity and time allow.
- `cancelled`: unavailable; accepted participants must eventually receive an operational notification and clear recovery options.
- `completed`: the scheduled end has passed and the event is closed to new requests.

Capacity fullness is derived from accepted participants rather than stored as a competing status. Publishing requires a future start, duration between 15 minutes and 8 hours, capacity between 2 and 20, at least one experience level, one event language, an adult age range, an approximate area, and private meeting details.

Submitting an eligible post-event reflection transitions a past published event to `completed`. The host qualifies for reflection only when at least one accepted participant exists; accepted participants qualify through their server-side seat. Reflection never opens before the scheduled duration ends.

## Eligibility

A request is eligible only when:

- the event is published and has not started;
- accepted participation remains below capacity;
- the requester is an adult and inside the host's adult age range;
- the requester speaks the event language;
- the requester is not the host; and
- neither host nor requester has blocked the other.

**Discovery is NOT gated by the viewer's profile sports** (owner directive 2026-07-04, CX-20260704-discovery-not-gated-by-profile-sport). A member sees — and can request — every otherwise-eligible local event regardless of whether that sport (or a compatible skill) is in their profile; the previous mandatory `user_sports` JOIN silently hid most events from most members and killed discovery/liquidity. Sport is now only an **explicit** discovery filter (type a sport to narrow to it; blank = all sports). The feed (`getDiscoverableEvents`) and the join gate (`createEventJoinRequest`) drop that JOIN in lockstep, so a member is never shown an event they would then be barred from requesting. `memberSkillMatchesEvent` remains a pure helper for optional informational hints only — never a visibility/join gate. All other gates above are unchanged, and the host still accepts or skips each request.

Blocking resolves to a generic unavailable result. The product must not reveal who blocked whom. Age and language mismatch explanations need a UX review before they become member-facing; eligibility codes are server/domain facts, not finished rejection copy.

## Location authorization

Discovery, pending requests, rejected requests, and unrelated members receive only:

- city and country;
- human-readable area label;
- deliberately approximate coordinates.

The exact venue, address, coordinates, and arrival instructions are available only to:

- the host of that event;
- accepted participants in that event; or
- a moderator with an explicit sensitive-location permission and an audited purpose.

Authorization must be derived server-side from the event and participation records. A client-supplied role or participation string is never sufficient.

### Structured precise address + directions (CX-20260704)

Event creation requires a **structured precise meeting location**: venue name, street & number (`address`), city (the public city), and **postal code** (`event_private_locations.postal_code`, migration 037) — all mandatory and validated non-empty on create/edit (`validateEventPostalCode`). The venue/address/postal code plus the precise coordinates stay in `event_private_locations` and are **private in discovery** — they never appear in the discover feed, the public `/e/{id}` invite, OG images, or notifications (the public reads select an explicit allowlist that never joins the private table; a query-level test asserts `postal_code`/`precise_`/`address` are absent). They unlock ONLY post-acceptance, to the host and accepted attendees, who additionally get a **keyless "Get directions" link** (`buildDirectionsUrl` → `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`, or the url-encoded full address when coordinates are absent). The link is a plain anchor the member taps themselves — no third-party map is embedded, so no location is sent to a vendor pre-acceptance. The shared `AcceptedMeetingPoint` component renders this on the three accepted surfaces (discover accepted view, event room, host event page).

### Address autocomplete + geocoding (CX-20260704)

The host enters the meeting address like an Uber destination: as they type (debounced ~350 ms), a live suggestions list of real places appears; selecting one fills the structured address **and** captures accurate `precise_latitude/precise_longitude`, so the post-acceptance "Get directions" link is exact instead of relying on free text. The combobox is keyboard-navigable (Arrow keys move an `aria-activedescendant` highlight, Enter selects, Escape closes) with 44px touch targets.

**Provider is pluggable and keyless-by-default.** Suggestions are fetched server-side through `/api/locations/search` (auth-required, rate-limited per user + IP), which proxies **Photon (Komoot)** — an OpenStreetMap-based geocoder that needs **no API key**. The provider base URL is env-configurable via `LOCATION_SEARCH_BASE_URL` (default `https://photon.komoot.io`) so it can be repointed at a **self-hosted Photon/Nominatim** instance if call volume grows and their public usage policy warrants it. A paid provider (Google Places / Mapbox) is an *optional owner-gated upgrade* if a key is ever provisioned — it is **never hard-required**. Requests are debounced, minimal, and carry a descriptive `User-Agent`; the response is data-minimized in `parsePhotonSuggestions` (only the address fields + valid in-range coordinates are projected — no phone/opening-hours/etc.).

**Privacy is unchanged.** Autocomplete geocodes only the *host-typed event address* — a member's own device location is never sent to the vendor. The precise venue/address/postal code/coordinates stay in `event_private_locations`, private in discovery (query-level tests assert they never appear in the discover feed, the public `/e/{id}` invite, or OG images) and unlock only post-acceptance.

**Graceful fallback (no-provider path).** The pin is *optional* server-side (`validateOptionalPinnedEventLocation`): if the geocoder is unavailable — or the host simply types the address by hand — creation/edit is **not blocked**. Coordinates persist as `NULL` and the directions link falls back to the url-encoded full address; a supplied-but-malformed/out-of-range pin is still rejected rather than stored. The form shows an inline hint that manual entry is fine and a pin can be added later by editing once search is back.

**Capacity is joiner spots only** — the host is already in and does not consume a place. The label reads "Places for others" with the hint "You're already in as host — this is how many others can join, not counting you" on the create form, the edit form, and the event detail; the underlying `capacity` behaviour is unchanged.

## No sexual-intent events (product policy)

KeepItUp is for dating, friendship, or community **through a real shared activity** — it is not a hookup app (owner directive 2026-07-04, CX-20260704-policy-no-sexual-intent-events). Events must not be organised for sexual purposes, and no event, profile, or event-room chat may be used for sexual solicitation. Dating here means meeting a romantic partner — a real connection, not arranging sex; wanting romance is fully welcome, a sexual-encounter listing is not. This is enforced through **guidelines + reporting + moderation**, never surveillance of private messages:

- The member intention options remain dating / friendship / community (`SEEKING_OPTIONS` = `dating` / `friendship` / `group`) — there is deliberately **no** sexual/hookup option, and the copy clarifies dating ≠ sexual encounter.
- The hosting standards (`/hosting#standards`) and safety guidelines (`/safety#guidelines`) state the standard plainly, and event creation shows a short reminder at the point of creation.
- Members can report an event or profile with the **`sexual_intent`** reason ("Sexual or inappropriate intent"), which routes into the same moderation queue as any other report (urgent priority) so a moderator can hide/remove the event or act on the member.

## Join decisions

Join requests begin pending. The host may accept or skip. The third skip currently becomes a decline. Acceptance must be atomic with capacity enforcement so two simultaneous decisions cannot overfill an event. Cancellation by requester or host must close precise-location access immediately where practical.

The implementation assigns accepted participants unique numbered seats bounded by event capacity. Pending and declined requesters never receive the private-location query path. A requester who cancels an accepted place loses that seat and precise-location access. A host cancellation closes active join requests, removes accepted seats, and revokes room access in the same product operation.

The first event room is a coordination surface plus leave control for accepted participants. The host and currently accepted, unblocked participants can access exact logistics and a filtered participant list. Accepted participants can also cancel from the room itself, which immediately removes the seat and precise-location access. Pending, declined, cancelled, blocked, and unrelated accounts receive no room.

### Event group chat

Every event has a private group chat scoped to the host and its `accepted` participants (`event_messages` table: `id`, `event_id`, `sender_user_id`, `body`, `created_at`, `deleted_at`; indexed on `(event_id, created_at)`). Access is enforced **server-side on every read and every write** by the same host-or-accepted rule as the room (mirrored in `packages/domain` `canAccessEventChat` and the SQL guard in `lib/event-messages.ts`): pending, declined, cancelled, removed, and unrelated accounts get a 403 with no message content, and a mutual block hides a blocked pair's messages from each other in both directions. Delivery is calm polling (a periodic full re-read of the visible window, so soft-deletes and new blocks are reflected correctly — no websocket dependency). Posting is rate-limited per member and per IP; no IP is stored in a message row. Each message is reportable through the existing safety/moderation queue, block reuses the existing block, and leaving or being removed from the event revokes chat access with the seat. A member may **soft-delete their own** message (`deleted_at` set; the body is never sent to clients afterwards and a calm "Message deleted" tombstone renders in its place) — there is no edit or delete-for-everyone in v1; reporting is the path for someone else's message. The chat never renders the exact/private venue as system text.

Broader open one-to-one messaging outside an event's accepted group remains intentionally absent until block/report, moderation evidence, and response operations cover it.

### T-2h attendance confirmation

Accepted attendees are asked to confirm or release their place in the ~2 hours before an event starts (CX-20260704-feature-event-attendance-confirmation). One `event_attendance_confirmations` row per `(event_id, member_id)` (`UNIQUE`) holds `status` (`pending` | `confirmed` | `cancelled`), a token **hash** (never the raw token), `reminded_at`, and `responded_at`.

- **Scheduler.** A Vercel Cron (`vercel.json`) hits the internal route `/api/internal/attendance-reminders` every 15 minutes (`*/15 * * * *`); it is authorised by the shared `CRON_SECRET` bearer and fails closed when the secret is absent. The sweep is idempotent: for each published event starting within the next 2h, it creates a `pending` confirmation + token for every accepted attendee that has none yet (`ON CONFLICT (event_id, member_id) DO NOTHING`), so overlapping runs never double-remind. Every-15-min cron requires a Vercel plan that permits sub-daily crons.
- **Tokens.** Each confirmation has a single 32-byte URL-safe token; only its SHA-256 hash is stored. The raw token travels in the email link and maps to exactly one membership's row, so a link reaching the wrong inbox can at worst let that person act on that one membership — never enumerate or read another member's data. Tokens expire exactly at event start. The public, no-login routes are `/e/{id}/confirm?t=…` and `/e/{id}/cancel?t=…` (read-only page render on GET; the mutation is a POST to `/api/attendance`, so an email scanner's prefetch cannot act). Confirm → `confirmed`; cancel → `cancelled`, which **releases the seat** (deletes the `event_participants` row so spots-left increments, cancels the join request, and the host's breakdown updates). A released place is reversible only by re-requesting.
- **In-app.** Within the window the event room shows the accepted member a "Still coming?" confirm/cancel prompt (authenticated `/api/events/{id}/attendance`), and the host page shows a confirmed/pending/cancelled breakdown (counts only, no attendee identities). No punitive surprise: a non-response stays `pending` and is never auto-cancelled.
- **Email is built DARK.** The reminder email is composed (event, time, approximate area only, Approve/Cancel links, `support@keepitup.social`) and dispatched through a gate that mirrors the auth-email / photo-storage fail-closed pattern: unless `EMAIL_DELIVERY_ENABLED === "true"` with a configured provider, delivery is a logged no-op — **no real mail leaves** — while confirmations, tokens, and the in-app flow all still function. Real delivery requires the owner to provision an ESP and flip the flag; the confirm/cancel links show the approximate area only, so a misdirected email never exposes the exact venue.

## Required failure and recovery states

- Event fills while a request is being submitted.
- Event time or venue changes after acceptance.
- Host cancels; participant cancels; weather or venue failure occurs.
- Request receives no response before a decision deadline.
- Accepted participant is blocked or removed.
- Exact location is changed after it was disclosed.
- Event completes with a no-show, safety concern, or report.

The current implementation lets a host edit a future draft or published event in place as long as the new capacity does not fall below already accepted seats. Each material edit creates an in-product room update entry visible to the host and accepted participants so time, venue, and arrival changes remain auditable inside the product. Changes to time, duration, area, venue, or arrival logistics are classified as critical inside the room. Accepted participants mark the newest update as seen when they open the room, and the host can see who has and has not opened that newest change. For the newest critical update, accepted participants can also answer whether they are still in, unsure, or can no longer make it, giving the host an immediate recovery signal without cancelling their place automatically. The host event page now turns those responses into concrete recovery guidance, groups join requests with pending decisions first, and points the host back toward already-pending requests before any broader rewrite of the invitation. The preview still does not deliver out-of-product notifications, so hosts must not treat edits as if members were automatically informed outside Sport Date.

## Instrumentation

Record product events without precise coordinates or message contents:

- event draft created, published, updated, cancelled, completed;
- discovery impression by coarse area and eligibility outcome;
- join requested, accepted, skipped, declined, cancelled, expired;
- capacity at request and decision time;
- accepted attendance outcome and willingness-to-meet-again response;
- safety report category and response timing in the moderation system.

Analytics identifiers, retention, consent or lawful basis, and access controls require privacy review before production instrumentation.
