import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock the Stripe SDK constructor. Every instance shares these mock fns so tests
// can assert on the calls without any network / real charge. Defined via
// vi.hoisted so the vi.mock factory (hoisted to the top) can safely reference them.
const { checkoutCreate, customersCreate, constructEvent, portalCreate, StripeMock } = vi.hoisted(() => {
  const checkoutCreate = vi.fn();
  const customersCreate = vi.fn();
  const constructEvent = vi.fn();
  const portalCreate = vi.fn();
  class StripeMock {
    static instances = 0;
    checkout = { sessions: { create: checkoutCreate } };
    customers = { create: customersCreate };
    webhooks = { constructEvent };
    billingPortal = { sessions: { create: portalCreate } };
    constructor() {
      StripeMock.instances += 1;
    }
  }
  return { checkoutCreate, customersCreate, constructEvent, portalCreate, StripeMock };
});

vi.mock("stripe", () => ({ default: StripeMock }));

import { createBillingPortalSession, createSubscriptionCheckout, isBillingConfigured, verifyWebhook } from "./stripe";

const KEYS = {
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_PRICE_ID: "price_dummy_6_99",
  STRIPE_WEBHOOK_SECRET: "whsec_dummy",
  BILLING_ENABLED: "true",
} as const;

function setConfigured() {
  for (const [k, v] of Object.entries(KEYS)) process.env[k] = v;
}
function clearConfig() {
  for (const k of Object.keys(KEYS)) delete process.env[k];
}

beforeEach(() => {
  checkoutCreate.mockReset();
  customersCreate.mockReset();
  constructEvent.mockReset();
  portalCreate.mockReset();
  StripeMock.instances = 0;
  clearConfig();
});

afterEach(() => {
  clearConfig();
});

describe("fail closed when the flag is off / keys absent (dev/CI/default-prod)", () => {
  it("reports billing not configured with no keys", () => {
    expect(isBillingConfigured()).toBe(false);
  });

  it("is not configured when the flag is off even with keys present", () => {
    setConfigured();
    process.env.BILLING_ENABLED = "false";
    expect(isBillingConfigured()).toBe(false);
  });

  it("is not configured when a single key is missing", () => {
    setConfigured();
    delete process.env.STRIPE_PRICE_ID;
    expect(isBillingConfigured()).toBe(false);
  });

  it("checkout returns not-configured and NEVER constructs Stripe or charges", async () => {
    const result = await createSubscriptionCheckout({
      userId: "42",
      email: "m@example.com",
      existingCustomerId: null,
      successUrl: "https://app/ok",
      cancelUrl: "https://app/no",
    });
    expect(result).toEqual({ ok: false, reason: "not-configured" });
    expect(StripeMock.instances).toBe(0);
    expect(checkoutCreate).not.toHaveBeenCalled();
    expect(customersCreate).not.toHaveBeenCalled();
  });

  it("webhook verification returns not-configured and never verifies", () => {
    expect(verifyWebhook("{}", "sig")).toEqual({ ok: false, reason: "not-configured" });
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("billing portal returns not-configured and NEVER constructs Stripe", async () => {
    const result = await createBillingPortalSession({ customerId: "cus_x", returnUrl: "https://app/profile" });
    expect(result).toEqual({ ok: false, reason: "not-configured" });
    expect(StripeMock.instances).toBe(0);
    expect(portalCreate).not.toHaveBeenCalled();
  });
});

describe("when fully configured (all keys + flag on)", () => {
  beforeEach(() => setConfigured());

  it("is configured", () => {
    expect(isBillingConfigured()).toBe(true);
  });

  it("builds a subscription-mode checkout session with the €6.99 price id, reusing an existing customer", async () => {
    checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    const result = await createSubscriptionCheckout({
      userId: "42",
      email: "m@example.com",
      existingCustomerId: "cus_existing",
      successUrl: "https://app/ok",
      cancelUrl: "https://app/no",
    });
    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.test/session" });
    // Existing customer reused — no new customer created.
    expect(customersCreate).not.toHaveBeenCalled();
    const arg = checkoutCreate.mock.calls[0][0];
    expect(arg.mode).toBe("subscription");
    expect(arg.customer).toBe("cus_existing");
    expect(arg.line_items).toEqual([{ price: "price_dummy_6_99", quantity: 1 }]);
    expect(arg.client_reference_id).toBe("42");
  });

  it("creates a Stripe customer on first checkout and persists it via the callback", async () => {
    customersCreate.mockResolvedValue({ id: "cus_new" });
    checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    const onCustomerCreated = vi.fn().mockResolvedValue(undefined);
    const result = await createSubscriptionCheckout({
      userId: "42",
      email: "m@example.com",
      existingCustomerId: null,
      successUrl: "https://app/ok",
      cancelUrl: "https://app/no",
      onCustomerCreated,
    });
    expect(result.ok).toBe(true);
    expect(customersCreate).toHaveBeenCalledTimes(1);
    expect(onCustomerCreated).toHaveBeenCalledWith("cus_new");
    expect(checkoutCreate.mock.calls[0][0].customer).toBe("cus_new");
  });

  it("returns error (never throws) when Stripe checkout fails", async () => {
    checkoutCreate.mockRejectedValue(new Error("stripe down"));
    const result = await createSubscriptionCheckout({
      userId: "42",
      email: "m@example.com",
      existingCustomerId: "cus_existing",
      successUrl: "https://app/ok",
      cancelUrl: "https://app/no",
    });
    expect(result).toEqual({ ok: false, reason: "error" });
  });

  it("verifies a good webhook signature and returns the event", () => {
    const event = { id: "evt_1", type: "customer.subscription.updated" };
    constructEvent.mockReturnValue(event);
    const result = verifyWebhook("raw-body", "good-sig");
    expect(result).toEqual({ ok: true, event });
    expect(constructEvent).toHaveBeenCalledWith("raw-body", "good-sig", "whsec_dummy");
  });

  it("rejects a bad signature (never throws)", () => {
    constructEvent.mockImplementation(() => {
      throw new Error("signature mismatch");
    });
    expect(verifyWebhook("raw-body", "bad-sig")).toEqual({ ok: false, reason: "invalid-signature" });
  });

  it("rejects a missing signature without calling Stripe", () => {
    expect(verifyWebhook("raw-body", null)).toEqual({ ok: false, reason: "invalid-signature" });
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("opens a billing portal session for an existing customer (cancel-easy via Stripe)", async () => {
    portalCreate.mockResolvedValue({ url: "https://billing.stripe.test/session" });
    const result = await createBillingPortalSession({ customerId: "cus_existing", returnUrl: "https://app/profile" });
    expect(result).toEqual({ ok: true, url: "https://billing.stripe.test/session" });
    const arg = portalCreate.mock.calls[0][0];
    expect(arg.customer).toBe("cus_existing");
    expect(arg.return_url).toBe("https://app/profile");
  });

  it("returns error (never throws) when the member has no Stripe customer to manage", async () => {
    const result = await createBillingPortalSession({ customerId: null, returnUrl: "https://app/profile" });
    expect(result).toEqual({ ok: false, reason: "error" });
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it("returns error (never throws) when Stripe portal creation fails", async () => {
    portalCreate.mockRejectedValue(new Error("stripe down"));
    const result = await createBillingPortalSession({ customerId: "cus_existing", returnUrl: "https://app/profile" });
    expect(result).toEqual({ ok: false, reason: "error" });
  });
});
