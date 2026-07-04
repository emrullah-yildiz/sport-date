"use client";

import { useState } from "react";

import type { AttendanceStatus } from "@/lib/attendance-confirmation";

// In-app T-2h "Still coming?" prompt for an accepted member on their event room
// (CX-20260704). Confirm marks them confirmed; "Can't make it" releases their
// place. Honest and non-manipulative: no fake countdown, no penalty language;
// doing nothing simply keeps the place. Works fully with email delivery off.

export default function AttendanceConfirmPrompt({
  eventId,
  initialStatus,
}: {
  eventId: string;
  initialStatus: AttendanceStatus;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus);
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState("");

  async function act(action: "confirm" | "cancel") {
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "That didn't work. Please try again.");
      }
      if (action === "cancel") {
        // The seat is released and room membership changed — reload so the room
        // reflects the accurate group.
        window.location.reload();
        return;
      }
      setStatus("confirmed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="attendance-prompt" aria-labelledby="attendance-prompt-title">
      <p className="panel-label">Starting soon</p>
      <h2 id="attendance-prompt-title">Still coming?</h2>
      {status === "confirmed" ? (
        <p className="attendance-prompt-confirmed" role="status">
          You&rsquo;re confirmed — thanks for letting the group know. You can still change your mind below if plans shift.
        </p>
      ) : (
        <p className="attendance-prompt-lede">
          A quick heads-up helps everyone plan. If you can&rsquo;t make it, releasing your place opens it for someone else. Doing nothing keeps your place.
        </p>
      )}
      <div className="attendance-prompt-actions">
        {status === "confirmed" ? null : (
          <button type="button" className="btn btn--primary" onClick={() => void act("confirm")} disabled={busy !== null}>
            {busy === "confirm" ? "Saving…" : "Approve"}
          </button>
        )}
        <button type="button" className="btn btn--secondary" onClick={() => void act("cancel")} disabled={busy !== null}>
          {busy === "cancel" ? "Releasing…" : "Cancel"}
        </button>
      </div>
      {error ? <p className="attendance-prompt-error" role="alert">{error}</p> : null}
    </section>
  );
}
