import { NextResponse } from "next/server";

import { BRAND_NAME } from "@/lib/brand";
import { getMemberBilling, linkStripeCustomer } from "@/lib/billing";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";
import { createSubscriptionCheckout, isBillingConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

const privateHeaders = { "Cache-Control": "no-store" };

// Start a Rally Plus subscription checkout (€6.99/mo, test mode)
// (CX-20260701-stripe-subscription-integration-test-mode).
//
// Requires an authenticated member and a same-origin (CSRF-safe) request. When
// billing is not configured (the flag is off or any Stripe key is absent — the
// default in dev/CI and in production until go-live) it FAILS CLOSED with a calm
// 503 "coming soon": no Stripe call is made, no charge path is reachable, and the
// rest of the app is unaffected. The app never charges — it only returns Stripe's
// hosted Checkout URL; in test mode that accepts only Stripe test cards.
export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403, headers: privateHeaders });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: privateHeaders });
  }

  // Fail closed BEFORE any Stripe interaction: Plus simply isn't available yet.
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: `${BRAND_NAME} Plus isn’t available yet. The rest of ${BRAND_NAME} is unaffected.`, code: "billing-unavailable" },
      { status: 503, headers: privateHeaders },
    );
  }

  const origin = new URL(request.url).origin;
  const billing = await getMemberBilling(user.id);

  const result = await createSubscriptionCheckout({
    userId: user.id,
    email: user.email,
    existingCustomerId: billing.stripeCustomerId,
    successUrl: `${origin}/profile?billing=success`,
    cancelUrl: `${origin}/profile?billing=cancelled`,
    onCustomerCreated: (customerId) => linkStripeCustomer(user.id, customerId),
  });

  if (!result.ok) {
    if (result.reason === "not-configured") {
      return NextResponse.json(
        { error: `${BRAND_NAME} Plus isn’t available yet.`, code: "billing-unavailable" },
        { status: 503, headers: privateHeaders },
      );
    }
    return NextResponse.json(
      { error: "Checkout couldn’t be started. Please try again." },
      { status: 502, headers: privateHeaders },
    );
  }

  return NextResponse.json({ url: result.url }, { status: 200, headers: privateHeaders });
}
