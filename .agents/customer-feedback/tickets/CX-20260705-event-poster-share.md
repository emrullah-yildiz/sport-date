# CX-20260705-event-poster-share — Event poster image + one-tap social share

**Priority:** P1 (growth surface) · **Status:** `implemented` (commit 31b586b; extended by CX-20260706-poster-share-v2) · **Owner-gate:** none
**Filed by:** CEO on owner direction (2026-07-05): "when people organize an event,
create a poster image about the event with the activity and make it possible for
users to click on share and post it on social media platforms like it happens in
CapCut and Meta Edit."

## Why
Every hosted event should market itself. Hosts already organize games; a
beautiful auto-generated poster + native share sheet turns each event into
organic reach (the CapCut/Meta-style "share to socials" flow). Builds on the
existing public invite link `/e/{id}` and its OG share-card.

## What to build
1. **Poster image endpoint** — `GET /e/{id}/poster` (or `/api/events/{id}/poster`):
   a server-rendered 1080×1350 PNG (sharp is already a dependency) for any
   **published** event: sport/activity (emoji + name), event title, weekday +
   date + time, **approximate area only**, spots info, host first name, brand
   mark + QR or short link to `/e/{id}`. On-brand (anthracite/neon-green system).
2. **Share control on the event page + public invite page** — a "Share" button:
   - `navigator.share({ files: [poster.png], url, text })` where supported
     (mobile: opens the native sheet → Instagram/WhatsApp/TikTok/etc.).
   - Fallback: download-poster button + copy-link + platform intent links
     (WhatsApp `wa.me/?text=`, Telegram, X intent). Instagram has no web
     prefill — download + open flow, like CapCut does.
3. **Host nudge** — after publishing an event, show the poster preview with the
   share button ("Your event, ready to share").

## Hard rules (do not violate)
- **Privacy:** the poster shows ONLY what the public invite already exposes —
  approximate area, never the exact venue/address/pin; no member photos; host
  first name only.
- Only **published** events get posters; unpublished/cancelled → 404, no leak.
- No dark patterns; share is optional, never forced or incentivized deceptively.
- Full DoD: typecheck, lint, full web test suite, prod build; tests for the
  privacy boundary (exact location can never appear in poster payload or URL).

## Pointers
- Public invite: `/e/{id}` route + its OG-card generation (reuse layout/data).
- Image compositing precedent: `apps/web/public/brand/social/photos/` composites
  were baked with sharp (SVG overlay → composite → PNG).
- Sports emoji/preset list: `apps/web/src/lib/sports.ts`.
- Approximate-area logic: `apps/web/src/lib/approximate-location.ts`.
