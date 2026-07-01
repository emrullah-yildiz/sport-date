import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isTrustedBrowserMutation: vi.fn(() => true),
  isBillingConfigured: vi.fn(() => false),
  createSubscriptionCheckout: vi.fn(),
  getMemberBilling: vi.fn(),
  linkStripeCustomer: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: mocks.isTrustedBrowserMutation }));
vi.mock("@/lib/stripe", () => ({
  isBillingConfigured: mocks.isBillingConfigured,
  createSubscriptionCheckout: mocks.createSubscriptionCheckout,
}));
vi.mock("@/lib/billing", () => ({
  getMemberBilling: mocks.getMemberBilling,
  linkStripeCustomer: mocks.linkStripeCustomer,
}));

import { POST } from "./route";

const member = { id: "42", email: "m@example.com" };

function req() {
  return new Request("https://sportdate.example/api/billing/checkout", {
    method: "POST",
    headers: { origin: "https://sportdate.example" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
  mocks.getMemberBilling.mockResolvedValue({ stripeCustomerId: null, stripeSubscriptionId: null });
});

describe("checkout is fail-closed and auth-gated", () => {
  it("rejects a cross-site request before touching Stripe or the member", async () => {
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.createSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it("requires an authenticated member", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(mocks.createSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it("returns a calm 503 (no charge, no Stripe call) when billing is not configured", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);
    mocks.isBillingConfigured.mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ code: "billing-unavailable" });
    expect(mocks.createSubscriptionCheckout).not.toHaveBeenCalled();
  });
});

describe("checkout creates a session only when enabled + member authed", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue(member);
    mocks.isBillingConfigured.mockReturnValue(true);
  });

  it("returns the Stripe Checkout URL for the configured price", async () => {
    mocks.createSubscriptionCheckout.mockResolvedValue({ ok: true, url: "https://checkout.stripe.test/s" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: "https://checkout.stripe.test/s" });
    const arg = mocks.createSubscriptionCheckout.mock.calls[0][0];
    expect(arg.userId).toBe("42");
    expect(arg.successUrl).toContain("/profile?billing=success");
  });

  it("degrades to 503 if the module reports not-configured at call time", async () => {
    mocks.createSubscriptionCheckout.mockResolvedValue({ ok: false, reason: "not-configured" });
    const res = await POST(req());
    expect(res.status).toBe(503);
  });

  it("returns 502 on a Stripe error", async () => {
    mocks.createSubscriptionCheckout.mockResolvedValue({ ok: false, reason: "error" });
    const res = await POST(req());
    expect(res.status).toBe(502);
  });
});
