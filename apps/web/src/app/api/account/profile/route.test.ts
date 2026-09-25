import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: vi.fn(() => true) }));
import { getDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { PATCH } from "./route";
const body = { firstName: "Ana", lastName: "P", location: "Paris", bio: "", seeking: "dating", sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "weekly" }] };
const queries: { text: string; values: unknown[] }[] = [];
function request(payload: unknown) { return new Request("https://example.com/api/account/profile", { method: "PATCH", body: JSON.stringify(payload) }); }
beforeEach(() => {
  vi.clearAllMocks(); queries.length = 0;
  vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "1", seeking: "friendship", seekingPreferences: ["friendship", "group"] } as never);
  const transaction = (strings: TemplateStringsArray, ...values: unknown[]) => { queries.push({ text: strings.join("?"), values }); return [{ id: "1" }]; };
  vi.mocked(getDatabase).mockReturnValue({ transaction: async (build: (query: typeof transaction) => unknown[]) => build(transaction) } as never);
});
describe("profile connection choices", () => {
  it("persists every selected choice and derives the legacy scalar", async () => {
    expect((await PATCH(request({ ...body, seekingPreferences: ["group", "dating"] }))).status).toBe(200);
    expect(queries[0].text).toContain("seeking_preferences = ARRAY");
    expect(queries[0].values).toContain('["group","dating"]');
    expect(queries[0].values).toContain("group");
  });
  it("preserves stored multi-selection when an older client omits the array", async () => {
    expect((await PATCH(request(body))).status).toBe(200);
    expect(queries[0].values).toContain('["friendship","group"]');
    expect(queries[0].values).toContain("friendship");
  });
  it.each([[], ["dating", "dating"], ["invalid"], null])("rejects invalid explicit arrays without writes: %j", async (seekingPreferences) => {
    expect((await PATCH(request({ ...body, seekingPreferences }))).status).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await PATCH(request(body))).status).toBe(401);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it("rejects cross-site mutations", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(false);
    expect((await PATCH(request(body))).status).toBe(403);
    expect(getDatabase).not.toHaveBeenCalled();
  });
});
