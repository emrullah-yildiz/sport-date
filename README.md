# Sport Date

Sport Date is a Europe-first social product for meeting people through real-world sports. Members create profiles, publish sports events, discover compatible activities, and manage join requests safely.

This repository is a new product foundation. The working name is temporary until brand validation is complete.

## Product principles

- Safety before growth, especially for location, identity, messaging, and moderation.
- Adults only for the first release.
- Privacy-friendly defaults and data minimisation.
- Shared domain rules across web, iOS, and Android.
- No production deployment, paid advertising, or external publishing without owner approval.

## Repository shape

- `apps/web`: public site and web application
- `apps/mobile`: iOS and Android application
- `packages/domain`: shared product rules and validation
- `docs`: product, architecture, security, compliance, and go-to-market records

## Status

The web landing page and five-step private-beta signup are implemented. Shared registration, join-request, and location-privacy rules are tested. Authentication is not ready for external users; see `docs/security/authentication.md` for launch gates.
