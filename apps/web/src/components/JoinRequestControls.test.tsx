import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// next/navigation's useRouter is only reached for its refresh() on an in-place
// resolution, which renderToStaticMarkup never triggers; stub it so the server
// render (the pass this test exercises) runs outside an app-router context.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import JoinRequestControls from "./JoinRequestControls";

/**
 * Tripwire for CX-20260702-join-controls-reduced-motion-hydration-mismatch.
 *
 * A framer-motion `motion.div` serializes its resolved inline style differently
 * on the server vs the client (the server emits `transform:none` that the
 * client's post-mount render omits), which React "won't patch up" — a hydration
 * mismatch on the `.join-request-box`. The fix gates the motion wrapper behind a
 * `mounted` flag (useSyncExternalStore, server snapshot = false), so the server
 * render — the pass renderToStaticMarkup exercises here — emits a PLAIN `<div>`
 * with no motion-injected inline `opacity` / `transform` style. The first client
 * render (also pre-mount) produces the same plain markup, so SSR and hydration
 * agree in every motion setting. This test fails the build if a motion wrapper
 * (its telltale inline transform/opacity style) re-enters the server render.
 */

function serverHtml(request: Parameters<typeof JoinRequestControls>[0]["request"]) {
  return renderToStaticMarkup(<JoinRequestControls eventId="evt-1" request={request} />);
}

describe("JoinRequestControls server render (hydration parity)", () => {
  it("renders the join form as a plain box with no motion-injected inline style", () => {
    const html = serverHtml(null);
    // The default join box is present as static, hydration-safe markup...
    expect(html).toContain('class="join-request-box"');
    // ...with no framer-motion inline style that would differ from the client's
    // pre-mount render (the exact `transform:none` / `opacity` mismatch reported).
    expect(html).not.toMatch(/style="[^"]*transform/i);
    expect(html).not.toMatch(/style="[^"]*opacity/i);
    // The join affordance itself still renders on the server (no-JS friendly).
    expect(html).toContain("Request a place");
  });

  it("renders a resolved (pending) panel with no motion-injected inline style", () => {
    const html = serverHtml({ id: "req-1", status: "pending", skipCount: 0 });
    expect(html).toContain("Your request is with the host.");
    expect(html).not.toMatch(/style="[^"]*transform/i);
    expect(html).not.toMatch(/style="[^"]*opacity/i);
  });
});
