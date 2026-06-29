"use client";

import { useState } from "react";

export default function SafetyAppealForm({ reportId }: { reportId: string }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

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
      setMessage("Appeal submitted. A different reviewer should assess it where practicable.");
      setReason("");
      window.location.reload();
    } catch (error) {
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
        <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit appeal"}</button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </details>
  );
}
