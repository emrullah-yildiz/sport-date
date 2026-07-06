// CapCut-style one-tap share for the public event invite
// (CX-20260705-event-poster-share) — pure builders for the share text and the
// platform intent links, shared by the host page and the public invite page.
//
// PRIVACY: the share text is derived exclusively from the allowlisted
// `PublicEventInvite` via `describePublicInvite` — the same choke point as the
// public page, OG card, and poster — so no venue, address, coordinate, person,
// or host free text can appear in anything a member posts (asserted in
// event-share.test.ts). No dark patterns: the copy is honest (real places-left
// wording), invites rather than pressures, and names the privacy guarantee.
//
// Kept free of `server-only` / DB / React imports: the same functions run in the
// server components (to precompute text) and are unit-testable in node.

import { describePublicInvite, type PublicEventInvite } from "@/lib/public-event-invite";
import { sportEmoji } from "@/lib/sports";

/**
 * The friendly message members post alongside the poster/link, e.g.
 * "🎾 Tennis in Floreasca, Bucharest — Sun 5 Jul, 19:00. 3 places left. Come play?"
 * Structured, discovery-safe facts only.
 */
export function buildEventShareText(invite: PublicEventInvite, now: Date = new Date()): string {
  const described = describePublicInvite(invite, now);
  const when = described.when.day && described.when.time ? ` — ${described.when.day}, ${described.when.time}` : "";
  return `${sportEmoji(invite.sport)} ${described.headline}${when}. ${described.availability.label}. Come play?`;
}

/** Web intent links for platforms that accept a prefilled link/text (Instagram
 * and TikTok have no web prefill — the flow there is download-story + post from
 * the app, handled in EventPosterShare). */
export type EventShareIntentLinks = Readonly<{
  whatsapp: string;
  facebook: string;
  x: string;
}>;

/**
 * Build the platform intent URLs for a share `text` + invite `url`.
 * Everything is URL-encoded; the invite link rides inside each intent so the
 * receiving app previews the rich OG card.
 */
export function buildEventShareIntentLinks(url: string, text: string): EventShareIntentLinks {
  return {
    // wa.me only accepts a single text parameter; the link goes on its own line.
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    // Facebook's sharer takes only the URL — the OG card supplies the preview.
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  };
}
