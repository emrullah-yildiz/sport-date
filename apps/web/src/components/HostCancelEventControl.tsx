"use client";

import { useState } from "react";

export default function HostCancelEventControl({ eventId }: { eventId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function cancelEvent() {
    if (!window.confirm("Cancel this event? Accepted places, room access, and active join requests will close immediately.")) return;

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Event cancellation failed.");
      window.location.assign("/hosting?event=cancelled");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Event cancellation failed.");
      setSubmitting(false);
    }
  }

  return (
    <section className="host-cancel-card">
      <p className="panel-label">If the plan breaks</p>
      <h2>Cancel early rather than letting people travel to uncertainty.</h2>
      <p>Cancelling closes active requests, removes accepted seats, and revokes exact-location room access immediately. It does not message members outside the product.</p>
      <button type="button" onClick={cancelEvent} disabled={submitting}>{submitting ? "Cancelling…" : "Cancel this event"}</button>
      {message ? <p role="alert">{message}</p> : null}
    </section>
  );
}
