import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), event: vi.fn(), location: vi.fn(), standing: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/events", () => ({ getDiscoverableEvent: mocks.event, getAcceptedEventLocation: mocks.location }));
vi.mock("@/lib/join-requests", () => ({ getMemberReliabilityStanding: mocks.standing }));
vi.mock("next/navigation", () => ({ redirect: () => { throw Error("login"); }, notFound: () => { throw Error("not found"); }, useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/discover" }));
import Page from "@/app/discover/events/[eventId]/page";

const event = { id: "synthetic-event", sport: "Tennis", title: "A friendly rally", description: "Bring your own racket.", startsAt: "2026-09-20T16:00:00Z", timeZone: "Europe/Bucharest", durationMinutes: 60, placesRemaining: 2, language: "English", experienceLevels: ["beginner"], minimumAge: 18, maximumAge: 65, hostFirstName: "Sam", hostUserId: "synthetic-host", areaLabel: "North", city: "Bucharest", request: null, viewerIsHost: false, eligibility: "eligible" };
const render = async () => renderToStaticMarkup(await Page({ params: Promise.resolve({ eventId: event.id }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "synthetic-member", firstName: "Alex", location: "Bucharest" });
  mocks.event.mockResolvedValue(event);
  mocks.standing.mockResolvedValue({ notice: { tone: "none", headline: "", body: "", liftsAt: null } });
  mocks.location.mockResolvedValue({ venueName: "PRIVATE-VENUE", address: "PRIVATE-ADDRESS", instructions: "PRIVATE-INSTRUCTIONS" });
});
describe("invitation detail boundaries", () => {
  it("requires authentication before loading the invitation", async () => {
    mocks.user.mockResolvedValue(null); await expect(render()).rejects.toThrow("login"); expect(mocks.event).not.toHaveBeenCalled();
  });
  it("keeps precise location unread for new and pending requests", async () => {
    for (const request of [null, { id: "request", status: "pending" }]) {
      mocks.event.mockResolvedValue({ ...event, request }); const html = await render();
      expect(html).not.toContain("PRIVATE-"); expect(html).toContain("Europe/Bucharest"); expect(html).toContain("About this plan");
    }
    expect(mocks.location).not.toHaveBeenCalled();
  });
  it("shows the authorized meeting point only after acceptance", async () => {
    mocks.event.mockResolvedValue({ ...event, request: { id: "request", status: "accepted" } });
    const html = await render(); expect(mocks.location).toHaveBeenCalledWith(event.id, "synthetic-member");
    expect(html).toContain("PRIVATE-VENUE"); expect(html).toContain("Your accepted meeting point is below.");
    expect(html).not.toContain("The exact venue is not included in this page");
  });
  it("keeps host management separate from requesting and private standing", async () => {
    mocks.event.mockResolvedValue({ ...event, viewerIsHost: true }); const html = await render();
    expect(html).toContain("Manage this event"); expect(html).not.toContain("Request a place</button>");
    expect(mocks.standing).not.toHaveBeenCalled(); expect(mocks.location).not.toHaveBeenCalled();
  });
});
