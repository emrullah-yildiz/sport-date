"use client";

import { MODERATION_CASE_STATUSES, MODERATION_DECISION_CODES } from "@sport-date/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ModerationCaseForm({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof MODERATION_CASE_STATUSES)[number]>("triaged");
  const [decisionCode, setDecisionCode] = useState<(typeof MODERATION_DECISION_CODES)[number]>("no_action");
  const [decisionBasis, setDecisionBasis] = useState("");
  const [decisionSummary, setDecisionSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  // Persistent success/failure live regions (mirrors RoomLeaveControl): always
  // mounted and empty before submit so the result is announced; a failed update
  // is assertive so it is not lost behind whatever the reader is saying.
  const [tone, setTone] = useState<"success" | "error">("success");
  const terminal = status === "actioned" || status === "dismissed";

  async function updateCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/moderation/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          decisionCode: terminal ? decisionCode : null,
          decisionBasis: terminal ? decisionBasis : null,
          decisionSummary: terminal ? decisionSummary : null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Case update failed.");
      setTone("success");
      setMessage(`Case moved to ${result.status}.`);
      router.refresh();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Case update failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="moderation-case-form" onSubmit={updateCase}>
      <label>Next state
        <select value={status} onChange={(event) => {
          const nextStatus = event.target.value as (typeof MODERATION_CASE_STATUSES)[number];
          setStatus(nextStatus);
          if (nextStatus === "dismissed") setDecisionCode("no_action");
          if (nextStatus === "actioned" && decisionCode === "no_action") setDecisionCode("warning");
        }}>
          {MODERATION_CASE_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      {terminal ? <>
        <label>Decision
          <select value={decisionCode} onChange={(event) => setDecisionCode(event.target.value as (typeof MODERATION_DECISION_CODES)[number])} disabled={status === "dismissed"}>
            {MODERATION_DECISION_CODES.map((value) => <option key={value} value={value} disabled={(status === "dismissed") !== (value === "no_action")}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>Policy rule or legal basis
          <input minLength={10} maxLength={500} required value={decisionBasis} onChange={(event) => setDecisionBasis(event.target.value)} />
        </label>
        <label>Reporter-safe explanation
          <textarea rows={5} minLength={20} maxLength={2000} required value={decisionSummary} onChange={(event) => setDecisionSummary(event.target.value)} />
        </label>
        <p>A final decision is immediately visible to the reporter and opens a six-month appeal window. Do not expose the subject&apos;s private data or protected evidence.</p>
      </> : null}
      <button type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? "Recording..." : terminal ? "Issue decision notice" : "Update case state"}</button>
      <div className="safety-message-region" role="status" aria-live="polite">
        {message && tone === "success" ? <p>{message}</p> : null}
      </div>
      <div className="safety-message-region" role="alert" aria-live="assertive">
        {message && tone === "error" ? <p className="safety-message-error">{message}</p> : null}
      </div>
    </form>
  );
}
