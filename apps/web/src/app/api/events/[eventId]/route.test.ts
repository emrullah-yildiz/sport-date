import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({
  isTrustedBrowserMutation: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDatabase: vi.fn(),
}));

let DELETE: typeof import("./route").DELETE;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let getDatabase: typeof import("@/lib/db").getDatabase;

beforeAll(async () => {
  ({ DELETE } = await import("./route"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ getDatabase } = await import("@/lib/db"));
}, 40000);

describe("browser host event cancellation route", () => {
  it("cancels a host-owned event", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" } as never);
    const sql = vi.fn().mockResolvedValue([{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const response = await DELETE(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
        method: "DELETE",
        headers: { Origin: "https://sportdate.example" },
      }),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "cancelled",
      message: "Event cancelled. Active requests, seats, and room access are now closed.",
    });
  });

  it("rejects cross-site cancellation attempts", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(false);

    const response = await DELETE(
      new Request("https://sportdate.example/api/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { method: "DELETE" }),
      { params: Promise.resolve({ eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Cross-site request rejected." });
  });
});
