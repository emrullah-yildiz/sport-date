// The shareable event POSTER (`/e/{id}/poster` — CX-20260705-event-poster-share):
// pure derivations for the 1080×1350 PNG a host shares to Instagram/WhatsApp/X.
//
// PRIVACY IS THE CONTROLLING CONSTRAINT, exactly as on the public invite page.
// The poster is a downloadable, re-postable IMAGE of the most scrapeable surface
// in the product, so it renders strictly and only strings derived from
// `PublicEventInvite` via `describePublicInvite` — sport (+ emoji), the derived
// headline, approximate area, date/time, duration, honest places-left, and the
// brand link. By construction it can never carry:
//   - the exact venue / address / postal code / any coordinate (the payload type
//     cannot hold them — see public-event-invite.ts);
//   - host-authored free text (title/description/instructions — a venue can hide
//     inside them; the headline is derived from structured fields instead);
//   - any person: no host name (not even a first name), no participants, no
//     photos. The public invite deliberately exposes no person, and the poster
//     shows ONLY what the public invite already exposes.
//
// `eventPosterViewFromInvite` is the single choke point that turns the public
// payload into the poster's render model: it emits an explicit allowlist of
// display strings and never spreads its input, so even a maliciously widened
// invite object cannot leak extra fields onto the image (asserted in
// event-poster.test.ts).
//
// Kept free of `server-only` / DB / React imports so the whole poster wording
// surface is unit-testable in the node test environment (same pattern as
// public-event-invite.ts).

import { clampPublicText, describePublicInvite, type PublicEventInvite } from "@/lib/public-event-invite";
import { sportEmoji } from "@/lib/sports";

/** Portrait social-post size (Instagram/WhatsApp-friendly 4:5). */
export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1350;

/** Instagram/TikTok story size (9:16) — CX-20260706-poster-share-v2. */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/** Download filenames — deliberately generic: no event id, area, or person in them. */
export const POSTER_FILE_NAME = "keepitup-event-poster.png";
export const STORY_FILE_NAME = "keepitup-event-story.png";

/** The two poster variants: the 4:5 feed post and the 9:16 story. */
export type EventPosterFormat = "post" | "story";

/** `?format=story` → "story"; anything else (missing, junk) → the 4:5 default. */
export function posterFormatFromParam(value: string | null): EventPosterFormat {
  return value === "story" ? "story" : "post";
}

export function posterDimensions(format: EventPosterFormat): { width: number; height: number } {
  return format === "story" ? { width: STORY_WIDTH, height: STORY_HEIGHT } : { width: POSTER_WIDTH, height: POSTER_HEIGHT };
}

export function posterFileName(format: EventPosterFormat): string {
  return format === "story" ? STORY_FILE_NAME : POSTER_FILE_NAME;
}

/**
 * Fallback link label when no public origin is configured (e.g. local dev).
 * Matches the brand's public host used across the social composites
 * (`docs/marketing/social/render-batch.mjs`) and `SUPPORT_EMAIL`.
 */
export const POSTER_FALLBACK_LINK_LABEL = "keepitup.social";

/** The complete poster render model. Nothing outside this type reaches the image. */
export type EventPosterView = Readonly<{
  /** Sport emoji from the shared preset list (default glyph for custom sports). */
  emoji: string;
  /** "TENNIS · BEGINNER / INTERMEDIATE" — structured fields only. */
  eyebrow: string;
  /** Derived headline, e.g. "Tennis in Floreasca, Bucharest" — never host free text. */
  headline: string;
  /** "Sun 5 Jul · 19:00" in the event's own timezone ("" when unparseable). */
  whenLine: string;
  /** "90 min". */
  durationLine: string;
  /** Honest places-left, same wording as discovery — no fake scarcity. */
  availabilityLine: string;
  /** The privacy guarantee, stated on the poster itself. */
  privacyLine: string;
  /** Brand link label, e.g. "keepitup.social" — host only, never a full event URL. */
  linkLabel: string;
  /**
   * The public invite URL, `{canonical origin}/e/{id}` — the ONLY thing the QR
   * code encodes. The event id is already public (it IS the invite link).
   */
  inviteUrl: string;
  /** Accessible description of the poster for previews/downloads. */
  alt: string;
}>;

/** "https://keepitup.social" → "keepitup.social"; unusable origins → fallback. */
export function posterLinkLabel(origin: string | null): string {
  if (!origin) return POSTER_FALLBACK_LINK_LABEL;
  try {
    return new URL(origin).host || POSTER_FALLBACK_LINK_LABEL;
  } catch {
    return POSTER_FALLBACK_LINK_LABEL;
  }
}

/**
 * The public invite URL the QR code encodes — `{origin}/e/{id}` and NOTHING
 * else (no query, no tracking, no extra path). `origin` must already be the
 * canonical configured origin (request host only as the caller's last resort);
 * an unusable/missing origin falls back to the brand host so a broken config
 * can never put a deployment alias inside a printed QR.
 */
export function posterInviteUrl(origin: string | null, eventId: string): string {
  const base = (() => {
    if (origin) {
      try {
        const url = new URL(origin);
        if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
      } catch {
        // fall through to the brand fallback
      }
    }
    return `https://${POSTER_FALLBACK_LINK_LABEL}`;
  })();
  return `${base}/e/${eventId}`;
}

/**
 * The single invite → poster choke point. Every string is derived from the
 * allowlisted `PublicEventInvite` through the same helpers the public page and
 * OG card use, and each free-length string is clamped so an unusually long area
 * label cannot blow the fixed 1080×1350 layout.
 */
export function eventPosterViewFromInvite(
  invite: PublicEventInvite,
  origin: string | null,
  now: Date = new Date(),
): EventPosterView {
  const described = describePublicInvite(invite, now);
  const whenLine = described.when.day && described.when.time ? `${described.when.day} · ${described.when.time}` : "";
  const headline = clampPublicText(described.headline, 64);
  return {
    emoji: sportEmoji(invite.sport),
    eyebrow: clampPublicText(`${invite.sport} · ${described.levels}`, 48).toUpperCase(),
    headline,
    whenLine,
    durationLine: `${invite.durationMinutes} min`,
    availabilityLine: described.availability.label,
    privacyLine: "Approximate area only — the exact meeting point is shared after the host accepts.",
    linkLabel: posterLinkLabel(origin),
    inviteUrl: posterInviteUrl(origin, invite.id),
    alt: `${headline}${whenLine ? ` — ${whenLine}` : ""}. ${described.availability.label}. Event poster with the approximate area only; the exact meeting point stays private until the host accepts.`,
  };
}
