import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { trackClick } from "./track-click";

// The client beacon helper must (a) send only { event, path }, (b) prefer
// sendBeacon and fall back to a keepalive fetch, and (c) NEVER throw — a broken
// counter must never break a member's click or navigation.

const sendBeacon = vi.fn();
const fetchMock = vi.fn();

function stubBrowser({ beacon = true }: { beacon?: boolean } = {}) {
  vi.stubGlobal("window", { location: { pathname: "/signup" } });
  vi.stubGlobal("navigator", beacon ? { sendBeacon } : {});
  vi.stubGlobal("fetch", fetchMock);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("trackClick", () => {
  it("is a silent no-op outside the browser (SSR safety)", () => {
    expect(() => trackClick("landing_cta_join")).not.toThrow();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only the event name and pathname via sendBeacon — nothing else", () => {
    stubBrowser();
    sendBeacon.mockReturnValue(true);
    trackClick("signup_started");
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, payload] = sendBeacon.mock.calls[0];
    expect(url).toBe("/api/metrics/click");
    expect(JSON.parse(payload as string)).toEqual({ event: "signup_started", path: "/signup" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to an identity-free keepalive fetch when sendBeacon refuses", () => {
    stubBrowser();
    sendBeacon.mockReturnValue(false);
    trackClick("signup_completed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/metrics/click");
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "omit" });
    expect(JSON.parse(init.body as string)).toEqual({ event: "signup_completed", path: "/signup" });
  });

  it("uses fetch when sendBeacon does not exist", () => {
    stubBrowser({ beacon: false });
    trackClick("survey_started");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never throws — not on a throwing sendBeacon, a rejecting fetch, or both", async () => {
    stubBrowser();
    sendBeacon.mockImplementation(() => { throw new Error("beacon broken"); });
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(() => trackClick("join_requested")).not.toThrow();
    // Let the rejected fetch settle to prove the .catch swallows it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
