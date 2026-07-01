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
// Idempotency: every entitlement change is guarded by an INSERT into
// `billing_webhook_events` (event id PRIMARY KEY). A re-delivered event is a safe
// no-op — the entitlement is written at most once per event id.
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
 * Claim a Stripe event id for one-time processing. Returns true if this is the
 * first time we have seen it (caller should process), false if already handled
 * (caller must skip — idempotent re-delivery).
 */
async function claimEvent(eventId: string, eventType: string): Promise<boolean> {
  const sql = getDatabase();
  const rows = (await sql`
    INSERT INTO billing_webhook_events (event_id, event_type)
    VALUES (${eventId}, ${eventType})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `) as unknown as Array<{ event_id: string }>;
  return rows.length > 0;
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

/** Apply the entitlement change for one subscription onto the member's row. */
async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserId(subscription);
  if (!userId) return; // unknown member — nothing to change (fail closed)

  const change = resolveEntitlementChange({
    status: subscription.status,
    currentPeriodEndUnixSeconds: readPeriodEnd(subscription),
  });

  const sql = getDatabase();
  if (change.grant) {
    // Active/trialing → set Plus until the period end and record the subscription.
    await sql`
      UPDATE users
      SET plus_until = ${change.plusUntil.toISOString()},
          stripe_subscription_id = ${subscription.id}
      WHERE id = ${userId}
    `;
  } else {
    // Canceled/unpaid/past_due/etc → clear Plus cleanly back to free. Only clear the
    // stored subscription id if it matches (a stale event must not wipe a newer sub).
    await sql`
      UPDATE users
      SET plus_until = NULL,
          stripe_subscription_id = CASE
            WHEN stripe_subscription_id = ${subscription.id} THEN NULL
            ELSE stripe_subscription_id
          END
      WHERE id = ${userId}
    `;
  }
}

/**
 * Apply a VERIFIED Stripe webhook event to the member's entitlement, idempotently.
 * The signature must already have been checked by @/lib/stripe.verifyWebhook.
 * Handles subscription created/updated/deleted; ignores unrelated event types.
 */
export async function handleVerifiedWebhookEvent(event: Stripe.Event): Promise<void> {
  const relevant =
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted";
  if (!relevant) return;

  // Idempotency gate — a repeated delivery of the same event id is a no-op.
  const first = await claimEvent(event.id, event.type);
  if (!first) return;

  const subscription = event.data.object as Stripe.Subscription;
  // A `deleted` event still carries the subscription object with status "canceled";
  // resolveEntitlementChange clears Plus for it. Force-clear on the deleted type in
  // case the object's status is stale.
  if (event.type === "customer.subscription.deleted") {
    await applySubscription({ ...subscription, status: "canceled" } as Stripe.Subscription);
    return;
  }
  await applySubscription(subscription);
}
