"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ForgotPasswordPanel from "./ForgotPasswordPanel";
import { interpretLoginFailure } from "@/lib/login-recovery";

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Seconds remaining in a rate-limit cool-down; 0 when not locked out. While
  // > 0 the submit button is disabled so repeated failing clicks cannot extend
  // the member's own lockout.
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [suggestRecovery, setSuggestRecovery] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const lockedOut = cooldownSeconds > 0;
  const submitDisabled = submitting || lockedOut;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) return;
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        window.location.assign("/profile");
        return;
      }
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      const failure = interpretLoginFailure(response, body);
      setError(failure.message);
      setCooldownSeconds(failure.cooldownSeconds);
      if (failure.suggestRecovery) {
        setSuggestRecovery(true);
        setRecoveryOpen(true);
      }
    } catch {
      setError("Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <div>
        <p className="eyebrow">Welcome back</p>
        <h1>Pick up where the movement left you.</h1>
        <p className="auth-intro">Sign in to see your private profile. Events arrive in the next product slice.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error ? (
          <div className="auth-error" role="alert">
            <p className="error-message">{error}</p>
            {lockedOut ? (
              <p className="auth-cooldown" aria-hidden="true">
                You can try again in {formatCountdown(cooldownSeconds)}.
              </p>
            ) : null}
            {suggestRecovery ? (
              <p className="auth-recovery-hint">
                The quickest way back in is usually a password reset — it uses a separate limit.
              </p>
            ) : null}
          </div>
        ) : null}
        <button className="btn-primary" type="submit" disabled={submitDisabled}>
          {submitting ? "Signing in..." : lockedOut ? "Please wait…" : "Sign in"}
        </button>
      </form>
      <ForgotPasswordPanel open={recoveryOpen} onOpenChange={setRecoveryOpen} />
      <p className="auth-switch">New here? <Link href="/signup">Create a private beta profile</Link></p>
    </div>
  );
}
