# Mobile event-day experience

## Implemented interaction prototype

The Expo SDK 56 application now contains three one-handed surfaces:

- discovery cards with explicitly approximate areas;
- an ended-event reflection with large attendance and willingness choices; and
- a private Movement Arc using the exact shared domain calculation used by web.

The prototype is visibly labelled `INTERACTION PROTOTYPE · NOT SYNCED`. Its event and reflection state stay in memory and are not represented as a real account, real event, or persisted outcome. Android bundling verifies that Expo Metro resolves the shared workspace package.

## Experience intent

- Keep event-day actions reachable with one hand and readable outdoors.
- Put exact logistics, leaving, cancellation, and reporting ahead of progression.
- Make reflection optional, private, and clearly distinct from safety reporting.
- Use progression as a quiet record of movement, not a notification or points engine.
- Preserve the web rules: only qualified self-confirmed attendance advances the arc; no streaks, leaderboard, skip score, or screen-time reward.

## Implemented secure-session foundation

- Optional sign-in activates only when `EXPO_PUBLIC_API_URL` exists; non-HTTPS origins are refused outside explicit local development hosts.
- The server issues separate device-scoped opaque access and refresh credentials and never exposes browser cookies to native authorization.
- SecureStore holds the generated installation UUID and token pair with device-only accessibility.
- Access refresh is serialized and retried once; invalid or replayed refresh clears local state and requires sign-in.
- The app visibly distinguishes a secure signed-in session from still-unsynced demo event content.

## Implemented live private-beta data

- Signed-in discovery loads compatible events through native bearer authorization and displays only approximate area data.
- The event-day selector loads hosted and accepted events without exact addresses in the list.
- Opening one authorized event fetches its exact venue and address through the same server-side room authorization used by web. Leaving the tab clears the in-memory room object.
- Authorized room payloads now include recent host update history plus latest-update seen state so native event-day surfaces can show when time, venue, or arrival details changed, distinguish critical changes, and confirm when the participant opened the newest change. The newest critical update also carries the participant’s current recovery response and host-facing response counts.
- Finished events accept private native reflections through the shared server mutation and refresh the live Movement Arc.
- Loading, empty, expired-access, retryable network failure, room-access loss, and reflection-submit states have explicit UI.
- Live discovery can create a request through the same compatibility, time, capacity, and mutual-block query as web.
- Pending and accepted requests can be cancelled through the shared server mutation. Cancelling an accepted place requires destructive confirmation and immediately removes the seat and room access.
- Request conflicts refresh server state; declined or cancelled one-request-per-event states remain visibly closed rather than offering an impossible retry.

## Required live event integration

The native app must not reuse browser-cookie assumptions. Before replacing prototype state, implement and threat-model:

- logout, expiry, device loss, account deletion, and role/access revocation behavior;
- member-facing device-session review and remote revocation;
- production scheduling for expired native-session and spent-refresh-history cleanup;
- no precise-location caching outside the authorized event-room lifecycle;
- loading, offline, retry, stale-session, and partial-submit recovery;
- privacy export/deletion coverage identical to web.

## Implemented native safety and host parity

- Discovered hosts, pending requesters, the accepted-room host, and other room participants expose independently focusable safety controls.
- Immediate block requires confirmation and uses the shared server action to remove seats, cancel active requests, and revoke exact room access without identifying the blocker.
- Structured reports collect category and 20–2000 character facts, can block in the same audited transaction, and repeat the emergency-service limitation.
- Host rooms include critical-change recovery guidance plus a pending-first requester queue with web-equivalent accept/skip controls. Acceptance uses the atomic numbered-seat invariant; the third skip privately declines.
- Mutation conflicts refresh authoritative product and room data. Native controls do not use optimistic access or capacity state.

## Implemented device control

- Web profile security lists active, expired, and revoked mobile sessions with device label, last use, and expiry, and can revoke any active native session.
- Mobile identifies its current session, can remotely revoke other active devices, and directs current-device termination through sign-out.
- Neither surface receives token hashes, installation UUID hashes, access tokens, or refresh tokens.

Production app identifiers, signing, push credentials, store accounts, terms acceptance, and deployment require owner authorization.
