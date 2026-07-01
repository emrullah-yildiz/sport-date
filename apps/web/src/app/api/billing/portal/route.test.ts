import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isTrustedBrowserMutation: vi.fn(() => true),
  isBillingConfigured: vi.fn(() => false),
  createBillingPortalSession: vi.fn(),
  getMemberBilling: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: mocks.isTrustedBrowserMutation }));
vi.mock("@/lib/stripe", () => ({
  isBillingConfigured: mocks.isBillingConfigured,
  createBillingPortalSession: mocks.createBillingPortalSession,
}));
vi.mock("@/lib/billing", () => ({
  getMemberBilling: mocks.getMemberBilling,
}));

import { POST } from "./route";

const member = { id: "42", email: "m@example.com" };

function req() {
  return new Request("https://sportdate.example/api/billing/portal", {
    method: "POST",
    headers: { origin: "https://sportdate.example" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
  mocks.getMemberBilling.mockResolvedValue({ stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" });
});

describe("portal is fail-closed and auth-gated", () => {
  it("rejects a cross-site request before touching Stripe or the member", async () => {
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.createBillingPortalSession).not.toHaveBeenCalled();
  });

  it("requires an authenticated member", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(mocks.createBillingPortalSession).not.toHaveBeenCalled();
  });

  it("returns a calm 503 (no Stripe call) when billing is not configured", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);
    mocks.isBillingConfigured.mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ code: "billing-unavailable" });
    expect(mocks.createBillingPortalSession).not.toHaveBeenCalled();
  });
});

describe("portal opens a session only when enabled + member authed", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue(member);
    mocks.isBillingConfigured.mockReturnValue(true);
  });

  it("returns the Stripe Billing Portal URL for the member's customer", async () => {
    mocks.createBillingPortalSession.mockResolvedValue({ ok: true, url: "https://billing.stripe.test/p" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: "https://billing.stripe.test/p" });
    const arg = mocks.createBillingPortalSession.mock.calls[0][0];
    expect(arg.customerId).toBe("cus_1");
    expect(arg.returnUrl).toContain("/profile");
  });

  it("degrades to 503 if the module reports not-configured at call time", async () => {
    mocks.createBillingPortalSession.mockResolvedValue({ ok: false, reason: "not-configured" });
    const res = await POST(req());
    expect(res.status).toBe(503);
  });

  it("returns 502 on a Stripe error (e.g. member has no customer to manage)", async () => {
    mocks.createBillingPortalSession.mockResolvedValue({ ok: false, reason: "error" });
    const res = await POST(req());
    expect(res.status).toBe(502);
  });
});
