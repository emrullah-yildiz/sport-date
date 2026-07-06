import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EventPosterShare from "./EventPosterShare";

// The CapCut-style share control (CX-20260705-event-poster-share, extended by
// CX-20260706-poster-share-v2). Rendered with renderToStaticMarkup (no DOM
// needed — same harness as global-error.test.tsx): we assert the fallback
// surface every browser gets — poster preview with its overlay download icon
// (the ONLY download control), the platform row in the owner-specified order,
// copy-link — plus honest, privacy-forward copy. The native share-sheet and
// story-download branches are behaviour-only (navigator.share / anchor click)
// and exercised manually.

const INVITE_PATH = "/e/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const POSTER_PATH = `${INVITE_PATH}/poster`;
const URL_ABS = `https://keepitup.social${INVITE_PATH}`;
const TEXT = "🎾 Tennis in Floreasca, Bucharest — Fri 10 Jul, 19:00. 3 places left. Come play?";

function render(over: Partial<Parameters<typeof EventPosterShare>[0]> = {}) {
  return renderToStaticMarkup(
    <EventPosterShare
      invitePath={INVITE_PATH}
      posterPath={POSTER_PATH}
      shareTitle="Tennis in Floreasca, Bucharest"
      shareText={TEXT}
      posterAlt="Event poster: Tennis in Floreasca, Bucharest"
      absoluteInviteUrl={URL_ABS}
      {...over}
    />,
  );
}

describe("EventPosterShare", () => {
  it("offers the primary Share action and the copy-link fallback", () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*>Share<\/button>/);
    expect(html).toMatch(/<button[^>]*>Copy link<\/button>/);
  });

  it("shows the poster preview linking to the full-size image", () => {
    const html = render();
    expect(html).toContain(`<img src="${POSTER_PATH}"`);
    expect(html).toContain("Event poster: Tennis in Floreasca, Bucharest");
    expect(html).toContain(`href="${POSTER_PATH}"`);
    expect(render({ showPreview: false })).not.toContain("<img");
  });

  it("overlays the ONLY download control on the poster preview — a 44px labelled icon (owner direction 2026-07-06)", () => {
    const html = render();
    // The icon anchor: attachment URL + download hint + accessible name.
    expect(html).toContain('class="event-poster-share-download-icon"');
    expect(html).toContain(`href="${POSTER_PATH}?download=1"`);
    expect(html).toContain('download="keepitup-event-poster.png"');
    expect(html).toContain('aria-label="Download the event poster image"');
    // No standalone download button/link anywhere else.
    expect(html).not.toContain("Download poster");
    expect(html.match(/\?download=1/g)).toHaveLength(1);
    // Without the preview there is no download control at all — by design.
    const noPreview = render({ showPreview: false });
    expect(noPreview).not.toContain("event-poster-share-download-icon");
    expect(noPreview).not.toContain("?download=1");
  });

  it("renders the platform row in the owner-specified order: Instagram, WhatsApp, Facebook, TikTok, X, copy-link", () => {
    const html = render();
    const order = [">Instagram<", ">WhatsApp<", ">Facebook<", ">TikTok<", ">X<", ">Copy link<"].map((label) =>
      html.indexOf(label),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // No standalone download button in the row (the on-poster icon is the only
    // download control), and Telegram is gone from the surface.
    expect(html).not.toContain(">Download");
    expect(html).not.toContain("Telegram");
  });

  it("renders WhatsApp / Facebook / X intent links with the encoded text + invite URL", () => {
    const html = render();
    expect(html).toContain("https://wa.me/?text=");
    expect(html).toContain("https://www.facebook.com/sharer/sharer.php?u=");
    expect(html).toContain("https://x.com/intent/post?text=");
    // The absolute invite URL rides inside each intent, fully encoded. In HTML
    // attributes the URL-encoded "%2F" appears literally.
    expect(html).toContain(encodeURIComponent(URL_ABS));
    // New windows never get an opener back into the app.
    expect(html).toMatch(/rel="noopener noreferrer"/);
  });

  it("labels Instagram and TikTok honestly as the story-then-app two-step (no fake web posting)", () => {
    const html = render();
    expect(html).toContain('aria-label="Instagram: get the story-size poster, then post it from the Instagram app"');
    expect(html).toContain('aria-label="TikTok: get the story-size poster, then post it from the TikTok app"');
  });

  it("waits for the browser origin when no absolute URL is configured (no half-built intents)", () => {
    const html = render({ absoluteInviteUrl: null });
    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("facebook.com");
    expect(html).not.toContain("x.com/intent");
    // The origin-independent controls are still there: Instagram/TikTok
    // (download flows), copy, and the on-poster download icon.
    expect(html).toContain(">Instagram<");
    expect(html).toContain(">TikTok<");
    expect(html).toMatch(/<button[^>]*>Copy link<\/button>/);
    expect(html).toContain(`href="${POSTER_PATH}?download=1"`);
  });

  it("states the privacy guarantee and the honest Instagram/TikTok flow, with a polite live status", () => {
    const html = render();
    expect(html).toContain("approximate area only");
    expect(html).toContain("Instagram and TikTok have no web posting");
    expect(html).toMatch(/role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/);
    // No pressure mechanics anywhere in the control's copy.
    expect(html).not.toMatch(/hurry|act now|reward|points|leaderboard/i);
  });
});
