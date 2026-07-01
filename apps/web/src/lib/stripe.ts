import "server-only";

import Stripe from "stripe";

// Test-mode Stripe billing seam for Rally Plus (€6.99/mo)
// (CX-20260701-stripe-subscription-integration-test-mode).
//
// This module is the ONE place the app talks to Stripe. It mirrors the fail-closed
// discipline of `photo-storage.ts`:
//
//   1. FAIL CLOSED on missing configuration. Billing needs four owner-provided env
//      values — STRIPE_SECRET_KEY, STRIPE_PRICE_ID (the €6.99 subscription price),
//      STRIPE_WEBHOOK_SECRET — AND an explicit BILLING_ENABLED=true flag. When ANY
//      is absent (the default in local/dev/CI and in production until the owner
//      flips the flag at go-live), `isBillingConfigured()` returns false, every
//      operation returns a typed { ok: false, reason: "not-configured" } (it NEVER
//      throws), Plus is simply unavailable ("coming soon"), and NO charge path is
//      reachable. The Stripe client is only ever constructed when fully configured.
//
//   2. NEVER hardcode / invent / commit a key. Keys live only in Vercel env; the
//      committed `.env.production.example` carries commented placeholders only.
//
//   3. All Stripe SDK calls are isolated behind this module so routes stay mockable
//      in tests (no network, no real charge) — the same seam pattern as photo-storage.
//
//   4. TEST MODE ONLY here. This code never adds live keys, accepts terms, or
//      creates a real charge; the app only ever redirects a member to Stripe's
//      hosted Checkout, which in test mode accepts only Stripe test cards.

export type BillingUnavailable = { ok: false; reason: "not-configured" | "error" };

export type CheckoutSessionResult = { ok: true; url: string } | BillingUnavailable;

export type BillingPortalResult = { ok: true; url: string } | BillingUnavailable;

export type WebhookEvent =
  | { ok: true; event: Stripe.Event }
  | { ok: false; reason: "not-configured" | "invalid-signature" };

type BillingConfig = {
  secretKey: string;
  priceId: string;
  webhookSecret: string;
};

/** Read one non-empty trimmed env value, or null. */
function readEnv(key: string): string | null {
  const value = process.env[key];
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

/** The explicit master switch. Only the literal string "true" enables billing. */
function isFlagEnabled(): boolean {
  return readEnv("BILLING_ENABLED") === "true";
}

/**
 * Fully-resolved billing config, or null when anything required is missing or the
 * flag is off. This is the single gate every operation checks first.
 */
function readBillingConfig(): BillingConfig | null {
  if (!isFlagEnabled()) return null;
  const secretKey = readEnv("STRIPE_SECRET_KEY");
  const priceId = readEnv("STRIPE_PRICE_ID");
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET");
  if (!secretKey || !priceId || !webhookSecret) return null;
  return { secretKey, priceId, webhookSecret };
}

/**
 * Whether Plus billing is available. False whenever the flag is off or any key is
 * absent (the dev/CI/default-prod state). Surfaces use this to render the calm
 * fail-closed "Plus isn't available yet" state instead of a broken checkout.
 */
export function isBillingConfigured(): boolean {
  return readBillingConfig() !== null;
}

/** Construct the Stripe client ONLY when fully configured; otherwise null. */
function getStripe(): { stripe: Stripe; config: BillingConfig } | null {
  const config = readBillingConfig();
  if (!config) return null;
  // No explicit apiVersion: the SDK pins its own default for this installed
  // version, which is deterministic per package version and avoids coupling this
  // file to a version string the SDK's types must also know about.
  const stripe = new Stripe(config.secretKey, { typescript: true });
  return { stripe, config };
}

/**
 * Ensure the member has a Stripe Customer, creating one on first use and reusing an
 * existing id. Returns null (never throws) when not configured or on any Stripe error.
 */
async function ensureCustomer(
  client: { stripe: Stripe },
  params: { userId: string; email: string; existingCustomerId: string | null },
): Promise<string | null> {
  if (params.existingCustomerId) return params.existingCustomerId;
  try {
    const customer = await client.stripe.customers.create({
      email: params.email,
      // Map the customer back to the member without storing any PII beyond what
      // Stripe already needs; the app persists this id via the billing lib.
      metadata: { sportDateUserId: params.userId },
    });
    return customer.id;
  } catch {
    return null;
  }
}

/**
 * Create a subscription-mode Checkout Session for the configured €6.99 price and
 * return its hosted URL. Fails closed (not-configured) when billing is off. The app
 * itself never charges — the member completes Stripe's hosted checkout (test cards
 * only in test mode).
 *
 * `onCustomerCreated` lets the caller persist a newly-created Stripe customer id
 * against the member (customer↔member linkage) before redirecting.
 */
export async function createSubscriptionCheckout(params: {
  userId: string;
  email: string;
  existingCustomerId: string | null;
  successUrl: string;
  cancelUrl: string;
  onCustomerCreated?: (customerId: string) => Promise<void>;
}): Promise<CheckoutSessionResult> {
  const client = getStripe();
  if (!client) return { ok: false, reason: "not-configured" };

  const customerId = await ensureCustomer(client, {
    userId: params.userId,
    email: params.email,
    existingCustomerId: params.existingCustomerId,
  });
  if (!customerId) return { ok: false, reason: "error" };

  if (!params.existingCustomerId && params.onCustomerCreated) {
    // Persist the linkage before checkout so a later webhook can resolve the member
    // even if this request is interrupted after the customer was created.
    await params.onCustomerCreated(customerId);
  }

  try {
    const session = await client.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: client.config.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      // Tie the member to the resulting subscription for webhook resolution.
      client_reference_id: params.userId,
      subscription_data: { metadata: { sportDateUserId: params.userId } },
      allow_promotion_codes: false,
    });
    if (!session.url) return { ok: false, reason: "error" };
    return { ok: true, url: session.url };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Open the Stripe-hosted Billing Portal for an existing customer and return its
 * URL. This is the "manage / cancel" seam: cancel-as-easy-as-subscribe (EU DFA /
 * UCPD) is delegated entirely to Stripe's hosted portal, so the app never builds a
 * custom cancel flow (and never a guilt loop). Fails closed (not-configured) when
 * billing is off; returns error (never throws) for a missing customer or any Stripe
 * error. The app itself never charges — the member self-serves on Stripe.
 */
export async function createBillingPortalSession(params: {
  customerId: string | null;
  returnUrl: string;
}): Promise<BillingPortalResult> {
  const client = getStripe();
  if (!client) return { ok: false, reason: "not-configured" };
  // A member with no Stripe customer has never checked out — there is nothing to
  // manage. Treat as an error (the route surfaces a calm message) rather than
  // inventing a customer.
  if (!params.customerId) return { ok: false, reason: "error" };

  try {
    const session = await client.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    if (!session.url) return { ok: false, reason: "error" };
    return { ok: true, url: session.url };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Verify a raw webhook body against STRIPE_WEBHOOK_SECRET and return the parsed
 * event. Returns not-configured when billing is off, or invalid-signature when the
 * signature does not verify (the route rejects that with 400). Never throws.
 */
export function verifyWebhook(rawBody: string, signature: string | null): WebhookEvent {
  const client = getStripe();
  if (!client) return { ok: false, reason: "not-configured" };
  if (!signature) return { ok: false, reason: "invalid-signature" };
  try {
    const event = client.stripe.webhooks.constructEvent(rawBody, signature, client.config.webhookSecret);
    return { ok: true, event };
  } catch {
    return { ok: false, reason: "invalid-signature" };
  }
}
