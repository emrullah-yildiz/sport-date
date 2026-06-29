"use client";

import { useState } from "react";

type Intent = "still_in" | "unsure" | "cannot_make";

const labels: Record<Intent, string> = {
  still_in: "I'm still in",
  unsure: "I'm unsure now",
  cannot_make: "I can't make it",
};

export default function EventUpdateAttendanceIntentControl({
  eventId,
  updateId,
  currentIntent,
}: {
  eventId: string;
  updateId: string;
  currentIntent: Intent | null;
}) {
  const [intent, setIntent] = useState<Intent | null>(currentIntent);
  const [submitting, setSubmitting] = useState<Intent | null>(null);
  const [message, setMessage] = useState("");

  async function save(nextIntent: Intent) {
    setSubmitting(nextIntent);
    setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/updates/${updateId}/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: nextIntent }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save your response.");
      setIntent(nextIntent);
      setMessage("Your host can now see your latest response to this critical change.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your response.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <aside className="room-intent-card">
      <strong>Can you still make it after this critical change?</strong>
      <p>Choose the most honest answer right now. It helps the host decide whether the plan is still workable.</p>
      <div className="room-intent-actions">
        {(["still_in", "unsure", "cannot_make"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={intent === option ? "selected" : ""}
            onClick={() => void save(option)}
            disabled={submitting !== null}
          >
            {submitting === option ? "Saving..." : labels[option]}
          </button>
        ))}
      </div>
      {message ? <p role="status">{message}</p> : null}
    </aside>
  );
}
