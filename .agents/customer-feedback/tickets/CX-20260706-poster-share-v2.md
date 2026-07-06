# CX-20260706-poster-share-v2 — Story format, QR join link, platform buttons, hover download

**Priority:** P1 (owner report + direction, 2026-07-06) · **Status:** `implemented` (commit 2155201: canonical-origin fix + vercel-alias test, 9:16 story format, decode-verified QR, IG/WhatsApp/FB/TikTok/X share row, hover/touch download icon) · **Owner-gate:** none
Follow-up to CX-20260705-event-poster-share (shipped).

## Owner report / direction (verbatim intent)
1. **The link on the poster is WRONG** — it renders `sport-date-gray.vercel.app`
   instead of the brand domain. The poster/share must always use the canonical
   public origin (keepitup.social), never the request host or a vercel.app
   deployment alias.
2. The share button should also create an **Instagram Story post** (9:16) and a
   **QR code for the join link**.
3. There should be **Instagram, WhatsApp, Facebook, TikTok** buttons to post it
   on their account.
4. A **download symbol in the top-right corner of the poster image**, appearing
   **on mouse hover**.

## What to build
1. **Canonical origin everywhere** — poster link label, share URLs, and QR
   target derive from the configured canonical origin (`APP_PUBLIC_ORIGIN` /
   `NEXT_PUBLIC_APP_ORIGIN`), with the request host used ONLY if no canonical
   origin is configured. Add a test: request against a vercel.app host still
   renders/link-targets the canonical brand origin.
2. **Story variant** — `/e/{id}/poster?format=story` (or equivalent): 1080×1920
   9:16 layout of the same allowlisted content, tuned for IG/TikTok stories
   (bigger type, QR prominent). Keep the existing 1080×1350 post format.
3. **QR code** — on BOTH formats: a scannable QR encoding the public invite URL
   `{canonical}/e/{id}`, with a short label ("Scan to join"). Dependency: the
   `qrcode` npm package (pure JS, no native deps) or an equally lean choice;
   render into the ImageResponse (e.g. data-URI img). The QR encodes ONLY the
   public invite URL — nothing else.
4. **Platform share row** — buttons in this order: **Instagram, WhatsApp,
   Facebook, TikTok**, then copy-link + download. Behaviors:
   - WhatsApp: `wa.me/?text=` intent (existing helper).
   - Facebook: `https://www.facebook.com/sharer/sharer.php?u={inviteUrl}`.
   - Instagram / TikTok: no web prefill exists — honest flow: download the
     poster (story format), then deep-link/open the app; label the buttons so
     the two-step is clear. Native `navigator.share` with the file stays the
     primary path on mobile where available.
5. **Hover download control** — a download icon button overlaid top-right on
   the poster preview image; fades in on hover/focus-within on pointer devices,
   ALWAYS visible on touch devices (no hover there). Accessible (real button,
   aria-label, focus ring), 44px target.

## Hard rules (unchanged from v1)
- Poster/story/QR expose ONLY what the public invite already exposes; exact
  venue/address/coords/person can never reach any variant (extend the
  malicious-widening tests to the story format + QR URL).
- Published events only; 404 otherwise. OSM/brand rules unaffected.
- Full DoD: typecheck, lint, full web suite, prod build.

## Pointers
- `apps/web/src/app/e/[eventId]/poster/route.tsx`, `apps/web/src/lib/event-poster.ts`,
  `apps/web/src/lib/event-share.ts`, `apps/web/src/components/EventPosterShare.tsx`.
- Canonical origin: grep `APP_PUBLIC_ORIGIN` (used by email/auth links already).
- CONCURRENCY: another Builder is concurrently working on the location map
  picker (AddressAutocomplete / CreateEventForm / location proxy). Do NOT touch
  those files.
