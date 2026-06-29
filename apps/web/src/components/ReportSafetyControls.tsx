"use client";

import { SAFETY_REPORT_CATEGORIES, type SafetyReportCategory } from "@sport-date/domain";
import { useState } from "react";

const categoryLabels: Record<SafetyReportCategory, string> = {
  harassment: "Harassment", hate: "Hate or discrimination", sexual_misconduct: "Sexual misconduct",
  violence_threat: "Violence or threat", stalking: "Stalking or unwanted following", scam: "Scam",
  impersonation: "Impersonation", suspected_underage: "Suspected underage member",
  unsafe_event: "Unsafe event or location", no_show: "No-show", other: "Something else",
};

export default function ReportSafetyControls({ eventId, subjectUserId, subjectName }: { eventId: string; subjectUserId: string; subjectName: string }) {
  const [category, setCategory] = useState<SafetyReportCategory>("harassment");
  const [details, setDetails] = useState("");
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function report(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/safety/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, reportedUserId: subjectUserId, category, details, blockUser }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Report failed.");
      setMessage(result.message); setDetails("");
      if (blockUser) setTimeout(() => window.location.assign("/profile"), 1200);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Report failed."); }
    finally { setSubmitting(false); }
  }

  async function blockOnly() {
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/safety/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockedUserId: subjectUserId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Block failed.");
      window.location.assign("/profile");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Block failed."); setSubmitting(false); }
  }

  return (
    <details className="safety-controls">
      <summary>Safety options for {subjectName}</summary>
      <div className="safety-quick-action"><p>Blocking immediately removes shared requests, places, room access, and exact-location access. It does not restore anything if later undone.</p><button type="button" onClick={blockOnly} disabled={submitting}>Block {subjectName}</button></div>
      <form onSubmit={report}>
        <label>What happened?<select value={category} onChange={(event) => setCategory(event.target.value as SafetyReportCategory)}>{SAFETY_REPORT_CATEGORIES.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}</select></label>
        <label>Describe what happened<textarea minLength={20} maxLength={2000} required rows={4} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Include what happened, when, and anything the safety team should preserve." /></label>
        <label className="report-block-choice"><input type="checkbox" checked={blockUser} onChange={(event) => setBlockUser(event.target.checked)} />Also block this member immediately</label>
        <button type="submit" disabled={submitting}>{submitting ? "Recording…" : "Submit safety report"}</button>
      </form>
      <p className="safety-emergency">If anyone is in immediate danger, move somewhere safe and contact local emergency services.</p>
      {message ? <p className="safety-message" role="status">{message}</p> : null}
    </details>
  );
}

