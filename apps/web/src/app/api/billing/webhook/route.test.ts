import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isBillingConfigured: vi.fn(() => true),
  verifyWebhook: vi.fn(),
  handleVerifiedWebhookEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({
  isBillingConfigured: mocks.isBillingConfigured,
  verifyWebhook: mocks.verifyWebhook,
}));
vi.mock("@/lib/billing", () => ({ handleVerifiedWebhookEvent: mocks.handleVerifiedWebhookEvent }));

import { POST } from "./route";

function req(body = "{}", sig: string | null = "sig") {
  const headers: Record<string, string> = {};
  if (sig !== null) headers["stripe-signature"] = sig;
  return new Request("https://sportdate.example/api/billing/webhook", { method: "POST", headers, body });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isBillingConfigured.mockReturnValue(true);
});

describe("webhook fails closed when billing is not configured", () => {
  it("returns 503 and never verifies or applies", async () => {
    mocks.isBillingConfigured.mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect(mocks.verifyWebhook).not.toHaveBeenCalled();
    expect(mocks.handleVerifiedWebhookEvent).not.toHaveBeenCalled();
  });
});

describe("webhook verifies the Stripe signature", () => {
  it("rejects a bad signature with 400 and applies nothing", async () => {
    mocks.verifyWebhook.mockReturnValue({ ok: false, reason: "invalid-signature" });
    const res = await POST(req("payload", "bad-sig"));
    expect(res.status).toBe(400);
    expect(mocks.handleVerifiedWebhookEvent).not.toHaveBeenCalled();
  });

  it("passes the RAW body and signature header to verification", async () => {
    mocks.verifyWebhook.mockReturnValue({ ok: true, event: { id: "evt_1", type: "customer.subscription.updated" } });
    mocks.handleVerifiedWebhookEvent.mockResolvedValue(undefined);
    await POST(req("the-raw-body", "the-sig"));
    expect(mocks.verifyWebhook).toHaveBeenCalledWith("the-raw-body", "the-sig");
  });
});

describe("webhook applies a verified event", () => {
  it("processes a verified subscription event and returns 200", async () => {
    const event = { id: "evt_1", type: "customer.subscription.created" };
    mocks.verifyWebhook.mockReturnValue({ ok: true, event });
    mocks.handleVerifiedWebhookEvent.mockResolvedValue(undefined);
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mocks.handleVerifiedWebhookEvent).toHaveBeenCalledWith(event);
    await expect(res.json()).resolves.toEqual({ received: true });
  });

  it("returns 500 (so Stripe retries) if processing throws — idempotency makes retry safe", async () => {
    mocks.verifyWebhook.mockReturnValue({ ok: true, event: { id: "evt_1", type: "customer.subscription.deleted" } });
    mocks.handleVerifiedWebhookEvent.mockRejectedValue(new Error("db down"));
    const res = await POST(req());
    expect(res.status).toBe(500);
  });
});
