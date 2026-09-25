import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn(), DatabaseNotConfiguredError: class extends Error {} }));
vi.mock("@/lib/session", () => ({ setSessionCookie: vi.fn() }));
vi.mock("@/lib/auth", () => ({ hashPassword: vi.fn(async () => "hash"), createSession: vi.fn(() => ({ id: "session", tokenHash: "token", expiresAt: new Date("2030-01-01") })) }));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: vi.fn(() => true) }));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn(async () => null), browserRegistrationRateLimitRules: vi.fn(() => []), normalizeRateLimitKeyPart: vi.fn(() => "email") }));
import { getDatabase } from "@/lib/db";
import { POST } from "./route";
const body = { email: "ana@example.com", password: "StrongPassword9", dateOfBirth: "2000-01-01", firstName: "Ana", lastName: "P", location: "Paris", bio: "", seeking: "dating", acceptedTerms: true, sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "weekly" }] };
const query = vi.fn(async (_strings: TemplateStringsArray, ..._values: unknown[]) => [{ id: "1", email: "ana@example.com" }]);
function request(payload: unknown) { return new Request("https://example.com/api/auth/register", { method: "POST", body: JSON.stringify(payload) }); }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getDatabase).mockReturnValue(query as never); });
describe("registration connection choices", () => {
  it("stores the complete array with its first choice as the legacy scalar", async () => {
    expect((await POST(request({ ...body, seekingPreferences: ["group", "friendship", "dating"] }))).status).toBe(201);
    expect(query.mock.calls[0][0].join("?")).toContain("seeking, seeking_preferences");
    expect(query.mock.calls[0].slice(1)).toContain('["group","friendship","dating"]');
    expect(query.mock.calls[0].slice(1)).toContain("group");
  });
  it("normalizes a legacy scalar registration", async () => {
    expect((await POST(request(body))).status).toBe(201);
    expect(query.mock.calls[0].slice(1)).toContain('["dating"]');
  });
  it("rejects an empty selection before database access", async () => {
    expect((await POST(request({ ...body, seekingPreferences: [] }))).status).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });
});
