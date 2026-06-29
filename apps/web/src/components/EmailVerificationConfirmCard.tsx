"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isBrowserEmailVerificationToken } from "@/lib/auth-flow";

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

type VerificationState =
  | { kind: "missing" | "invalid"; title: string; body: string }
  | { kind: "loading"; title: string; body: string }
  | { kind: "verified" | "already_verified"; title: string; body: string }
  | { kind: "expired" | "unavailable" | "error"; title: string; body: string };

function initialState(token: string): VerificationState {
  if (!token) {
    return {
      kind: "missing",
      title: "Verification link missing",
      body: "Open the full link from your email, or sign in to request a fresh verification attempt from account security.",
    };
  }
  if (!isBrowserEmailVerificationToken(token)) {
    return {
      kind: "invalid",
      title: "Verification link invalid",
      body: "This verification link does not match Sport Date's expected secure format.",
    };
  }
  return {
    kind: "loading",
    title: "Verifying your email",
    body: "We are confirming that this inbox can receive account messages without exposing any profile details publicly.",
  };
}

export default function EmailVerificationConfirmCard({ token }: Props) {
  const [state, setState] = useState<VerificationState>(() => initialState(token));

  useEffect(() => {
    if (!isBrowserEmailVerificationToken(token)) return;

    let cancelled = false;

    async function confirm() {
      setState({
        kind: "loading",
        title: "Verifying your email",
        body: "We are confirming that this inbox can receive account messages without exposing any profile details publicly.",
      });

      try {
        const response = await fetch("/api/auth/email-verification/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = await readJson(response);
        if (cancelled) return;

        if (response.ok) {
          const nextKind = result && typeof result === "object" && "state" in result && result.state === "already_verified"
            ? "already_verified"
            : "verified";
          setState({
            kind: nextKind,
            title: nextKind === "already_verified" ? "Email already verified" : "Email verified",
            body:
              result && typeof result === "object" && "message" in result && typeof result.message === "string"
                ? result.message
                : "Your email is confirmed.",
          });
          return;
        }

        const message =
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Email verification could not be completed.";

        if (response.status === 410) {
          setState({
            kind: "expired",
            title: "Verification link expired",
            body: message,
          });
          return;
        }

        if (response.status === 503) {
          setState({
            kind: "unavailable",
            title: "Verification temporarily unavailable",
            body: message,
          });
          return;
        }

        setState({
          kind: "error",
          title: "Verification could not finish",
          body: message,
        });
      } catch {
        if (cancelled) return;
        setState({
          kind: "error",
          title: "Verification could not finish",
          body: "A network or server error interrupted verification. Try again from the same link in a moment.",
        });
      }
    }

    void confirm();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="auth-card auth-flow-card">
      <div className="auth-flow-copy">
        <p className="eyebrow">Account security</p>
        <h1>{state.title}</h1>
        <p className="auth-intro">{state.body}</p>
      </div>
      <div className="auth-flow-note">
        Email verification confirms inbox access only. It does not verify identity, age, location accuracy, or in-person safety.
      </div>
      <div className="auth-flow-actions">
        {state.kind === "loading" ? <span className="auth-flow-status">Checking secure token...</span> : null}
        {(state.kind === "verified" || state.kind === "already_verified") ? (
          <>
            <Link className="btn-primary" href="/profile">Go to profile</Link>
            <Link className="btn-secondary" href="/discover">Discover events</Link>
          </>
        ) : (
          <>
            <Link className="btn-primary" href="/login">Sign in</Link>
            <Link className="btn-secondary" href="/signup">Create account</Link>
          </>
        )}
      </div>
    </div>
  );
}
