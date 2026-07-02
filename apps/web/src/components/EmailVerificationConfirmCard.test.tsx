import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EmailVerificationConfirmCard, {
  VerificationCardBody,
  type VerificationState,
} from "./EmailVerificationConfirmCard";

// The confirm POST fires in a mount useEffect, which renderToStaticMarkup never runs.
// So the top-level component only renders the synchronous states here; the resolved
// async outcomes are asserted directly through the presentational VerificationCardBody
// (the exact JSX the container renders once the fetch resolves). The confirm route
// status branches themselves are covered by
// apps/web/src/app/api/auth/email-verification/confirm/route.test.ts.

function render(token: string) {
  return renderToStaticMarkup(<EmailVerificationConfirmCard token={token} />);
}

function renderState(state: VerificationState) {
  return renderToStaticMarkup(<VerificationCardBody state={state} />);
}

// A format-valid but non-existent token: passes isBrowserEmailVerificationToken so the
// component renders the loading state (the async fetch that follows never runs here).
const LOADING_TOKEN = `sdv_${"a".repeat(43)}`;

const POLITE_LIVE_REGION = /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/;
const ASSERTIVE_LIVE_REGION = /role="alert"[^>]*aria-live="assertive"|aria-live="assertive"[^>]*role="alert"/;
const FOCUSABLE_HEADING = /<h1[^>]*tabindex="-1"/i;

describe("EmailVerificationConfirmCard pending + synchronous states", () => {
  it("wraps the outcome heading/body in a polite live region while confirming", () => {
    const html = render(LOADING_TOKEN);
    expect(html).toMatch(POLITE_LIVE_REGION);
    expect(html).toMatch(/<h1[^>]*>Verifying your email<\/h1>/);
  });

  it("exposes the pending state programmatically (aria-busy + a status pending line)", () => {
    const html = render(LOADING_TOKEN);
    // The card is marked busy so 'verifying' is announced, not only shown...
    expect(html).toMatch(/aria-busy="true"/);
    // ...and the 'Checking secure token' line is itself a status region.
    expect(html).toMatch(/<span class="auth-flow-status" role="status">Checking secure token/);
  });

  it("makes the outcome heading a keyboard focus target so focus can move to it on resolve", () => {
    expect(render(LOADING_TOKEN)).toMatch(FOCUSABLE_HEADING);
  });

  it("announces the synchronous invalid state without revealing account existence", () => {
    const html = render("not-a-valid-token");
    expect(html).toMatch(POLITE_LIVE_REGION);
    expect(html).toMatch(/<h1[^>]*>Verification link invalid<\/h1>/);
    // Anti-enumeration: generic format copy, no account/email existence signal.
    // (renderToStaticMarkup HTML-escapes the apostrophe in "Rally's".)
    expect(html).toMatch(/does not match Rally(&#x27;|')s expected secure format/);
    expect(html).not.toMatch(/account exists|no account|already registered|not registered/i);
    expect(html).toMatch(/aria-busy="false"/);
  });

  it("announces the synchronous missing-token state inside the live region", () => {
    const html = render("");
    expect(html).toMatch(POLITE_LIVE_REGION);
    expect(html).toMatch(/<h1[^>]*>Verification link missing<\/h1>/);
    expect(html).toMatch(/aria-busy="false"/);
  });

  it("preserves the honest verification disclaimer verbatim", () => {
    expect(render(LOADING_TOKEN)).toContain(
      "Email verification confirms inbox access only. It does not verify identity, age, location accuracy, or in-person safety.",
    );
  });

  it("offers a precise deep link to the resend control on dead-end states, with Sign in / Create account kept as secondary", () => {
    for (const html of [render(""), render("not-a-valid-token")]) {
      // Primary recovery action: the exact account-security control, not a generic Sign in.
      expect(html).toMatch(/class="btn-primary"[^>]*href="\/profile#account-security"|href="\/profile#account-security"[^>]*class="btn-primary"/);
      expect(html).toContain("Get a new verification link");
      // Secondary options remain available.
      expect(html).toMatch(/href="\/login"/);
      expect(html).toMatch(/href="\/signup"/);
      // Honest, non-dark-pattern note that resending is auth-gated.
      expect(html).toContain("you may be asked to sign in first");
    }
  });
});

describe("VerificationCardBody announces the resolved async outcomes", () => {
  it("renders the verified outcome inside a polite live region with a focusable heading", () => {
    const html = renderState({ kind: "verified", title: "Email verified", body: "Your email is confirmed." });
    expect(html).toMatch(POLITE_LIVE_REGION);
    expect(html).toMatch(/<h1[^>]*>Email verified<\/h1>/);
    expect(html).toMatch(FOCUSABLE_HEADING);
    // No longer busy once resolved; forward actions point at the signed-in surfaces.
    expect(html).toMatch(/aria-busy="false"/);
    expect(html).toMatch(/href="\/profile"/);
  });

  it("renders the expired outcome inside a polite live region with a focusable heading", () => {
    const html = renderState({ kind: "expired", title: "Verification link expired", body: "This link has expired." });
    expect(html).toMatch(POLITE_LIVE_REGION);
    expect(html).toMatch(/<h1[^>]*>Verification link expired<\/h1>/);
    expect(html).toMatch(FOCUSABLE_HEADING);
    expect(html).toMatch(/aria-busy="false"/);
  });

  it("announces the hard-error outcomes assertively so a member who needs a fresh link notices", () => {
    const unavailable = renderState({
      kind: "unavailable",
      title: "Verification temporarily unavailable",
      body: "Try again shortly.",
    });
    expect(unavailable).toMatch(ASSERTIVE_LIVE_REGION);
    expect(unavailable).toMatch(FOCUSABLE_HEADING);

    const error = renderState({
      kind: "error",
      title: "Verification could not finish",
      body: "A network or server error interrupted verification.",
    });
    expect(error).toMatch(ASSERTIVE_LIVE_REGION);
    expect(error).toMatch(FOCUSABLE_HEADING);
  });
});
