"use client";

import { useState } from "react";

export default function RoomLeaveControl({ eventId, requestId }: { eventId: string; requestId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function leavePlace() {
    if (!window.confirm("Leave this event? Your seat, room access, and exact meeting details will be removed immediately.")) return;

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/events/${eventId}/requests/${requestId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not leave the event.");
      window.location.assign(`/discover/events/${eventId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not leave the event.");
      setSubmitting(false);
    }
  }

  return (
    <aside className="room-leave-card">
      <strong>Need to step back?</strong>
      <p>Leaving removes your seat and exact-location access right away so the host sees the real group size.</p>
      <button type="button" onClick={leavePlace} disabled={submitting}>{submitting ? "Leaving…" : "Leave this event"}</button>
      {message ? <p role="alert">{message}</p> : null}
    </aside>
  );
}
