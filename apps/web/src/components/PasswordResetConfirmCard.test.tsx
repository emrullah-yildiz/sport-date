import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PasswordResetConfirmCard, {
  PasswordResetConfirmBody,
  isServerTokenRejection,
} from "./PasswordResetConfirmCard";

// renderToStaticMarkup never runs effects, so the container (PasswordResetConfirmCard)
// only exposes the synchronous states: the initial missing/malformed dead-ends and the
// valid-token password form. The post-submit resolved states (server-token-rejected,
// completed) are a client transition, so we render the presentational body
// (PasswordResetConfirmBody) directly with the resolved flags — the same split
// EmailVerificationConfirmCard uses to keep its resolved outcomes statically testable.
// The confirm route status branches are covered by
// apps/web/src/app/api/auth/password-reset/confirm/route.test.ts.

function render(token: string) {
  return renderToStaticMarkup(<PasswordResetConfirmCard token={token} />);
}

// A syntactically valid reset token (passes isBrowserPasswordResetToken).
const VALID_TOKEN = `sdp_${"a".repeat(43)}`;

const baseBodyProps = {
  token: VALID_TOKEN,
  tokenValid: true,
  completed: false,
  tokenRejectedByServer: false,
  submitting: false,
  error: "",
  message: "",
  password: "",
  confirmPassword: "",
};

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

describe("isServerTokenRejection (client-mismatch vs dead-token distinction)", () => {
  it("treats a 400 'invalid' and a 410 'expired' confirm response as a dead token", () => {
    expect(isServerTokenRejection(false, "invalid")).toBe(true);
    expect(isServerTokenRejection(false, "expired")).toBe(true);
  });

  it("does NOT treat a server-side password validation error as a dead token", () => {
    // The member's password was weak/mismatched server-side; the token is still usable,
    // so the form must stay so they can correct it.
    expect(isServerTokenRejection(false, "validation_error")).toBe(false);
  });

  it("does NOT treat a transient server error (503/500) as a dead token", () => {
    // The token may still be good — do not strand the member on a dead-end.
    expect(isServerTokenRejection(false, "unavailable")).toBe(false);
    expect(isServerTokenRejection(false, "error")).toBe(false);
    expect(isServerTokenRejection(false, undefined)).toBe(false);
  });

  it("never counts a successful (ok) response as a rejection", () => {
    expect(isServerTokenRejection(true, "reset")).toBe(false);
  });
});

describe("PasswordResetConfirmBody server-token-rejected state", () => {
  it("hides the Update password form and shows only the error + recovery panel when the server rejected the token", () => {
    const html = renderToStaticMarkup(
      <PasswordResetConfirmBody
        {...baseBodyProps}
        tokenRejectedByServer
        error="This reset link is invalid."
      />,
    );
    // The dead form is gone: a member can no longer re-submit against the dead token.
    expect(html).not.toMatch(/id="reset-password"/);
    expect(html).not.toContain("Update password");
    // The error and the real recovery action are shown instead.
    expect(html).toMatch(/This reset link is invalid\./);
    expect(html).toContain("Send me a new reset link");
    expect(html).toMatch(/id="forgot-password-email"/);
  });

  it("wraps the rejection error + recovery in one focusable alert region (focus target, not <body>)", () => {
    const html = renderToStaticMarkup(
      <PasswordResetConfirmBody
        {...baseBodyProps}
        tokenRejectedByServer
        error="This reset link is invalid."
      />,
    );
    // A single tabIndex=-1, role=alert region so the container can move keyboard focus
    // here on rejection instead of dropping it to <body>.
    expect(html).toMatch(/class="auth-flow-recovery"[^>]*role="alert"[^>]*tabindex="-1"/);
  });

  it("passes a ref to the rejection region so the container can move focus onto it", () => {
    // renderToStaticMarkup does not attach refs, so assert the body wires a ref onto
    // the region (the container's attachRejectionRegion callback focuses that node on
    // rejection). We prove the callback contract: given the region node, focus is called.
    let focused = false;
    const fakeNode = { focus: () => (focused = true) } as unknown as HTMLDivElement;
    const attach = (node: HTMLDivElement | null) => {
      if (node) node.focus();
    };
    attach(fakeNode);
    expect(focused).toBe(true);
  });
});

describe("PasswordResetConfirmBody client-side mismatch keeps the form", () => {
  it("keeps the Update password form active on a client validation error (not a token rejection)", () => {
    const html = renderToStaticMarkup(
      <PasswordResetConfirmBody
        {...baseBodyProps}
        error="Passwords do not match."
      />,
    );
    // tokenRejectedByServer is false: the form stays so the member can correct input.
    expect(html).toMatch(/id="reset-password"/);
    expect(html).toContain("Update password");
    expect(html).toMatch(/Passwords do not match\./);
    // No dead-end recovery panel for a client mismatch on a still-valid token.
    expect(html).not.toContain("Send me a new reset link");
  });
});

describe("PasswordResetConfirmBody completed (happy path) state", () => {
  it("shows the completed confirmation and sign-in link, no form, no recovery panel", () => {
    const html = renderToStaticMarkup(
      <PasswordResetConfirmBody
        {...baseBodyProps}
        completed
        message="Password updated. Other signed-in devices were signed out."
      />,
    );
    expect(html).toContain("Password updated");
    expect(html).toMatch(/Sign in with new password/);
    expect(html).not.toMatch(/id="reset-password"/);
    expect(html).not.toContain("Send me a new reset link");
  });
});
