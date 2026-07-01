import { NextResponse } from "next/server";

import { handleVerifiedWebhookEvent } from "@/lib/billing";
import { isBillingConfigured, verifyWebhook } from "@/lib/stripe";

export const runtime = "nodejs";

const privateHeaders = { "Cache-Control": "no-store" };

// Stripe subscription webhook (test mode)
// (CX-20260701-stripe-subscription-integration-test-mode).
//
// This is a server-to-server callback from Stripe, NOT a browser request — the
// Stripe SIGNATURE is the authentication, so there is no CSRF/session check. The
// raw request body is read verbatim and verified against STRIPE_WEBHOOK_SECRET;
// an unverified body is rejected with 400 and no state changes. On a verified
// subscription created/updated (active/trialing) the member's `plus_until` is set
// to the current period end; on deleted/canceled/unpaid it is cleared back to
// free. Processing is idempotent on the Stripe event id.
//
// Fails closed when billing is not configured (flag off / keys absent): the route
// exists but reports not-configured (503) and grants no Plus. No charge path here.
export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing is not enabled." }, { status: 503, headers: privateHeaders });
  }

  // Read the RAW body verbatim — signature verification depends on the exact bytes.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  const verified = verifyWebhook(rawBody, signature);
  if (!verified.ok) {
    if (verified.reason === "not-configured") {
      return NextResponse.json({ error: "Billing is not enabled." }, { status: 503, headers: privateHeaders });
    }
    // Bad or missing signature — reject, change nothing.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400, headers: privateHeaders });
  }

  try {
    await handleVerifiedWebhookEvent(verified.event);
  } catch {
    // Return 500 so Stripe retries; idempotency makes the retry safe.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500, headers: privateHeaders });
  }

  return NextResponse.json({ received: true }, { status: 200, headers: privateHeaders });
}
