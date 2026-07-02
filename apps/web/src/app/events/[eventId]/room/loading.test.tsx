import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// PrimaryNav pulls in AccountMenu (a client component) and server-only guards; the
// loading shell only needs the nav chrome to render, so stub the same boundaries the
// room page test stubs.
vi.mock("server-only", () => ({}));

import EventRoomLoading from "./loading";

describe("EventRoomLoading", () => {
  const html = renderToStaticMarkup(<EventRoomLoading />);

  it("announces the loading state to assistive tech via role=status", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading your room.");
    // The visible announcement must be visually-hidden, not a jarring block of text.
    expect(html).toMatch(/class="visually-hidden"[^>]*role="status"/);
  });

  it("renders a calm loading heading and skeleton placeholders, not member data", () => {
    expect(html).toContain("Getting your room ready");
    // Skeleton bars present for both the meeting-point and people panels.
    expect(html).toContain("room-skeleton-panel");
    expect(html).toContain("room-skeleton-chip");
    // Honestly a placeholder: no venue, address, or participant data is fabricated.
    expect(html).not.toContain("venue");
  });

  it("marks the decorative skeleton grid aria-hidden so it is not read as content", () => {
    expect(html).toMatch(/class="room-grid"[^>]*aria-hidden="true"/);
  });
});
