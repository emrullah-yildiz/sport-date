"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import ForgotPasswordPanel from "./ForgotPasswordPanel";
import {
  PASSWORD_MIN_LENGTH,
  isBrowserPasswordResetToken,
  passwordRequirementsText,
  validatePasswordResetDraft,
} from "@/lib/auth-flow";

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

type Props = Readonly<{
  token: string;
}>;

// The confirm POST responses that mean the TOKEN itself is dead (invalid / expired /
// already-used). Only these hide the "Update password" form. A client-side password
// mismatch (never reaches the server) and a transient 5xx ("unavailable" / "error")
// leave the token usable, so the form stays and the member can correct/retry.
export function isServerTokenRejection(responseOk: boolean, state: unknown): boolean {
  if (responseOk) return false;
  return state === "invalid" || state === "expired";
}

type BodyProps = Readonly<{
  token: string;
  tokenValid: boolean;
  completed: boolean;
  tokenRejectedByServer: boolean;
  submitting: boolean;
  error: string;
  message: string;
  password: string;
  confirmPassword: string;
  onPasswordChange?: (value: string) => void;
  onConfirmPasswordChange?: (value: string) => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  rejectionRegionRef?: (node: HTMLDivElement | null) => void;
}>;

// Presentational card, split out (like EmailVerificationConfirmCard's VerificationCardBody)
// so the resolved states — completed, and the server-token-rejected dead-end — are
// unit-testable via a plain static render without driving the submit effect.
export function PasswordResetConfirmBody({
  token,
  tokenValid,
  completed,
  tokenRejectedByServer,
  submitting,
  error,
  message,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  rejectionRegionRef,
}: BodyProps) {
  // The password form is only meaningful while the token can still work: it is a real
  // syntactic token, the server has not rejected it, and we have not already finished.
  // This mirrors the no-token / malformed dead-ends (which already hide the form); the
  // server-rejected state now joins them.
  const showPasswordForm = !completed && tokenValid && !tokenRejectedByServer;

  // A dead-end reset link: no token, a malformed token, or a valid-format token the
  // server rejected on submit. In every case the next real step is a fresh link, so we
  // offer the request form right here (open). `completed` needs no recovery action; a
  // transient 5xx is NOT a dead-end (form stays, member retries the same token).
  const noTokenDeadEnd = !completed && (!token || !tokenValid);

  return (
    <div className="auth-card auth-flow-card">
      <div className="auth-flow-copy">
        <p className="eyebrow">Account recovery</p>
        <h1>{completed ? "Password updated" : "Choose a new password"}</h1>
        <p className="auth-intro">
          {completed
            ? "Your password has been rotated and other signed-in sessions have been revoked."
            : "Use a long private phrase with upper-case, lower-case, and numeric characters. We keep your profile private until trust signals are in place."}
        </p>
      </div>

      {!token ? (
        <p className="error-message" role="alert">
          This reset link is missing its secure token. Open the full link from your email, or request a fresh one below.
        </p>
      ) : null}

      {token && !tokenValid ? (
        <p className="error-message" role="alert">
          This reset link is invalid. Request a fresh recovery link below.
        </p>
      ) : null}

      {showPasswordForm ? (
        <form className="auth-flow-form" onSubmit={onSubmit}>
          <label htmlFor="reset-password">New password</label>
          {/* Full requirements shown BEFORE submit and wired to the field via
              aria-describedby, so assistive tech announces them on focus instead of the
              member (or a screen-reader user) only discovering the 12-char minimum via a
              post-submit error. Copy comes from passwordRequirementsText(), which derives
              from the same PASSWORD_MIN_LENGTH validateBrowserPasswordStrength enforces —
              the disclosed rules can't drift from the enforced ones. */}
          <p id="reset-password-requirements" className="field-help">
            {passwordRequirementsText()}
          </p>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            aria-describedby="reset-password-requirements"
            value={password}
            onChange={(event) => onPasswordChange?.(event.target.value)}
          />
          <label htmlFor="reset-password-confirm">Confirm password</label>
          <input
            id="reset-password-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange?.(event.target.value)}
          />
          <button className="btn-primary auth-support-action" type="submit" disabled={submitting}>
            {submitting ? "Updating password..." : "Update password"}
          </button>
        </form>
      ) : null}

      {message ? <p className="auth-support-message" role="status">{message}</p> : null}

      {tokenRejectedByServer ? (
        // Server rejected the token: the form is gone, so the error and the recovery
        // action become the focal point. Wrap them in a single focusable, alert-announced
        // region and move keyboard focus here on rejection (rejectionRegionRef) so an AT /
        // keyboard user lands on the next real step ("Send me a new reset link") instead
        // of being dropped to <body>.
        <div className="auth-flow-recovery" role="alert" tabIndex={-1} ref={rejectionRegionRef}>
          {error ? <p className="error-message">{error}</p> : null}
          {/* Primary recovery action: request a fresh reset link inline. Reuses the same
              request form + endpoint as the login "Forgot your password?" panel, so the
              anti-enumeration response ("if an account exists…") is identical here — no
              way to tell whether the email is registered. Kept open by default because on
              a dead-end link this IS the next step. */}
          <ForgotPasswordPanel defaultOpen triggerLabel="Send me a new reset link" />
        </div>
      ) : (
        <>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          {noTokenDeadEnd ? (
            // No-token / malformed dead-ends (already correct): same inline recovery
            // action, open by default so no hunting is required.
            <ForgotPasswordPanel defaultOpen triggerLabel="Send me a new reset link" />
          ) : null}
        </>
      )}

      <div className="auth-flow-actions">
        {completed ? <Link className="btn-primary" href="/login">Sign in with new password</Link> : null}
        <Link className="btn-secondary" href="/login">Back to sign in</Link>
      </div>
    </div>
  );
}

export default function PasswordResetConfirmCard({ token }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  // Set only when the SERVER declares the token itself dead (invalid / expired /
  // already-used). A client-side password-mismatch or a transient 5xx does NOT set
  // this. Once true, the "Update password" form is removed so the member cannot
  // re-submit a new password against a token the server already rejected — the only
  // fix is a fresh link, which the recovery panel offers.
  const [tokenRejectedByServer, setTokenRejectedByServer] = useState(false);

  const tokenValid = useMemo(() => isBrowserPasswordResetToken(token), [token]);

  // Callback ref for the rejection error/recovery region. When the server rejects the
  // token we move keyboard focus here (tabIndex={-1}) so an AT / keyboard user is taken
  // to the next real step instead of being dropped to <body>. Mirrors the verified
  // EmailVerificationConfirmCard focus-on-resolve pattern: focus in the attach callback,
  // gated by a ref so a plain re-render never steals focus.
  const focusOnRejectRef = useRef(false);

  function attachRejectionRegion(node: HTMLDivElement | null) {
    if (node && focusOnRejectRef.current) {
      focusOnRejectRef.current = false;
      node.focus();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validatePasswordResetDraft(token, password, confirmPassword);
    if (errors.length > 0) {
      // Client-side mismatch / weak password: the token is untouched, so keep the form
      // active and let the member correct their input. Never hide the form here.
      setError(errors[0]);
      setMessage("");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await readJson(response);
      const resultState =
        result && typeof result === "object" && "state" in result ? result.state : undefined;
      if (!response.ok) {
        if (isServerTokenRejection(response.ok, resultState)) {
          // The token itself is dead — hide the form and move focus to the recovery panel.
          focusOnRejectRef.current = true;
          setTokenRejectedByServer(true);
        }
        throw new Error(
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Password reset could not be completed.",
        );
      }
      setCompleted(true);
      setPassword("");
      setConfirmPassword("");
      setMessage(
        result && typeof result === "object" && "message" in result && typeof result.message === "string"
          ? result.message
          : "Password updated. Other signed-in devices were signed out.",
      );
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Password reset could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PasswordResetConfirmBody
      token={token}
      tokenValid={tokenValid}
      completed={completed}
      tokenRejectedByServer={tokenRejectedByServer}
      submitting={submitting}
      error={error}
      message={message}
      password={password}
      confirmPassword={confirmPassword}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleSubmit}
      rejectionRegionRef={attachRejectionRegion}
    />
  );
}
