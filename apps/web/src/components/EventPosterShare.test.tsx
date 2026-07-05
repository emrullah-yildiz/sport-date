import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EventPosterShare from "./EventPosterShare";

// The CapCut-style share control (CX-20260705-event-poster-share). Rendered with
// renderToStaticMarkup (no DOM needed — same harness as global-error.test.tsx):
// we assert the fallback surface every browser gets — poster preview, download,
// copy, platform intents — plus honest, privacy-forward copy. The native
// share-sheet branch is behaviour-only (navigator.share) and exercised manually.

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
  it("offers the primary Share action plus download-poster and copy-link fallbacks", () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*>Share<\/button>/);
    expect(html).toContain(`href="${POSTER_PATH}?download=1"`);
    expect(html).toContain('download="keepitup-event-poster.png"');
    expect(html).toMatch(/<button[^>]*>Copy link<\/button>/);
  });

  it("shows the poster preview linking to the full-size image", () => {
    const html = render();
    expect(html).toContain(`<img src="${POSTER_PATH}"`);
    expect(html).toContain("Event poster: Tennis in Floreasca, Bucharest");
    expect(html).toContain(`href="${POSTER_PATH}"`);
    expect(render({ showPreview: false })).not.toContain("<img");
  });

  it("renders WhatsApp / Telegram / X intent links with the encoded text + invite URL", () => {
    const html = render();
    expect(html).toContain("https://wa.me/?text=");
    expect(html).toContain("https://t.me/share/url?url=");
    expect(html).toContain("https://x.com/intent/post?text=");
    // The absolute invite URL rides inside each intent, fully encoded. In HTML
    // attributes the URL-encoded "%2F" appears literally.
    expect(html).toContain(encodeURIComponent(URL_ABS));
    // New windows never get an opener back into the app.
    expect(html).toMatch(/rel="noopener noreferrer"/);
  });

  it("waits for the browser origin when no absolute URL is configured (no half-built intents)", () => {
    const html = render({ absoluteInviteUrl: null });
    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("t.me");
    expect(html).not.toContain("x.com/intent");
    // The download + copy fallbacks are still there.
    expect(html).toContain(`href="${POSTER_PATH}?download=1"`);
  });

  it("states the privacy guarantee and the honest Instagram flow, with a polite live status", () => {
    const html = render();
    expect(html).toContain("approximate area only");
    expect(html).toContain("Instagram: download the poster, then post it from the app");
    expect(html).toMatch(/role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/);
    // No pressure mechanics anywhere in the control's copy.
    expect(html).not.toMatch(/hurry|act now|reward|points|leaderboard/i);
  });
});
