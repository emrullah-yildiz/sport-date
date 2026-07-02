import "server-only";

import { resolveEntitlementChange } from "@sport-date/domain";
import type Stripe from "stripe";

import { getDatabase } from "@/lib/db";

// Server-side billing persistence for Rally Plus test-mode subscriptions
// (CX-20260701-stripe-subscription-integration-test-mode).
//
// This lib owns the Stripe customer↔member linkage and applies verified webhook
// events to the existing `plus_until` entitlement (migration 025) via the pure
// `resolveEntitlementChange` mapping. It never talks to Stripe directly — the
// route hands it an already-VERIFIED event (signature checked in @/lib/stripe).
//
// Idempotency & atomicity (CX-20260701-stripe-webhook-idempotency-claim-before-
// apply-race): the idempotency claim (INSERT into `billing_webhook_events`, event
// id PRIMARY KEY) and the entitlement UPDATE are applied in the SAME single SQL
// statement via a CTE, so they commit together or not at all. The UPDATE only runs
// when the INSERT actually claimed the event id in this statement (its WHERE is
// gated on the claim CTE returning a row). Consequences:
//   * A re-delivered event id conflicts on the PK → the claim CTE yields no row →
//     the UPDATE touches nothing → a safe no-op (never a double-apply).
//   * Two concurrent deliveries race on the UNIQUE PK; exactly one wins the INSERT
//     and applies, the other is a no-op.
//   * If the UPDATE fails, the whole statement rolls back — the event is NOT left
//     marked processed (no poisoned marker), so Stripe's retry re-applies it.
// The entitlement is thus written EXACTLY ONCE per event id, even under retries,
// duplicate delivery, or concurrency.
//
// GUARDRAIL: the only member state this touches is `plus_until` + the two Stripe
// linkage columns. It grants no forbidden perk, gates nothing free, and stores no
// card/PAN data (Stripe holds all sensitive payment data).

/** The member's stored Stripe linkage, if any. */
export type MemberBilling = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

type BillingRow = { stripe_customer_id: string | null; stripe_subscription_id: string | null };

/** Read a member's Stripe linkage (both null for a member who never checked out). */
export async function getMemberBilling(userId: string): Promise<MemberBilling> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT stripe_customer_id, stripe_subscription_id
    FROM users WHERE id = ${userId} LIMIT 1
  `) as unknown as BillingRow[];
  const row = rows[0];
  return {
    stripeCustomerId: row?.stripe_customer_id ?? null,
    stripeSubscriptionId: row?.stripe_subscription_id ?? null,
  };
}

/** Persist a newly-created Stripe customer id against the member (customer↔member map). */
export async function linkStripeCustomer(userId: string, customerId: string): Promise<void> {
  const sql = getDatabase();
  await sql`
    UPDATE users SET stripe_customer_id = ${customerId}
    WHERE id = ${userId} AND stripe_customer_id IS NULL
  `;
}

/**
 * Record that a Stripe event id has been handled, when there is no entitlement
 * effect to apply (unknown member, or an ignored/no-op status). Idempotent via the
 * PK; a re-delivery is a safe no-op. Used ONLY for the effect-free path — an event
 * that DOES change the entitlement is claimed atomically WITH that change (see
 * `applyEntitlementAtomically`), never here, so a claim can never outlive a failed
 * apply.
 */
async function recordEventProcessed(eventId: string, eventType: string): Promise<void> {
  const sql = getDatabase();
  await sql`
    INSERT INTO billing_webhook_events (event_id, event_type)
    VALUES (${eventId}, ${eventType})
    ON CONFLICT (event_id) DO NOTHING
  `;
}

/** Resolve the member for a subscription event: prefer metadata, fall back to customer id. */
async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const metaUserId = subscription.metadata?.sportDateUserId;
  if (typeof metaUserId === "string" && metaUserId.trim().length > 0) return metaUserId.trim();

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return null;
  const sql = getDatabase();
  const rows = (await sql`
    SELECT id FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1
  `) as unknown as Array<{ id: string | number }>;
  const row = rows[0];
  return row ? String(row.id) : null;
}

/** Stripe sends current_period_end at the subscription and item level; read either. */
function readPeriodEnd(subscription: Stripe.Subscription): number | null {
  const top = (subscription as unknown as { current_period_end?: number }).current_period_end;
  if (typeof top === "number") return top;
  const item = subscription.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  if (item && typeof item.current_period_end === "number") return item.current_period_end;
  return null;
}

/**
 * Apply the entitlement change for one subscription onto the member's row AND claim
 * the triggering event id in the SAME single atomic SQL statement.
 *
 * The `claim` CTE does the idempotency INSERT (ON CONFLICT DO NOTHING); the UPDATE's
 * WHERE is gated on `EXISTS (SELECT 1 FROM claim)`, so the entitlement write happens
 * only when THIS statement newly claimed the event. Because a single Postgres
 * statement is atomic, the claim and the write commit together or roll back together:
 *   * re-delivery / concurrency → INSERT conflicts → claim CTE empty → UPDATE is a
 *     no-op (no double-apply);
 *   * an error in the UPDATE rolls the INSERT back too (no poisoned "processed"
 *     marker) → Stripe's retry re-applies.
 */
async function applySubscriptionAndClaim(
  eventId: string,
  eventType: string,
  subscription: Stripe.Subscription,
  userId: string,
): Promise<void> {
  const change = resolveEntitlementChange({
    status: subscription.status,
    currentPeriodEndUnixSeconds: readPeriodEnd(subscription),
  });

  const sql = getDatabase();
  if (change.grant) {
    // Active/trialing → set Plus until the period end and record the subscription.
    await sql`
      WITH claim AS (
        INSERT INTO billing_webhook_events (event_id, event_type)
        VALUES (${eventId}, ${eventType})
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      )
      UPDATE users
      SET plus_until = ${change.plusUntil.toISOString()},
          stripe_subscription_id = ${subscription.id}
      WHERE id = ${userId} AND EXISTS (SELECT 1 FROM claim)
    `;
  } else {
    // Canceled/unpaid/past_due/etc → clear Plus cleanly back to free. Only clear the
    // stored subscription id if it matches (a stale event must not wipe a newer sub).
    await sql`
      WITH claim AS (
        INSERT INTO billing_webhook_events (event_id, event_type)
        VALUES (${eventId}, ${eventType})
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      )
      UPDATE users
      SET plus_until = NULL,
          stripe_subscription_id = CASE
            WHEN stripe_subscription_id = ${subscription.id} THEN NULL
            ELSE stripe_subscription_id
          END
      WHERE id = ${userId} AND EXISTS (SELECT 1 FROM claim)
    `;
  }
}

/**
 * Apply a VERIFIED Stripe webhook event to the member's entitlement, exactly once.
 * The signature must already have been checked by @/lib/stripe.verifyWebhook.
 * Handles subscription created/updated/deleted; ignores unrelated event types.
 *
 * Atomicity: the idempotency claim and the entitlement write are one atomic SQL
 * statement (see `applySubscriptionAndClaim`), so a crash/error between "claim" and
 * "apply" is impossible — either both land or neither does, and a retry re-applies a
 * dropped write while a duplicate delivery is a no-op.
 */
export async function handleVerifiedWebhookEvent(event: Stripe.Event): Promise<void> {
  const relevant =
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted";
  if (!relevant) return;

  const raw = event.data.object as Stripe.Subscription;
  // A `deleted` event still carries the subscription object with status "canceled";
  // resolveEntitlementChange clears Plus for it. Force-clear on the deleted type in
  // case the object's status is stale.
  const subscription =
    event.type === "customer.subscription.deleted"
      ? ({ ...raw, status: "canceled" } as Stripe.Subscription)
      : raw;

  // Resolve the member first (a pure read that changes nothing). If none resolves
  // there is no entitlement effect to lose, so just record the event as processed
  // (idempotent) to stop Stripe retrying an event we can never act on.
  const userId = await resolveUserId(subscription);
  if (!userId) {
    await recordEventProcessed(event.id, event.type);
    return;
  }

  // Claim + apply atomically: the entitlement is written EXACTLY ONCE per event id.
  await applySubscriptionAndClaim(event.id, event.type, subscription, userId);
}
