import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), mobile: vi.fn(), events: vi.fn(async () => []) }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/mobile-session", () => ({ getMobileSession: mocks.mobile }));
vi.mock("@/lib/events", () => ({ getDiscoverableEvents: mocks.events }));
vi.mock("@/lib/entitlements", () => ({ isPlus: () => false }));
import { GET as web } from "@/app/api/events/discover/route";
import { GET as mobile } from "@/app/api/mobile/discover/route";
const user = { id: "member", age: 30, location: "Bucharest" };
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue(user); mocks.mobile.mockResolvedValue({ user }); });
describe.each([["web", web], ["mobile", mobile]] as const)("%s discovery date API", (_name, get) => {
  it("accepts a day outside rolling windows for free members alongside sport filters", async () => {
    const response = await get(new Request("https://example.invalid/api/discover?date=2099-10-25&sport=Tennis&days=1&withinDays=1"));
    expect(response.status).toBe(200);
    expect(mocks.events).toHaveBeenCalledWith(expect.objectContaining({ id: "member" }), expect.objectContaining({ onDate: "2099-10-25", withinDays: 1, sport: "Tennis" }));
  });
  it.each(["2026-02-31", "garbage", "2026-10-25&date=2026-10-26"])("ignores malformed/ambiguous date %s", async value => {
    await get(new Request(`https://example.invalid/api/discover?date=${value}`));
    expect(mocks.events).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ onDate: null }));
  });
  it("retains authentication before date discovery", async () => {
    mocks.user.mockResolvedValue(null); mocks.mobile.mockResolvedValue(null);
    expect((await get(new Request("https://example.invalid/api/discover?date=2099-10-25"))).status).toBe(401);
    expect(mocks.events).not.toHaveBeenCalled();
  });
});
