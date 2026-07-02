"use client";

import { useState } from "react";

export default function SafetyAppealForm({ reportId }: { reportId: string }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  // Persistent success/failure live regions (mirrors RoomLeaveControl): the
  // containers are always mounted and empty before submit so the outcome is
  // announced, and a failed appeal is assertive so the member notices it did
  // not send and can retry.
  const [tone, setTone] = useState<"success" | "error">("success");

  async function submitAppeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/safety/reports/${reportId}/appeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Appeal could not be submitted.");
      setTone("success");
      setMessage("Appeal submitted. A different reviewer should assess it where practicable.");
      setReason("");
      window.location.reload();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Appeal could not be submitted.");
      setSubmitting(false);
    }
  }

  return (
    <details className="safety-appeal">
      <summary>Appeal this decision</summary>
      <form onSubmit={submitAppeal}>
        <label htmlFor={`appeal-${reportId}`}>Explain what should be reconsidered</label>
        <textarea id={`appeal-${reportId}`} minLength={20} maxLength={2000} required rows={5} value={reason} onChange={(event) => setReason(event.target.value)} />
        <button type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? "Submitting..." : "Submit appeal"}</button>
      </form>
      <div className="safety-message-region" role="status" aria-live="polite">
        {message && tone === "success" ? <p>{message}</p> : null}
      </div>
      <div className="safety-message-region" role="alert" aria-live="assertive">
        {message && tone === "error" ? <p className="safety-message-error">{message}</p> : null}
      </div>
    </details>
  );
}
