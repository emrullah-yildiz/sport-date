import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A tagged-template SQL mock. Each call shifts the next queued result off the
// queue and records the interpolated values so assertions can inspect what was
// written. This keeps the test hermetic — no DB, no network.
const sqlCalls: Array<{ text: string; values: unknown[] }> = [];
let resultQueue: unknown[][] = [];

const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
  sqlCalls.push({ text: strings.join("?"), values });
  return Promise.resolve(resultQueue.shift() ?? []);
});

vi.mock("@/lib/db", () => ({ getDatabase: () => sql }));

import { handleVerifiedWebhookEvent } from "./billing";

const PERIOD_END_UNIX = 1_800_000_000; // future
const PERIOD_END_ISO = new Date(PERIOD_END_UNIX * 1000).toISOString();

function subEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type,
    data: {
      object: {
        id: "sub_123",
        status: "active",
        customer: "cus_abc",
        current_period_end: PERIOD_END_UNIX,
        metadata: { sportDateUserId: "42" },
        items: { data: [{ current_period_end: PERIOD_END_UNIX }] },
        ...overrides,
      },
    },
  } as unknown as import("stripe").Stripe.Event;
}

function lastUpdate() {
  return [...sqlCalls].reverse().find((c) => c.text.includes("UPDATE users"));
}

beforeEach(() => {
  sql.mockClear();
  sqlCalls.length = 0;
  // Default: claimEvent's INSERT ... RETURNING returns a row (first delivery).
  resultQueue = [[{ event_id: "evt" }]];
});

describe("handleVerifiedWebhookEvent — subscription created/updated sets Plus", () => {
  it("active subscription sets plus_until = period end and records the subscription id", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.created"));
    const update = lastUpdate();
    expect(update).toBeDefined();
    expect(update?.text).toContain("plus_until =");
    // plusUntil ISO and userId are interpolated values.
    expect(update?.values).toContain(PERIOD_END_ISO);
    expect(update?.values).toContain("42");
  });

  it("updated → active likewise sets Plus", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.updated"));
    expect(lastUpdate()?.values).toContain(PERIOD_END_ISO);
  });
});

describe("handleVerifiedWebhookEvent — cancel/deleted clears Plus (cancel-easy)", () => {
  it("deleted clears plus_until back to NULL", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.deleted", { status: "active" }));
    const update = lastUpdate();
    expect(update?.text).toContain("plus_until = NULL");
    // No period-end grant value written.
    expect(update?.values).not.toContain(PERIOD_END_ISO);
  });

  it("updated → canceled clears Plus", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.updated", { status: "canceled" }));
    expect(lastUpdate()?.text).toContain("plus_until = NULL");
  });

  it("updated → past_due clears Plus", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.updated", { status: "past_due" }));
    expect(lastUpdate()?.text).toContain("plus_until = NULL");
  });
});

describe("handleVerifiedWebhookEvent — idempotent on repeated delivery", () => {
  it("a re-delivered event id makes NO entitlement change", async () => {
    // claimEvent INSERT ... ON CONFLICT DO NOTHING returns no rows the second time.
    resultQueue = [[]];
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.created"));
    expect(lastUpdate()).toBeUndefined();
  });
});

describe("handleVerifiedWebhookEvent — customer-id fallback + unknown member", () => {
  it("resolves the member by stripe_customer_id when metadata is absent", async () => {
    // claim → row; resolveUserId SELECT → returns a member id; then the UPDATE.
    resultQueue = [[{ event_id: "evt" }], [{ id: 77 }]];
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.created", { metadata: {} }));
    expect(lastUpdate()?.values).toContain("77");
  });

  it("does nothing (fails closed) when no member can be resolved", async () => {
    resultQueue = [[{ event_id: "evt" }], []]; // claim ok, but no member found
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.created", { metadata: {}, customer: "cus_unknown" }));
    expect(lastUpdate()).toBeUndefined();
  });
});

describe("handleVerifiedWebhookEvent — ignores unrelated event types", () => {
  it("a non-subscription event is a no-op (no claim, no update)", async () => {
    await handleVerifiedWebhookEvent(subEvent("payment_intent.succeeded"));
    expect(sql).not.toHaveBeenCalled();
  });
});
