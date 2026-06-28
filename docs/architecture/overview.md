# Architecture direction

The product uses separate web and Expo mobile applications with a shared TypeScript domain package. The current server foundation targets Neon PostgreSQL through server-only Next.js route handlers. Provider-specific access stays isolated under `apps/web/src/lib`.

The first slice will prove:

- profile and preference validation;
- event creation and discovery eligibility;
- join-request state transitions and the three-skip invariant;
- authorization boundaries between requester, host, moderator, and administrator;
- privacy-preserving location representation.

Provider-specific code must stay behind application service interfaces so authentication, storage, notifications, and moderation vendors remain replaceable.

Schema changes live as explicit SQL migrations under `apps/web/db`; application requests must not create or mutate schema. Authentication uses opaque database-backed sessions rather than browser-readable JWTs.
