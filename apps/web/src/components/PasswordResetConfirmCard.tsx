"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import ForgotPasswordPanel from "./ForgotPasswordPanel";
import { isBrowserPasswordResetToken, validatePasswordResetDraft } from "@/lib/auth-flow";

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

export default function PasswordResetConfirmCard({ token }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  const tokenValid = useMemo(() => isBrowserPasswordResetToken(token), [token]);

  // A dead-end reset link: no token, a malformed token, or a valid-format token the
  // server rejected on submit (invalid/expired/already used). In every case the thing
  // the member actually needs next is a fresh link, so we offer the request form right
  // here (open) instead of only telling them to go find it. `completed` is the one
  // non-dead-end where no recovery action is needed.
  const deadEnd = !completed && (!token || !tokenValid || Boolean(error));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validatePasswordResetDraft(token, password, confirmPassword);
    if (errors.length > 0) {
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
      if (!response.ok) {
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

      {!completed && tokenValid ? (
        <form className="auth-flow-form" onSubmit={handleSubmit}>
          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <label htmlFor="reset-password-confirm">Confirm password</label>
          <input
            id="reset-password-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button className="btn-primary auth-support-action" type="submit" disabled={submitting}>
            {submitting ? "Updating password..." : "Update password"}
          </button>
        </form>
      ) : null}

      {message ? <p className="auth-support-message" role="status">{message}</p> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {deadEnd ? (
        // Primary recovery action: request a fresh reset link inline. Reuses the same
        // request form + endpoint as the login "Forgot your password?" panel, so the
        // anti-enumeration response ("if an account exists…") is identical here — no
        // way to tell whether the email is registered. Kept open by default because on
        // a dead-end link this IS the next step.
        <ForgotPasswordPanel defaultOpen triggerLabel="Send me a new reset link" />
      ) : null}

      <div className="auth-flow-actions">
        {completed ? <Link className="btn-primary" href="/login">Sign in with new password</Link> : null}
        <Link className="btn-secondary" href="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
