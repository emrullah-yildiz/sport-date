"use client";

import { useState } from "react";

import { BRAND_NAME } from "@/lib/brand";

// Member-facing Rally Plus surface (CX-20260701-plus-billing-management-ui).
//
// HONEST + FAIL-CLOSED. This component renders NOTHING unless the server has told
// it billing is actually configured (`billingConfigured`). When billing is dormant
// (flag off / no keys — the dev/CI/pre-go-live default) the whole surface is hidden
// so nothing ever implies a member can pay or is a subscriber. The server decides
// `billingConfigured` and `isPlus`; the client never reads keys and never claims
// Plus on its own.
//
// GUARDRAILS: describes only the allowed convenience/richness perks. Safety and
// core participation are stated as free forever, never gated. No forbidden perk
// (boosts, likes, priority, "who viewed you", extra photos, popularity). No
// urgency, scarcity, countdown, or guilt loop. Cancel is delegated to Stripe's
// hosted Billing Portal (cancel-as-easy-as-subscribe).

type PlusBillingProps = {
  /** Server-computed: is Stripe billing configured (flag on + keys present)? */
  billingConfigured: boolean;
  /** Server-computed via the fail-closed entitlement seam: is this member Plus? */
  isPlus: boolean;
};

const PLUS_PERKS = [
  "Advanced discovery filters — distance, schedule, and more languages, so the right games surface faster.",
  "Richer profile customization and a few extra personality prompts.",
  "Your own meet and reflection history, in a richer view.",
  "A supporter badge — a quiet thank-you, never a ranking.",
  "Early access to new, non-safety features.",
];

export default function PlusBilling({ billingConfigured, isPlus }: PlusBillingProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // FAIL CLOSED: when billing is dormant the surface is entirely hidden. No price is
  // shown as a live offer, no pay action exists.
  if (!billingConfigured) return null;

  async function start(path: string, fallbackError: string) {
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch(path, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || fallbackError);
      if (typeof result.url === "string" && result.url.length > 0) {
        window.location.assign(result.url);
        return;
      }
      throw new Error(fallbackError);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fallbackError);
      setBusy(false);
    }
  }

  return (
    <section className="plus-panel" aria-labelledby="plus-title">
      <p className="panel-label">{BRAND_NAME} Plus</p>
      {isPlus ? (
        <>
          <h2 id="plus-title">You’re a supporter</h2>
          <p>
            Thank you for supporting {BRAND_NAME}. You have Plus. Safety and joining games are always
            free — Plus only adds convenience and a little extra expression.
          </p>
          <button
            type="button"
            className="plus-manage"
            onClick={() => void start("/api/billing/portal", "The billing portal couldn’t be opened. Please try again.")}
            disabled={busy}
          >
            {busy ? "Opening…" : "Manage or cancel"}
          </button>
          <p className="plus-fineprint">
            Manage your payment method, see your renewal date, or cancel — cancelling is as easy as
            subscribing, on Stripe’s secure page.
          </p>
        </>
      ) : (
        <>
          <h2 id="plus-title">Support {BRAND_NAME} with Plus</h2>
          <p className="plus-price">
            <strong>€6.99/month</strong> <span>VAT included</span>
          </p>
          <p>
            Plus is convenience and expression only. <strong>Safety and joining games are always
            free</strong>, and photos are capped at 6 for everyone. You can cancel any time, as
            easily as you subscribe.
          </p>
          <ul className="plus-perks" aria-label="What Plus adds">
            {PLUS_PERKS.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
          <button
            type="button"
            className="plus-upgrade"
            onClick={() => void start("/api/billing/checkout", "Checkout couldn’t be started. Please try again.")}
            disabled={busy}
          >
            {busy ? "Starting…" : "Upgrade to Plus"}
          </button>
          <p className="plus-fineprint">
            An annual option (about two months free) may be offered at checkout — never as a hidden
            default.
          </p>
        </>
      )}
      {message ? (
        <p role="status" className="plus-message">
          {message}
        </p>
      ) : null}
    </section>
  );
}
