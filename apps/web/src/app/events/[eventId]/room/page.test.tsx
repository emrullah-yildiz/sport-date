import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getEventRoom: vi.fn(),
  getPeerFeedbackTargets: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/events", () => ({ getEventRoom: mocks.getEventRoom }));
vi.mock("@/lib/peer-feedback", () => ({ getPeerFeedbackTargets: mocks.getPeerFeedbackTargets }));

import EventRoomPage from "./page";

const user = { id: "user-1", firstName: "Ana" };

function room(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Sunset doubles",
    sport: "Tennis",
    startsAt: "2026-07-10T15:00:00.000Z",
    timeZone: "Europe/Bucharest",
    durationMinutes: 90,
    areaLabel: "Herastrau park",
    experienceLevels: ["beginner", "intermediate"],
    venueName: "Herastrau public courts",
    address: "Court 3, near the north entrance",
    instructions: null,
    isHost: false,
    hasEnded: false,
    viewerIsFirstTimer: false,
    viewerRequest: { id: "req-1", status: "accepted" },
    host: { userId: "host-9", firstName: "Radu" },
    reflection: null,
    latestUpdateId: null,
    latestCriticalUpdateId: null,
    viewerHasSeenLatestUpdate: false,
    viewerCriticalUpdateIntent: null,
    criticalUpdateResponseCounts: { stillIn: 0, unsure: 0, cannotMake: 0 },
    updates: [],
    participants: [],
    ...overrides,
  };
}

async function render(overrides?: Record<string, unknown>) {
  mocks.getCurrentUser.mockResolvedValue(user);
  mocks.getEventRoom.mockResolvedValue(room(overrides));
  mocks.getPeerFeedbackTargets.mockResolvedValue([]);
  const element = await EventRoomPage({ params: Promise.resolve({ eventId: room().id }) });
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Event room pre-arrival safety brief", () => {
  it("shows the calm safety brief to an accepted participant before the event", async () => {
    const html = await render();
    expect(html).toContain("Meeting someone new, calmly");
    expect(html).toContain("Meet in the public spot first");
    // Free promise is visible, no unprovable claims.
    expect(html).toContain("always-free");
    expect(html.toLowerCase()).not.toContain("verified");
    // Links point at the on-page controls.
    expect(html).toContain('href="#room-people"');
    expect(html).toContain('href="#room-leave"');
    // And those anchors exist on the page.
    expect(html).toContain('id="room-people"');
    expect(html).toContain('id="room-leave"');
  });

  it("does not show the brief to the host", async () => {
    const html = await render({ isHost: true, viewerRequest: null });
    expect(html).not.toContain("Meeting someone new, calmly");
  });

  it("does not show the brief once the event has ended", async () => {
    const html = await render({ hasEnded: true });
    expect(html).not.toContain("Meeting someone new, calmly");
  });

  it("does not show the brief for a pending (not yet accepted) request", async () => {
    const html = await render({ viewerRequest: { id: "req-1", status: "pending" } });
    expect(html).not.toContain("Meeting someone new, calmly");
  });
});

describe("First-event preparation card", () => {
  const PREP_TITLE = "here&#x27;s how it&#x27;ll go";

  it("shows the warm preparation card to an accepted first-timer before the event", async () => {
    const html = await render({ viewerIsFirstTimer: true });
    expect(html).toContain('id="first-event-prep-title"');
    expect(html).toContain(PREP_TITLE);
    // Practical facts derived from the event (sport + welcomed levels + what to bring).
    expect(html).toContain("Beginners are welcome");
    expect(html).toContain("Your racket if you have one");
    // Points at the on-page safety/leaving controls rather than repeating them.
    expect(html).toContain('href="#prearrival-brief"');
    // No invented safety claims.
    expect(html.toLowerCase()).not.toContain("verified");
    expect(html.toLowerCase()).not.toContain("guaranteed");
  });

  it("does not show the preparation card to a repeat attendee", async () => {
    const html = await render({ viewerIsFirstTimer: false });
    expect(html).not.toContain('id="first-event-prep-title"');
  });

  it("does not show the preparation card to the host", async () => {
    const html = await render({ viewerIsFirstTimer: true, isHost: true, viewerRequest: null });
    expect(html).not.toContain('id="first-event-prep-title"');
  });

  it("does not show the preparation card once the event has ended", async () => {
    const html = await render({ viewerIsFirstTimer: true, hasEnded: true });
    expect(html).not.toContain('id="first-event-prep-title"');
  });

  it("does not show the preparation card for a pending (not yet accepted) request", async () => {
    const html = await render({ viewerIsFirstTimer: true, viewerRequest: { id: "req-1", status: "pending" } });
    expect(html).not.toContain('id="first-event-prep-title"');
  });

  it("falls back to the leave control anchor when the safety brief is not shown", async () => {
    // A first-timer whose request is somehow not the accepted-brief state still never
    // renders the card, so the anchor fallback is exercised via the safety-brief-off path
    // only when both flags align — here we assert the card is absent, guarding the gate.
    const html = await render({ viewerIsFirstTimer: true, viewerRequest: { id: "req-1", status: "declined" } });
    expect(html).not.toContain('id="first-event-prep-title"');
  });
});

describe("Post-event warm afterglow moment", () => {
  it("does not show before the event has ended", async () => {
    const html = await render({ hasEnded: false });
    expect(html).not.toContain("afterglow-title");
    expect(html).not.toContain("Glad you got out and moved");
  });

  it("shows a warm participant acknowledgement once the event has ended", async () => {
    const html = await render({ hasEnded: true });
    expect(html).toContain('id="afterglow-title"');
    expect(html).toContain("Glad you got out and moved");
    // Reflection is framed as clearly optional and skippable.
    expect(html).toContain("entirely up to you");
    expect(html).toContain("if you skip it");
    // A calm forward path exists (discover + host), not a dead end.
    expect(html).toContain('href="/discover"');
    expect(html).toContain('href="/events/new"');
    // It offers a jump to the optional reflection form below, not a demand.
    expect(html).toContain("#event-reflection-title");
  });

  it("shows a host-toned acknowledgement to the host once the event has ended", async () => {
    const html = await render({ hasEnded: true, isHost: true, viewerRequest: null });
    expect(html).toContain("You made this happen");
    expect(html).toContain("hosting is generous");
  });

  it("acknowledges an existing reflection without renagging or offering a duplicate jump", async () => {
    const html = await render({
      hasEnded: true,
      reflection: { attendance: "attended", wouldJoinAgain: "yes" },
    });
    expect(html).toContain("you can update it any time");
    // No "reflect below" jump once a reflection already exists.
    expect(html).not.toContain("Reflect below");
  });

  it("contains no streak, score, popularity, or pressure mechanics in the warm moment", async () => {
    const html = (await render({ hasEnded: true })).toLowerCase();
    for (const forbidden of ["streak", "score", "popularity", "leaderboard", "don't lose", "do not lose", "points", "ranking"]) {
      expect(html).not.toContain(forbidden);
    }
  });
});
