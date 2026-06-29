"use client";

import type { DiscoveryRequest } from "@/lib/events";
import { useState } from "react";

export default function JoinRequestControls({ eventId, request }: { eventId: string; request: DiscoveryRequest | null }) {
  const [introduction, setIntroduction] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function createRequest() {
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ introduction }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed."); setSubmitting(false); }
  }

  async function cancelRequest() {
    if (!request) return;
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/requests/${request.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cancellation failed.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cancellation failed."); setSubmitting(false); }
  }

  if (request?.status === "accepted") return <div className="join-state accepted"><strong>You have a place.</strong><p>The exact meeting point is now visible below.</p><button type="button" onClick={cancelRequest} disabled={submitting}>Cancel my place</button>{message ? <p role="alert">{message}</p> : null}</div>;
  if (request?.status === "pending") return <div className="join-state pending"><strong>Your request is with the host.</strong><p>You can cancel quietly at any time. Skip counts stay private.</p><button type="button" onClick={cancelRequest} disabled={submitting}>Cancel request</button>{message ? <p role="alert">{message}</p> : null}</div>;
  if (request?.status === "declined") return <div className="join-state closed"><strong>Not this game.</strong><p>Your request is closed. No public rejection signal is added to your profile.</p></div>;
  if (request?.status === "cancelled") return <div className="join-state closed"><strong>Request cancelled.</strong><p>This invitation is closed for your account.</p></div>;

  return (
    <div className="join-request-box">
      <label htmlFor="join-introduction">A short note to the host <span>optional</span></label>
      <textarea id="join-introduction" maxLength={500} rows={4} value={introduction} onChange={(event) => setIntroduction(event.target.value)} placeholder="What would help the host welcome you well?" />
      <div><small>{introduction.length}/500</small><button type="button" onClick={createRequest} disabled={submitting}>{submitting ? "Sending…" : "Request a place"}</button></div>
      {message ? <p className="error-message" role="alert">{message}</p> : null}
    </div>
  );
}

