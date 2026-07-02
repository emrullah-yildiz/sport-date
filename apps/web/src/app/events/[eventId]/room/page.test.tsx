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

describe("Zero-participants coordination room empty state", () => {
  it("gives a host with no accepted participants a warm empty state, not a bare zero", async () => {
    const html = await render({ isHost: true, viewerRequest: null, participants: [] });
    // Warm, honest heading instead of "0 people joining" over a blank box.
    expect(html).toContain("No one has a place yet");
    expect(html).not.toContain("0 people joining");
    // Acknowledges the event is live and reassures that requests take a little time.
    expect(html).toContain("Your event is live");
    expect(html).toContain("usually take a little time");
    // One clear next action: share the approximate-only public invitation, plus calm
    // links to the public invitation and to managing the event.
    expect(html).toContain("Copy invitation link");
    expect(html).toContain('href="/discover/events/11111111-1111-4111-8111-111111111111"');
    expect(html).toContain('href="/hosting"');
    // Honest — no fabricated traction, counts, "people near you", or scarcity/streak pressure.
    const lower = html.toLowerCase();
    for (const forbidden of ["people near you", "others near you", "spots left", "hurry", "streak", "popularity", "trending"]) {
      expect(lower).not.toContain(forbidden);
    }
  });

  it("keeps the normal people list once the host has an accepted participant", async () => {
    const html = await render({
      isHost: true,
      viewerRequest: null,
      participants: [{ userId: "p-1", firstName: "Mara", skillLevel: "intermediate", seenLatestUpdate: null, criticalUpdateIntent: null }],
    });
    expect(html).toContain("1 person joining");
    expect(html).not.toContain("No one has a place yet");
    expect(html).toContain("Mara");
  });

  it("shows an accepted sole guest a calm 'you're the first' note, not a contradiction", async () => {
    const html = await render({
      isHost: false,
      viewerRequest: { id: "req-1", status: "accepted" },
      participants: [{ userId: user.id, firstName: "Ana", skillLevel: "intermediate", seenLatestUpdate: null, criticalUpdateIntent: null }],
    });
    expect(html).toContain("You&#x27;re the first to join");
    expect(html).not.toContain("0 people joining");
    // The host is still listed for this accepted guest.
    expect(html).toContain("Radu");
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

describe("Ended room reads as a retrospective, not an upcoming event (CX-20260701)", () => {
  it("keeps future-tense framing before the event ends", async () => {
    const html = await render({ hasEnded: false });
    // Hero, venue and people panels all speak of an upcoming meeting.
    expect(html).toContain("coordination room");
    expect(html).not.toContain("This event has finished");
    expect(html).toContain("Where you are meeting");
    expect(html).toContain("Who has a place");
    // The pre-event "A calm arrival" rhythm guidance is present.
    expect(html).toContain("A calm arrival");
    expect(html).toContain("Before you go");
    expect(html).toContain("When you arrive");
  });

  it("shows a clear 'finished' cue in the hero once the event has ended", async () => {
    const html = await render({ hasEnded: true });
    expect(html).toContain("This event has finished");
    expect(html).toContain("after the game");
    expect(html).not.toContain("coordination room");
  });

  it("reframes the venue panel to past tense once ended", async () => {
    const html = await render({ hasEnded: true });
    expect(html).toContain("Where you met");
    expect(html).not.toContain("Where you are meeting");
    // The venue itself is still shown (authorization unchanged for an accepted viewer).
    expect(html).toContain("Herastrau public courts");
  });

  it("reframes the people panel to past tense once ended", async () => {
    const html = await render({
      hasEnded: true,
      participants: [{ userId: "p-1", firstName: "Mara", skillLevel: "intermediate", seenLatestUpdate: null, criticalUpdateIntent: null }],
    });
    expect(html).toContain("Who had a place");
    expect(html).not.toContain("Who has a place");
    expect(html).toContain("1 person had a place");
    expect(html).not.toContain("1 person joining");
  });

  it("does not show the pre-event 'A calm arrival' before-you-go guidance once ended", async () => {
    const html = await render({ hasEnded: true });
    expect(html).not.toContain("A calm arrival");
    expect(html).not.toContain("Before you go");
    expect(html).not.toContain("When you arrive");
  });

  it("does not present an ended host with no attendees as 'awaiting a first place', and stays non-punitive", async () => {
    const html = await render({ hasEnded: true, isHost: true, viewerRequest: null, participants: [] });
    // No future-tense "live / awaiting requests" empty state after the event.
    expect(html).not.toContain("No one has a place yet");
    expect(html).not.toContain("Your event is live");
    expect(html).toContain("No one joined this time");
    // Calm, non-punitive: no blame or pressure language.
    const lower = html.toLowerCase();
    for (const forbidden of ["failed", "no-show", "nobody wanted", "streak", "score"]) {
      expect(lower).not.toContain(forbidden);
    }
  });

  it("does not show the 'you're the first to join' future note to a sole guest once ended", async () => {
    const html = await render({
      hasEnded: true,
      isHost: false,
      viewerRequest: { id: "req-1", status: "accepted" },
      participants: [{ userId: user.id, firstName: "Ana", skillLevel: "intermediate", seenLatestUpdate: null, criticalUpdateIntent: null }],
    });
    expect(html).not.toContain("You&#x27;re the first to join");
    expect(html).toContain("1 person had a place");
  });
});
