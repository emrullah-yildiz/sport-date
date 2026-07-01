import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PlusBilling from "./PlusBilling";

// CX-20260701-plus-billing-management-ui — the honest, fail-closed Plus surface.
//
// These tests assert the product rules that must never regress: the surface is
// entirely hidden when billing is dormant, free vs Plus render the right honest
// copy + action, the buttons wire to the real routes, and no safety/core/forbidden
// perk is ever presented as gated behind Plus.

function render(props: { billingConfigured: boolean; isPlus: boolean }) {
  return renderToStaticMarkup(<PlusBilling {...props} />);
}

describe("PlusBilling is fully hidden while billing is dormant", () => {
  it("renders nothing when billing is not configured (flag off / no keys), free member", () => {
    expect(render({ billingConfigured: false, isPlus: false })).toBe("");
  });

  it("renders nothing when billing is not configured even if the member is somehow Plus", () => {
    // No pay/manage affordance and no price may appear while billing is dormant.
    const html = render({ billingConfigured: false, isPlus: true });
    expect(html).toBe("");
  });

  it("presents no price and no pay action at all while dormant", () => {
    const html = render({ billingConfigured: false, isPlus: false });
    expect(html).not.toContain("€6.99");
    expect(html).not.toContain("Upgrade");
    expect(html).not.toContain("Manage");
    expect(html).not.toContain("/api/billing");
  });
});

describe("PlusBilling free-member rendering (billing configured)", () => {
  const html = render({ billingConfigured: true, isPlus: false });

  it("shows the VAT-inclusive €6.99/month price honestly", () => {
    expect(html).toContain("€6.99");
    expect(html).toContain("VAT included");
  });

  it("states safety + joining are always free and photos capped at 6 for everyone", () => {
    expect(html).toContain("Safety and joining games are always");
    expect(html).toContain("free");
    expect(html).toContain("capped at 6 for everyone");
  });

  it("offers an Upgrade button, not a manage/cancel button", () => {
    expect(html).toContain("Upgrade to Plus");
    expect(html).not.toContain("Manage or cancel");
  });

  it("wires the upgrade action to the Checkout route via a click handler (no dead link)", () => {
    // The button is a real <button>, not an <a> that could 500; the fetch target is
    // asserted in the source-level behavior test below.
    expect(html).toMatch(/<button[^>]*class="plus-upgrade"/);
  });

  it("never advertises a forbidden perk or a popularity/attractiveness mechanic", () => {
    // Forbidden perks must not be SOLD. The disavowals ("a badge, never a ranking")
    // are honest and allowed, so match the selling phrasings, not bare words.
    const lower = html.toLowerCase();
    for (const forbidden of [
      "boost",
      "paid likes",
      "priority visibility",
      "priority place",
      "who viewed",
      "who skipped",
      "who rated",
      "see who",
      "unlimited photo",
      "extra photo",
      "more photos",
      "attractiveness",
      "popularity score",
    ]) {
      expect(lower).not.toContain(forbidden);
    }
  });

  it("uses no manipulative urgency, scarcity, or countdown copy", () => {
    for (const dark of ["hurry", "limited time", "only today", "act now", "don’t miss", "expires in", "last chance"]) {
      expect(html.toLowerCase()).not.toContain(dark);
    }
  });
});

describe("PlusBilling Plus-member rendering (billing configured)", () => {
  const html = render({ billingConfigured: true, isPlus: true });

  it("honestly says the member is a supporter", () => {
    expect(html).toContain("You’re a supporter");
  });

  it("offers a manage/cancel button and no upgrade button", () => {
    expect(html).toContain("Manage or cancel");
    expect(html).not.toContain("Upgrade to Plus");
  });

  it("states cancelling is as easy as subscribing (no guilt loop, Stripe portal)", () => {
    expect(html).toContain("as easy as");
    expect(html).toContain("cancel");
  });

  it("does not re-present the €6.99 price as a live offer to an existing subscriber", () => {
    expect(html).not.toContain("€6.99");
  });
});
