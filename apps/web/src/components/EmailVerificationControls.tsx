"use client";

import { useState } from "react";

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

type Props = Readonly<{
  emailVerified: boolean;
  /**
   * Whether transactional email delivery is actually live (resolved from the
   * server at request time). Drives the static copy so we never tell a member
   * delivery is off when prod is really sending, or promise an email when it is
   * not. The runtime request feedback (the POST response message) is already
   * state-accurate on its own; this keeps the surrounding copy honest too.
   */
  emailDeliveryLive?: boolean;
}>;

export default function EmailVerificationControls({ emailVerified, emailDeliveryLive = false }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (emailVerified) {
    return (
      <>
        <span className="verification-state verified">Email verified</span>
        <p className="verification-support-copy">This confirms inbox access only. It is not identity, age, or safety verification.</p>
      </>
    );
  }

  async function requestVerification() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await readJson(response);
      if (!response.ok) {
        throw new Error(
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Verification could not be prepared.",
        );
      }
      setMessage(
        result && typeof result === "object" && "message" in result && typeof result.message === "string"
          ? result.message
          : "A verification flow has been prepared.",
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Verification could not be prepared.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="verification-controls">
      <span className="verification-state pending">Email verification pending</span>
      <p className="verification-support-copy">
        {emailDeliveryLive
          ? "Your profile stays private. Request a verification email and we'll send a confirmation link to your inbox. This confirms inbox access only — not identity, age, or safety."
          : "Your profile stays private. Verification delivery is not live yet, but you can prepare the flow and confirm the account security state."}
      </p>
      <button className="btn-secondary verification-action" type="button" onClick={() => void requestVerification()} disabled={submitting}>
        {submitting
          ? (emailDeliveryLive ? "Sending…" : "Preparing…")
          : (emailDeliveryLive ? "Send verification email" : "Prepare verification email")}
      </button>
      {message ? <p className="verification-feedback" role="status">{message}</p> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </div>
  );
}
