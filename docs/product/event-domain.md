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
- the requester has the sport at an allowed experience level;
- the requester speaks the event language;
- the requester is not the host; and
- neither host nor requester has blocked the other.

Blocking resolves to a generic unavailable result. The product must not reveal who blocked whom. Age, skill, and language mismatch explanations need a UX review before they become member-facing; eligibility codes are server/domain facts, not finished rejection copy.

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

## Join decisions

Join requests begin pending. The host may accept or skip. The third skip currently becomes a decline. Acceptance must be atomic with capacity enforcement so two simultaneous decisions cannot overfill an event. Cancellation by requester or host must close precise-location access immediately where practical.

The implementation assigns accepted participants unique numbered seats bounded by event capacity. Pending and declined requesters never receive the private-location query path. A requester who cancels an accepted place loses that seat and precise-location access. A host cancellation closes active join requests, removes accepted seats, and revokes room access in the same product operation.

The first event room is a read-only coordination surface plus leave control for accepted participants. The host and currently accepted, unblocked participants can access exact logistics and a filtered participant list. Accepted participants can also cancel from the room itself, which immediately removes the seat and precise-location access. Pending, declined, cancelled, blocked, and unrelated accounts receive no room. Open messaging remains intentionally absent until block/report, moderation evidence, and response operations exist.

## Required failure and recovery states

- Event fills while a request is being submitted.
- Event time or venue changes after acceptance.
- Host cancels; participant cancels; weather or venue failure occurs.
- Request receives no response before a decision deadline.
- Accepted participant is blocked or removed.
- Exact location is changed after it was disclosed.
- Event completes with a no-show, safety concern, or report.

The current implementation lets a host edit a future draft or published event in place as long as the new capacity does not fall below already accepted seats. Each material edit creates an in-product room update entry visible to the host and accepted participants so time, venue, and arrival changes remain auditable inside the product. Accepted participants mark the newest update as seen when they open the room, and the host can see who has and has not opened that newest change. The preview still does not deliver out-of-product notifications, so hosts must not treat edits as if members were automatically informed outside Sport Date.

## Instrumentation

Record product events without precise coordinates or message contents:

- event draft created, published, updated, cancelled, completed;
- discovery impression by coarse area and eligibility outcome;
- join requested, accepted, skipped, declined, cancelled, expired;
- capacity at request and decision time;
- accepted attendance outcome and willingness-to-meet-again response;
- safety report category and response timing in the moderation system.

Analytics identifiers, retention, consent or lawful basis, and access controls require privacy review before production instrumentation.
