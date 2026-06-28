"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Login failed.");
      window.location.assign("/profile");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
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
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="auth-switch">New here? <Link href="/signup">Create a private beta profile</Link></p>
    </div>
  );
}

