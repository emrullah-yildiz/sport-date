"use client";

import { MODERATION_APPEAL_STATUSES } from "@sport-date/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ModerationAppealForm({ appealId, currentStatus }: { appealId: string; currentStatus: "open" | "reviewing" }) {
  const router = useRouter();
  const availableStatuses = currentStatus === "open" ? MODERATION_APPEAL_STATUSES : MODERATION_APPEAL_STATUSES.filter((value) => value !== "reviewing");
  const [status, setStatus] = useState<(typeof MODERATION_APPEAL_STATUSES)[number]>(availableStatuses[0]);
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const final = status !== "reviewing";

  async function updateAppeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/moderation/appeals/${appealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, outcomeSummary: final ? outcomeSummary : null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Appeal update failed.");
      setMessage(`Appeal moved to ${result.status}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Appeal update failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="moderation-case-form moderation-appeal-form" onSubmit={updateAppeal}>
      <label>Appeal state
        <select value={status} onChange={(event) => setStatus(event.target.value as (typeof MODERATION_APPEAL_STATUSES)[number])}>
          {availableStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      {final ? <label>Reporter-safe appeal outcome
        <textarea rows={5} minLength={20} maxLength={2000} required value={outcomeSummary} onChange={(event) => setOutcomeSummary(event.target.value)} />
      </label> : null}
      <button type="submit" disabled={submitting}>{submitting ? "Recording..." : final ? "Publish appeal outcome" : "Start separate review"}</button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
