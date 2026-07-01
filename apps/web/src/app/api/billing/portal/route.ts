import { NextResponse } from "next/server";

import { getMemberBilling } from "@/lib/billing";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";
import { createBillingPortalSession, isBillingConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

const privateHeaders = { "Cache-Control": "no-store" };

// Open the Stripe Billing Portal so a Plus member can manage payment/renewal and
// cancel as easily as they subscribed (CX-20260701-plus-billing-management-ui;
// EU Digital Fairness Act / UCPD cancel-easy requirement).
//
// Requires an authenticated member and a same-origin (CSRF-safe) request. When
// billing is not configured (the flag is off or any Stripe key is absent — the
// default in dev/CI and in production until go-live) it FAILS CLOSED with a calm
// 503: no Stripe call is made and the rest of the app is unaffected. The cancel /
// renewal flow itself lives entirely on Stripe's hosted portal — the app builds no
// custom cancel path and never a guilt loop.
export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403, headers: privateHeaders });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: privateHeaders });
  }

  // Fail closed BEFORE any Stripe interaction: Plus management simply isn't available yet.
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: "Sport Date Plus isn’t available yet. The rest of Sport Date is unaffected.", code: "billing-unavailable" },
      { status: 503, headers: privateHeaders },
    );
  }

  const origin = new URL(request.url).origin;
  const billing = await getMemberBilling(user.id);

  const result = await createBillingPortalSession({
    customerId: billing.stripeCustomerId,
    returnUrl: `${origin}/profile`,
  });

  if (!result.ok) {
    if (result.reason === "not-configured") {
      return NextResponse.json(
        { error: "Sport Date Plus isn’t available yet.", code: "billing-unavailable" },
        { status: 503, headers: privateHeaders },
      );
    }
    return NextResponse.json(
      { error: "The billing portal couldn’t be opened. Please try again." },
      { status: 502, headers: privateHeaders },
    );
  }

  return NextResponse.json({ url: result.url }, { status: 200, headers: privateHeaders });
}
