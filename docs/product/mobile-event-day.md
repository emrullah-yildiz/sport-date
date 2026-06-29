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

## Required live integration

The native app must not reuse browser-cookie assumptions. Before replacing prototype state, implement and threat-model:

- a mobile session exchange with revocable, rotated, device-scoped credentials;
- storage in an approved native secure-storage mechanism, never plain async storage;
- an environment-specific HTTPS API origin with no production secret in `EXPO_PUBLIC_*` values;
- logout, expiry, device loss, account deletion, and role/access revocation behavior;
- CSRF/origin differences between browser and native authenticated mutations;
- no precise-location caching outside the authorized event-room lifecycle;
- loading, offline, retry, stale-session, and partial-submit recovery;
- privacy export/deletion coverage identical to web.

Production app identifiers, signing, push credentials, store accounts, terms acceptance, and deployment require owner authorization.

