import { renderToStaticMarkup } from "react-dom/server";
import { AnimatePresence, motion } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";

// next/navigation's useRouter is only reached for its refresh() on an in-place
// resolution, which renderToStaticMarkup never triggers; stub it so the server
// render (the pass this test exercises) runs outside an app-router context.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

// useReducedMotion is mocked per-test (see below) so we can drive BOTH the
// default and the reduced-motion `panelMotion` branch deterministically. Under
// the vitest `node` environment the real hook returns false (no matchMedia), so
// without this mock the reduced-motion branch — the exact setting the reported
// hydration mismatch occurred under — would never be exercised at all.
const reducedMotionMock = vi.fn<() => boolean>(() => false);
vi.mock("framer-motion", async (importActual) => {
  const actual = await importActual<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => reducedMotionMock() };
});

import JoinRequestControls from "./JoinRequestControls";

/**
 * Tripwire for CX-20260702-join-controls-reduced-motion-hydration-mismatch,
 * hardened by CX-20260702-join-controls-hydration-test-is-tautology-strengthen.
 *
 * THE INVARIANT: a framer-motion `motion.div` serializes its resolved inline
 * style differently on the server than the client's pre-mount render (the
 * server emits `opacity` / `transform:none` the client omits), which React
 * "won't patch up" — a hydration mismatch on the join panels. The fix gates the
 * motion wrapper behind a `mounted` flag (useSyncExternalStore, server snapshot
 * = false), so the server render (the pass renderToStaticMarkup exercises here)
 * emits a PLAIN `<div>` with no motion-injected inline style, byte-identical to
 * the first client render.
 *
 * WHY THIS IS NOT A TAUTOLOGY: a plain `not.toContain("style")` assertion could
 * pass simply because framer-motion happened to emit nothing in this env. To
 * prove the assertion has teeth we FIRST establish a positive control — that the
 * ungated `motion.div`, in BOTH motion settings, really does emit the offending
 * inline style on this exact server-render path (see "positive control" below).
 * Only against that baseline does "the gated component emits none" actually pin
 * the fix. We also drive the reduced-motion branch (mocked), the setting the bug
 * was reported under, which the previous test never reached. Reverting the
 * `mounted` gate makes `Panel` render the `motion.div` on the server pass, which
 * these tests then catch in every motion setting.
 */

function serverHtml(request: Parameters<typeof JoinRequestControls>[0]["request"]) {
  return renderToStaticMarkup(<JoinRequestControls eventId="evt-1" request={request} />);
}

function serverHtmlFull(request: Parameters<typeof JoinRequestControls>[0]["request"]) {
  return renderToStaticMarkup(<JoinRequestControls eventId="evt-1" request={request} isFull />);
}

afterEach(() => {
  reducedMotionMock.mockReturnValue(false);
});

// The motion variants the component would apply to `Panel` after mount, kept in
// sync with JoinRequestControls' `panelMotion`. These feed the positive control.
const defaultMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: "easeOut" as const },
};
const reducedMotionVariant = {
  initial: false as const,
  animate: { opacity: 1 },
  exit: { opacity: 1 },
  transition: { duration: 0 },
};

function ungatedPanelHtml(variant: typeof defaultMotion | typeof reducedMotionVariant) {
  // Reproduces exactly what `Panel` renders when the `mounted` gate is REMOVED:
  // the motion.div, inside AnimatePresence initial={false} (as the component
  // wraps it), on the server-render path.
  return renderToStaticMarkup(
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key="p" className="join-request-box" {...variant}>
        hi
      </motion.div>
    </AnimatePresence>,
  );
}

describe("JoinRequestControls server render (hydration parity)", () => {
  // Positive control: PROVE the assertions below can fail. If the gate were
  // removed, the server pass renders this motion.div — and it demonstrably
  // carries the telltale inline style in BOTH motion settings, so a green
  // "no inline style" result on the real component is meaningful, not vacuous.
  it("positive control: an ungated motion panel DOES emit motion inline style on the server (both motion settings)", () => {
    const defaultHtml = ungatedPanelHtml(defaultMotion);
    // The exact reported mismatch string for the default (animated) branch.
    expect(defaultHtml).toMatch(/style="[^"]*transform/i);
    expect(defaultHtml).toMatch(/style="[^"]*opacity/i);

    const reducedHtml = ungatedPanelHtml(reducedMotionVariant);
    // Under reduced-motion the offending style is `opacity:1` (no transform) —
    // the setting the bug was actually reported under. Still non-empty, so a
    // missing gate is caught here too.
    expect(reducedHtml).toMatch(/style="[^"]*opacity/i);
  });

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

  it("stays plain under prefers-reduced-motion — the setting the mismatch was reported under", () => {
    // Drive the reduced-motion `panelMotion` branch, which the vitest node env
    // never reaches on its own. If the `mounted` gate is removed, `Panel` now
    // renders the reduced-motion motion.div on the server, emitting `opacity:1`
    // (see the positive control) — which this assertion would catch. With the
    // gate in place the server pass is a plain <div>, so it stays clean.
    reducedMotionMock.mockReturnValue(true);
    const html = serverHtml(null);
    expect(html).toContain('class="join-request-box"');
    expect(html).not.toMatch(/style="[^"]*opacity/i);
    expect(html).not.toMatch(/style="[^"]*transform/i);
    expect(html).toContain("Request a place");
  });

  // CX-20260703-full-event-join-form-invites-doomed-request: a fully booked event
  // must replace the open request form with an honest "full" state, not invite a
  // submission the server capacity guard would 409. These pin the gating end-to-end
  // through the actual component render (the pure decision is unit-tested in
  // join-request-policy.test.ts).
  it("renders the honest full state — not the request form — for a full event with no request", () => {
    const html = serverHtmlFull(null);
    expect(html).toContain("This game is full.");
    // A real, calm next step, not a dead-ended submit.
    expect(html).toContain("Browse other games");
    expect(html).toContain('href="/discover"');
    // The doomed open form is gone: no textarea, no "Request a place" submit.
    expect(html).not.toContain("Request a place");
    expect(html).not.toContain("<textarea");
    // Still hydration-safe (no framer-motion inline style on the server pass).
    expect(html).not.toMatch(/style="[^"]*transform/i);
    expect(html).not.toMatch(/style="[^"]*opacity/i);
  });

  it("keeps a member's existing pending state on a now-full event (full never overrides an existing request)", () => {
    const html = serverHtmlFull({ id: "req-1", status: "pending", skipCount: 0 });
    // Their own state is preserved verbatim — not replaced by the full state.
    expect(html).toContain("Your request is with the host.");
    expect(html).not.toContain("This game is full.");
  });

  it("does not offer a doomed re-request from the cancelled state when the game has since filled up", () => {
    const html = serverHtmlFull({ id: "req-1", status: "cancelled", skipCount: 0 });
    // The cancelled headline is preserved, but the "ask again" button (which would
    // 409 on a full event) is withheld in favour of an honest message + next step.
    expect(html).toContain("Request cancelled.");
    expect(html).not.toContain("Request a place again");
    expect(html).toContain("filled up");
    expect(html).toContain("Browse other games");
  });

  it("still offers the re-request affordance from cancelled when the game has room (unchanged not-full behaviour)", () => {
    const html = serverHtml({ id: "req-1", status: "cancelled", skipCount: 0 });
    expect(html).toContain("Request a place again");
    expect(html).not.toContain("filled up");
  });

  it("server render is byte-identical across motion settings (the gate makes SSR motion-independent)", () => {
    // The whole point of the gate: the server / pre-mount render must not depend
    // on the motion setting, so SSR and the first (still pre-mount) client render
    // agree no matter what the client's prefers-reduced-motion resolves to.
    // Remove the gate and these diverge — default emits `transform:none`, reduced
    // emits `opacity:1` — so this equality is a direct assertion of the fix.
    reducedMotionMock.mockReturnValue(false);
    const defaultServer = serverHtml(null);
    reducedMotionMock.mockReturnValue(true);
    const reducedServer = serverHtml(null);
    expect(reducedServer).toBe(defaultServer);
  });
});
