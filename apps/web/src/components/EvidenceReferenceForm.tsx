"use client";

import { EVIDENCE_REVIEW_DAYS, EVIDENCE_SENSITIVITIES, EVIDENCE_SOURCE_TYPES } from "@sport-date/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EvidenceReferenceForm({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<(typeof EVIDENCE_SOURCE_TYPES)[number]>("system_record");
  const [sensitivity, setSensitivity] = useState<(typeof EVIDENCE_SENSITIVITIES)[number]>("restricted");
  const [label, setLabel] = useState("");
  const [referenceKey, setReferenceKey] = useState("");
  const [preservationPurpose, setPreservationPurpose] = useState("");
  const [reviewAfterDays, setReviewAfterDays] = useState<(typeof EVIDENCE_REVIEW_DAYS)[number]>(90);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function createReference(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/moderation/reports/${reportId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, sensitivity, label, referenceKey, preservationPurpose, reviewAfterDays }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Evidence reference could not be created.");
      setMessage("Immutable evidence reference recorded. No file or evidence content was uploaded.");
      setLabel("");
      setReferenceKey("");
      setPreservationPurpose("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Evidence reference could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <details className="evidence-reference-form">
      <summary>Add an evidence reference</summary>
      <p>Record only an opaque locator and preservation purpose. Do not paste evidence, messages, URLs with tokens, credentials, or precise locations.</p>
      <form onSubmit={createReference}>
        <label>Source type
          <select value={sourceType} onChange={(event) => setSourceType(event.target.value as (typeof EVIDENCE_SOURCE_TYPES)[number])}>
            {EVIDENCE_SOURCE_TYPES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>Sensitivity
          <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value as (typeof EVIDENCE_SENSITIVITIES)[number])}>
            {EVIDENCE_SENSITIVITIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>Reference label
          <input minLength={10} maxLength={160} required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Join request state captured at intake" />
        </label>
        <label>Opaque locator
          <input minLength={8} maxLength={200} pattern="[A-Za-z0-9][A-Za-z0-9._:/#-]+" required value={referenceKey} onChange={(event) => setReferenceKey(event.target.value)} placeholder="join_request:uuid" />
        </label>
        <label>Preservation purpose
          <textarea rows={4} minLength={20} maxLength={500} required value={preservationPurpose} onChange={(event) => setPreservationPurpose(event.target.value)} />
        </label>
        <label>Retention review
          <select value={reviewAfterDays} onChange={(event) => setReviewAfterDays(Number(event.target.value) as (typeof EVIDENCE_REVIEW_DAYS)[number])}>
            {EVIDENCE_REVIEW_DAYS.map((value) => <option key={value} value={value}>Review in {value} days</option>)}
          </select>
        </label>
        <button type="submit" disabled={submitting}>{submitting ? "Recording..." : "Record immutable reference"}</button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </details>
  );
}
