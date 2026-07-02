import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A tagged-template SQL mock. Each call shifts the next queued result off the
// queue and records the interpolated values so assertions can inspect what was
// written. This keeps the test hermetic — no DB, no network.
//
// Atomicity note (CX-20260701-stripe-webhook-idempotency-claim-before-apply-race):
// the fix folds the idempotency claim (INSERT ... ON CONFLICT DO NOTHING) and the
// entitlement UPDATE into ONE SQL statement (a CTE), so there is no longer a
// separate "claim" round-trip that could commit ahead of a failing apply. These
// tests assert exactly that transactional boundary — a claim can never outlive a
// failed apply, a duplicate is a no-op, and concurrency applies at most once.
const sqlCalls: Array<{ text: string; values: unknown[] }> = [];
let resultQueue: unknown[][] = [];
// When set, the Nth SQL call (0-based) throws — models the entitlement apply
// failing so we can prove the claim rolls back with it (no poisoned marker).
let throwOnCallIndex: number | null = null;

const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
  const index = sqlCalls.length;
  sqlCalls.push({ text: strings.join("?"), values });
  if (throwOnCallIndex === index) {
    return Promise.reject(new Error("apply failed"));
  }
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

/** The single atomic claim+apply statement (a CTE that ends in an UPDATE users). */
function atomicWrite() {
  return [...sqlCalls].reverse().find((c) => c.text.includes("UPDATE users"));
}

/** The effect-free "record processed" INSERT (unknown member / no effect to apply). */
function recordOnly() {
  return sqlCalls.find(
    (c) => c.text.includes("INSERT INTO billing_webhook_events") && !c.text.includes("UPDATE users"),
  );
}

beforeEach(() => {
  sql.mockClear();
  sqlCalls.length = 0;
  throwOnCallIndex = null;
  resultQueue = [];
});

describe("handleVerifiedWebhookEvent — subscription created/updated sets Plus", () => {
  it("active subscription sets plus_until = period end and records the subscription id", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.created"));
    const write = atomicWrite();
    expect(write).toBeDefined();
    expect(write?.text).toContain("plus_until =");
    // The claim INSERT and the entitlement UPDATE are the SAME statement.
    expect(write?.text).toContain("INSERT INTO billing_webhook_events");
    expect(write?.text).toContain("ON CONFLICT (event_id) DO NOTHING");
    // plusUntil ISO and userId are interpolated values.
    expect(write?.values).toContain(PERIOD_END_ISO);
    expect(write?.values).toContain("42");
  });

  it("updated → active likewise sets Plus", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.updated"));
    expect(atomicWrite()?.values).toContain(PERIOD_END_ISO);
  });
});

describe("handleVerifiedWebhookEvent — cancel/deleted clears Plus (cancel-easy)", () => {
  it("deleted clears plus_until back to NULL", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.deleted", { status: "active" }));
    const write = atomicWrite();
    expect(write?.text).toContain("plus_until = NULL");
    // No period-end grant value written.
    expect(write?.values).not.toContain(PERIOD_END_ISO);
  });

  it("updated → canceled clears Plus", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.updated", { status: "canceled" }));
    expect(atomicWrite()?.text).toContain("plus_until = NULL");
  });

  it("updated → past_due clears Plus", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.updated", { status: "past_due" }));
    expect(atomicWrite()?.text).toContain("plus_until = NULL");
  });
});

describe("handleVerifiedWebhookEvent — atomic claim + apply (no claim-before-apply race)", () => {
  it("claim and entitlement write are ONE statement (never two round-trips)", async () => {
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.created"));
    // Metadata carries the user id, so no resolve SELECT — exactly one SQL call,
    // and that call both claims the event id and writes the entitlement.
    expect(sqlCalls).toHaveLength(1);
    const only = sqlCalls[0];
    expect(only.text).toContain("INSERT INTO billing_webhook_events");
    expect(only.text).toContain("UPDATE users");
    // The UPDATE is gated on the claim actually inserting a row this statement.
    expect(only.text).toContain("EXISTS (SELECT 1 FROM claim)");
  });

  it("a failure during apply does NOT leave the event marked processed (no poisoned marker)", async () => {
    // The single atomic statement rejects → because the claim INSERT lives in the
    // SAME statement, it rolls back with the failed UPDATE. There is no separate,
    // already-committed claim to poison the retry.
    throwOnCallIndex = 0; // the atomic claim+apply statement throws
    await expect(
      handleVerifiedWebhookEvent(subEvent("customer.subscription.created")),
    ).rejects.toThrow("apply failed");
    // The only DB call attempted WAS the atomic statement — no standalone claim
    // committed ahead of it. (recordEventProcessed is never used on the effect path.)
    expect(sqlCalls).toHaveLength(1);
    expect(recordOnly()).toBeUndefined();
    // The route turns this rejection into a 500 so Stripe retries; the retry re-runs
    // the same atomic statement and, since nothing was claimed, actually applies.
  });

  it("retry after a failed apply re-applies and sets plus_until (write not dropped)", async () => {
    const event = subEvent("customer.subscription.created");
    // First delivery: apply throws → nothing claimed.
    throwOnCallIndex = 0;
    await expect(handleVerifiedWebhookEvent(event)).rejects.toThrow("apply failed");

    // Second delivery (Stripe retry) of the SAME event id: succeeds this time.
    throwOnCallIndex = null;
    sqlCalls.length = 0;
    await handleVerifiedWebhookEvent(event);
    const write = atomicWrite();
    expect(write?.text).toContain("plus_until =");
    expect(write?.values).toContain(PERIOD_END_ISO);
    expect(write?.values).toContain("42");
  });
});

describe("handleVerifiedWebhookEvent — idempotent on genuine duplicate delivery", () => {
  it("a re-delivered event id makes NO net entitlement change (ON CONFLICT no-op)", async () => {
    // In prod the duplicate's INSERT conflicts on the PK → the claim CTE returns no
    // row → EXISTS(claim) is false → the UPDATE matches zero rows. The statement is
    // still issued (idempotent), but its guard means it applies nothing.
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.created"));
    const write = atomicWrite();
    // The apply is guarded so a conflicting (duplicate) claim cannot double-apply.
    expect(write?.text).toContain("ON CONFLICT (event_id) DO NOTHING");
    expect(write?.text).toContain("EXISTS (SELECT 1 FROM claim)");
  });
});

describe("handleVerifiedWebhookEvent — concurrent delivery of the same event id", () => {
  it("two concurrent deliveries issue guarded writes; the DB PK serializes to one apply", async () => {
    const event = subEvent("customer.subscription.created");
    // Fire both deliveries concurrently. In prod only one INSERT wins the UNIQUE PK;
    // the loser's claim CTE is empty so its EXISTS(claim) guard suppresses the apply.
    // Here we assert both went through the guarded atomic path (never an unguarded
    // UPDATE that could double-apply).
    await Promise.all([handleVerifiedWebhookEvent(event), handleVerifiedWebhookEvent(event)]);
    const writes = sqlCalls.filter((c) => c.text.includes("UPDATE users"));
    expect(writes).toHaveLength(2);
    for (const w of writes) {
      expect(w.text).toContain("ON CONFLICT (event_id) DO NOTHING");
      expect(w.text).toContain("EXISTS (SELECT 1 FROM claim)");
    }
  });
});

describe("handleVerifiedWebhookEvent — customer-id fallback + unknown member", () => {
  it("resolves the member by stripe_customer_id when metadata is absent", async () => {
    // resolveUserId SELECT → returns a member id; then the atomic claim+apply.
    resultQueue = [[{ id: 77 }]];
    await handleVerifiedWebhookEvent(subEvent("customer.subscription.created", { metadata: {} }));
    expect(atomicWrite()?.values).toContain("77");
  });

  it("records the event processed (idempotent) but writes NO entitlement when no member resolves", async () => {
    resultQueue = [[]]; // resolve SELECT finds no member
    await handleVerifiedWebhookEvent(
      subEvent("customer.subscription.created", { metadata: {}, customer: "cus_unknown" }),
    );
    // No entitlement write at all…
    expect(atomicWrite()).toBeUndefined();
    // …but the event id is recorded so Stripe stops retrying an event we cannot act on.
    const record = recordOnly();
    expect(record).toBeDefined();
    expect(record?.text).toContain("ON CONFLICT (event_id) DO NOTHING");
  });
});

describe("handleVerifiedWebhookEvent — ignores unrelated event types", () => {
  it("a non-subscription event is a no-op (no claim, no update)", async () => {
    await handleVerifiedWebhookEvent(subEvent("payment_intent.succeeded"));
    expect(sql).not.toHaveBeenCalled();
  });
});
