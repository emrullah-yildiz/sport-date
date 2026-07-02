import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PasswordResetConfirmCard from "./PasswordResetConfirmCard";

// renderToStaticMarkup never runs effects, so only the synchronous states render here:
// the initial missing/malformed dead-ends (before any submit) and the valid-token
// password form. The submit-error dead-end (server-rejected valid-format token) is a
// state transition covered by the client behavior; the confirm route status branches
// are covered by apps/web/src/app/api/auth/password-reset/confirm/route.test.ts.

function render(token: string) {
  return renderToStaticMarkup(<PasswordResetConfirmCard token={token} />);
}

// A syntactically valid reset token (passes isBrowserPasswordResetToken).
const VALID_TOKEN = `sdp_${"a".repeat(43)}`;

describe("PasswordResetConfirmCard dead-end recovery action", () => {
  it("offers an inline request-a-fresh-link form on the missing-token dead-end", () => {
    const html = render("");
    // The dead-end still keeps its alert and secondary Back to sign in...
    expect(html).toMatch(/role="alert"/);
    expect(html).toMatch(/href="\/login"/);
    // ...but now leads with a real inline recovery action wired to the request endpoint
    // (the ForgotPasswordPanel form), open by default so no hunting is required.
    expect(html).toContain("Send me a new reset link");
    expect(html).toMatch(/id="forgot-password-panel"/);
    expect(html).toMatch(/id="forgot-password-email"/);
  });

  it("offers the inline recovery action on the malformed-token dead-end", () => {
    const html = render("not-a-valid-token");
    expect(html).toMatch(/This reset link is invalid/);
    expect(html).toContain("Send me a new reset link");
    expect(html).toMatch(/id="forgot-password-email"/);
  });

  it("preserves the anti-enumeration copy on the inline request form (no existence leak)", () => {
    const html = render("");
    // The panel reuses the same request form whose success copy never reveals whether
    // the email is registered.
    expect(html).toMatch(/without exposing whether the account exists/i);
    expect(html).not.toMatch(/no such account|account exists for that email|not registered/i);
  });

  it("does not show the recovery form when the token is valid (the password form is shown instead)", () => {
    const html = render(VALID_TOKEN);
    // Valid token => choose-a-new-password form, no dead-end recovery panel.
    expect(html).toMatch(/id="reset-password"/);
    expect(html).toMatch(/autocomplete="new-password"/i);
    expect(html).not.toContain("Send me a new reset link");
  });
});
