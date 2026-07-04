import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import InviteFriendButton from "./InviteFriendButton";

describe("InviteFriendButton", () => {
  it("renders a 44px-friendly, labelled invite action with honest privacy copy", () => {
    const html = renderToStaticMarkup(<InviteFriendButton eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" sport="Tennis" />);
    expect(html).toContain('aria-label="Invite a friend to this event"');
    expect(html).toContain("Invite a friend");
    // The idle status states the privacy posture — only the approximate area, never the exact spot.
    expect(html).toContain("approximate area");
    expect(html).toContain("never the exact spot");
    // A polite live region announces the result.
    expect(html).toMatch(/role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/);
  });

  it("carries no gamification — no counts, rewards, or leaderboard language", () => {
    const html = renderToStaticMarkup(<InviteFriendButton eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" />);
    expect(html.toLowerCase()).not.toMatch(/unlock|reward|leaderboard|points|streak|refer/);
  });
});
