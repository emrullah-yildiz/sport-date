import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({
  isTrustedBrowserMutation: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/communication-preferences", () => ({
  getCommunicationPreferences: vi.fn(),
  updateProductUpdatesPreference: vi.fn(),
}));

let GET: typeof import("./route").GET;
let PATCH: typeof import("./route").PATCH;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let getCommunicationPreferences: typeof import("@/lib/communication-preferences").getCommunicationPreferences;
let updateProductUpdatesPreference: typeof import("@/lib/communication-preferences").updateProductUpdatesPreference;

const mockPreferences = {
  serviceEmails: true,
  safetyEmails: true,
  productUpdatesOptIn: true,
  productUpdatesUpdatedAt: "2026-06-29T12:00:00.000Z",
  productUpdatesSource: "member_profile" as const,
  consentHistory: [],
};

beforeAll(async () => {
  ({ GET, PATCH } = await import("./route"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ getCommunicationPreferences, updateProductUpdatesPreference } = await import("@/lib/communication-preferences"));
}, 40000);

describe("account communication preferences route", () => {
  it("returns the current member preferences", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    vi.mocked(getCommunicationPreferences).mockResolvedValue(mockPreferences as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ preferences: mockPreferences });
  });

  it("updates the optional product update preference", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    vi.mocked(updateProductUpdatesPreference).mockResolvedValue({ ...mockPreferences, productUpdatesOptIn: false } as never);

    const response = await PATCH(
      new Request("https://sportdate.example/api/account/communication-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "https://sportdate.example" },
        body: JSON.stringify({ productUpdatesOptIn: false }),
      }),
    );

    expect(updateProductUpdatesPreference).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", false);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      preferences: { ...mockPreferences, productUpdatesOptIn: false },
    });
  });
});
