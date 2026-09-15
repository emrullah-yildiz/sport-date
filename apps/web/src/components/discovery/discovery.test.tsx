import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), events: vi.fn(), plus: vi.fn(), billing: vi.fn(() => false) }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/events", () => ({ getDiscoverableEvents: mocks.events }));
vi.mock("@/lib/entitlements", () => ({ isPlus: mocks.plus }));
vi.mock("@/lib/stripe", () => ({ isBillingConfigured: mocks.billing }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, useRouter: () => ({ push: vi.fn() }), usePathname: () => "/discover", useSearchParams: () => new URLSearchParams() }));

import DiscoverPage from "@/app/discover/page";
import EventStage from "./EventStage";

const event = {
  id: "test-event", sport: "Tennis", title: "A friendly rally", description: "A full description lives on the invitation",
  startsAt: "2026-09-20T16:00:00Z", timeZone: "Europe/Bucharest", durationMinutes: 60,
  capacity: 4, placesRemaining: 2, acceptedCount: 2, language: "English", minimumAge: 18, maximumAge: 65,
  experienceLevels: ["beginner"], hostUserId: "SECRET-HOST-ID", hostFirstName: "Sam", areaLabel: "North", city: "Bucharest",
  countryCode: "RO", approximateLatitude: 44.4, approximateLongitude: 26.1, request: null,
  privateAddress: "NEVER SERIALIZE THIS ADDRESS", preciseLatitude: 44.456789,
};
const member = { firstName: "Ana", location: "Bucharest", email: "SECRET-EMAIL", sexualOrientation: "SECRET-PREFERENCE" };
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue(member); mocks.events.mockResolvedValue([event]); mocks.plus.mockReturnValue(false); });
const page = (parameters: Record<string, string> = {}) => DiscoverPage({ searchParams: Promise.resolve(parameters) });
function stageProps(node: ReactNode): Record<string, unknown> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (child.type === EventStage) return child.props;
    const found = stageProps(child.props.children as ReactNode);
    if (found) return found;
  }
}

describe("discovery event stage boundaries", () => {
  it("offers a Settings destination only when billing is available", async () => {
    mocks.billing.mockReturnValue(false);
    expect(renderToStaticMarkup(await page())).not.toContain('href="/settings#plus"');
    mocks.billing.mockReturnValue(true);
    expect(renderToStaticMarkup(await page())).toContain('href="/settings#plus"');
    mocks.billing.mockReturnValue(false);
  });
  it("keeps authentication before fetching events", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("redirect:/login");
    expect(mocks.events).not.toHaveBeenCalled();
  });
  it("passes rendered public cards only, never raw event records or member data", async () => {
    const props = stageProps(await page());
    expect(Object.keys(props ?? {})).toEqual(["children"]);
    const serialized = JSON.stringify(props, (key, value) => key === "type" || key === "_owner" ? undefined : value);
    for (const value of ["SECRET-HOST-ID", "SECRET-EMAIL", "SECRET-PREFERENCE", "NEVER SERIALIZE THIS ADDRESS", "44.456789", "approximateLatitude", "skipCount"]) expect(serialized).not.toContain(value);
    expect(serialized).toContain("A friendly rally");
  });
  it("links to review before committing and preserves pending request wording", async () => {
    let html = renderToStaticMarkup(await page());
    expect(html).toContain('href="/discover/events/test-event"');
    expect(html).toContain("View the plan");
    mocks.events.mockResolvedValue([{ ...event, request: { id: "PRIVATE-REQUEST", status: "pending", skipCount: 2 } }]);
    html = renderToStaticMarkup(await page());
    expect(html).toContain("Manage request");
    expect(html).not.toContain("PRIVATE-REQUEST");
    expect(JSON.stringify(stageProps(await page()), (key, value) => key === "type" || key === "_owner" ? undefined : value)).not.toContain("skipCount");
  });
  it("preserves everywhere on filter submission and keeps Plus gates server-owned", async () => {
    const html = renderToStaticMarkup(await page({ near: "all", sport: "Tennis", schedule: "morning", radius: "10" }));
    expect(html).toContain('name="near" value="all"');
    expect(html).toContain('name="sport"');
    expect(html).toContain('value="Tennis"');
    expect(html).not.toContain('name="schedule"');
    expect(html).not.toContain('value="10"');
    expect(mocks.events).toHaveBeenCalledWith(member, expect.objectContaining({ city: "", sport: "Tennis" }));
  });
  it("never manufactures cards when search is empty and distinguishes narrowed results", async () => {
    mocks.events.mockResolvedValue([]);
    const tree = await page({ sport: "Tennis" });
    expect(stageProps(tree)).toBeUndefined();
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Nothing matches these filters");
    expect(html).not.toContain("A friendly rally");
    expect(html).toContain("Clear the filters");
  });
  it("has a finite count and no carousel controls for a single invitation", () => {
    const html = renderToStaticMarkup(<EventStage><article>Only invitation</article></EventStage>);
    expect(html).toContain("Invitation 1 of 1");
    expect(html).not.toContain("Browse invitations");
    expect(renderToStaticMarkup(<EventStage>{[]}</EventStage>)).toBe("");
  });
});


it("passes a calendar day for free members and preserves it in the other filter form", async () => {
  const html = renderToStaticMarkup(await page({ date: "2026-10-25", sport: "Tennis", days: "1" }));
  expect(mocks.events).toHaveBeenCalledWith(member, expect.objectContaining({ onDate: "2026-10-25", withinDays: 1, sport: "Tennis" }));
  expect(html).toContain("Plans for 25 October 2026");
  expect(html).toContain('type="hidden" name="date" value="2026-10-25"');
});
it("ignores invalid dates and gives selected dates a useful empty state", async () => {
  await page({ date: "2026-02-31" });
  expect(mocks.events).toHaveBeenLastCalledWith(member, expect.objectContaining({ onDate: null }));
  mocks.events.mockResolvedValue([]);
  const html = renderToStaticMarkup(await page({ date: "2026-10-25" }));
  expect(html).toContain("No events match your search on 25 October 2026");
  expect(html).toContain("Try another date above");
});
