"use client";

import { useState } from "react";

export default function HostRequestDecision({ eventId, requestId, skipCount }: { eventId: string; requestId: string; skipCount: number }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function decide(action: "accept" | "skip") {
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/requests/${requestId}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Decision failed.");
      window.location.reload();
    } catch (decisionError) { setError(decisionError instanceof Error ? decisionError.message : "Decision failed."); setSubmitting(false); }
  }

  return <div className="host-decision"><button className="skip-request" type="button" onClick={() => decide("skip")} disabled={submitting}>Skip {skipCount > 0 ? `(${skipCount}/3)` : ""}</button><button className="accept-request" type="button" onClick={() => decide("accept")} disabled={submitting}>Accept</button>{error ? <p role="alert">{error}</p> : null}</div>;
}

