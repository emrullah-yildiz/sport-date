# Product flows

## Account creation

The private-beta signup collects an adult member's email, password, date of birth, name, approximate location, sports, short bio, and connection preference. The server repeats all validation, hashes the password, creates an opaque hashed session, and writes the account, sports, and session atomically.

Registration is development-only until the launch gates in `docs/security/authentication.md` are complete. Profiles remain non-public and email verification remains false at creation.

## Event discovery

Members will browse events by sport, experience, language, approximate location, and time. Public discovery must never include a precise meeting point.

## Join request

1. An eligible adult requests a place and may include a short introduction.
2. The host accepts or skips the request.
3. A third skip currently becomes a quiet decline for that event only; this is a reversible product assumption awaiting owner confirmation.
4. Accepted participants gain access to the event room and precise meeting instructions.
5. An accepted participant can later cancel from the browser event detail, browser room, or mobile event-day surface; that action removes the seat and precise-location access immediately.

## Safety

Blocking and reporting must be available from profiles, events, rooms, and messages. Messaging and private meeting details are restricted to accepted event participants. Moderation actions require an audit trail.
