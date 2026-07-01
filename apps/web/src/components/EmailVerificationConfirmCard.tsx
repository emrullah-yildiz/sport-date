"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

export type VerificationState =
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

const LOADING_STATE: VerificationState = {
  kind: "loading",
  title: "Verifying your email",
  body: "We are confirming that this inbox can receive account messages without exposing any profile details publicly.",
};

// Presentational card, split out so the resolved outcomes (verified / expired / …)
// are unit-testable via a plain static render without needing to drive the mount
// effect. The container below owns the confirm fetch and the focus move.
export function VerificationCardBody({
  state,
  headingRef,
}: Readonly<{
  state: VerificationState;
  headingRef?: (node: HTMLHeadingElement | null) => void;
}>) {
  const isLoading = state.kind === "loading";
  // The hard-error branch (503 unavailable / could-not-finish) is announced
  // assertively so a member who needs a fresh link is interrupted and notices; all
  // other outcomes (verified / already_verified / expired) use a polite status so
  // they do not talk over the reader. Anti-enumeration copy is unchanged.
  const isHardError = state.kind === "unavailable" || state.kind === "error";
  const isSuccess = state.kind === "verified" || state.kind === "already_verified";

  return (
    <div className="auth-card auth-flow-card" aria-busy={isLoading}>
      <div className="auth-flow-copy">
        <p className="eyebrow">Account security</p>
        {/* Persistent live region: the heading/body swap in place on resolve, so the
            outcome is announced without a page re-read. The heading is tabIndex={-1}
            so the container can move keyboard focus here when the async result lands. */}
        <div role={isHardError ? "alert" : "status"} aria-live={isHardError ? "assertive" : "polite"}>
          <h1 ref={headingRef} tabIndex={-1}>{state.title}</h1>
          <p className="auth-intro">{state.body}</p>
        </div>
      </div>
      <div className="auth-flow-note">
        Email verification confirms inbox access only. It does not verify identity, age, location accuracy, or in-person safety.
      </div>
      <div className="auth-flow-actions">
        {isLoading ? <span className="auth-flow-status" role="status">Checking secure token...</span> : null}
        {isSuccess ? (
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

export default function EmailVerificationConfirmCard({ token }: Props) {
  const [state, setState] = useState<VerificationState>(() => initialState(token));

  // A ref (not state) so consuming it never triggers a render: set true only when
  // the automatic confirm POST resolves in this session, so we move focus to the
  // freshly written outcome heading. The synchronous missing/invalid states (which
  // are already final on first paint) leave it false, so we never steal focus on a
  // plain page load — there is no input on this card, so a focus-to-heading is safe.
  const focusOnResolveRef = useRef(false);

  // Callback ref: fires when the outcome heading attaches to the DOM. Focusing here
  // (rather than in an effect) reliably lands focus on the node carrying the new
  // result, mirroring the shipped JoinRequestControls confirmation pattern.
  function attachHeading(node: HTMLHeadingElement | null) {
    if (node && focusOnResolveRef.current) {
      focusOnResolveRef.current = false;
      node.focus();
    }
  }

  useEffect(() => {
    if (!isBrowserEmailVerificationToken(token)) return;

    let cancelled = false;

    async function confirm() {
      setState(LOADING_STATE);

      try {
        const response = await fetch("/api/auth/email-verification/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = await readJson(response);
        if (cancelled) return;

        // Any async branch below is a non-user-initiated state change, so mark it to
        // move focus onto the resolved heading (the live region announces it too —
        // belt and braces, matching the join-flow precedent).
        focusOnResolveRef.current = true;

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
        focusOnResolveRef.current = true;
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

  return <VerificationCardBody state={state} headingRef={attachHeading} />;
}
