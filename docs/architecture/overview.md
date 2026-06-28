# Architecture direction

The product uses separate web and Expo mobile applications with a shared TypeScript domain package. A managed PostgreSQL backend with row-level authorization is the preferred starting point; the final provider decision follows the first vertical slice.

The first slice will prove:

- profile and preference validation;
- event creation and discovery eligibility;
- join-request state transitions and the three-skip invariant;
- authorization boundaries between requester, host, moderator, and administrator;
- privacy-preserving location representation.

Provider-specific code must stay behind application service interfaces so authentication, storage, notifications, and moderation vendors remain replaceable.

