"use client";

import { useState } from "react";

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function ForgotPasswordPanel() {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await readJson(response);
      if (!response.ok) {
        throw new Error(
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Password reset could not be started.",
        );
      }
      setMessage(
        result && typeof result === "object" && "message" in result && typeof result.message === "string"
          ? result.message
          : "If an account exists for that email, password reset instructions will be sent when delivery is configured.",
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Password reset could not be started.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-support-panel" aria-labelledby="forgot-password-title">
      <button
        className="auth-link-button"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="forgot-password-panel"
      >
        Forgot your password?
      </button>
      {open ? (
        <div id="forgot-password-panel" className="auth-support-card">
          <div>
            <p className="eyebrow">Password reset</p>
            <h2 id="forgot-password-title">Recover access without exposing whether the account exists.</h2>
            <p className="auth-support-copy">
              We prepare the reset flow now, but transactional email delivery is still disabled until an approved provider is connected.
            </p>
          </div>
          <form className="auth-support-form" onSubmit={submit}>
            <label htmlFor="forgot-password-email">Email</label>
            <input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="btn-secondary auth-support-action" type="submit" disabled={submitting}>
              {submitting ? "Preparing…" : "Start password reset"}
            </button>
          </form>
          {message ? <p className="auth-support-message" role="status">{message}</p> : null}
          {error ? <p className="error-message" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
