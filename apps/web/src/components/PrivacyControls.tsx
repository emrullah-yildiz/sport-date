"use client";

import Link from "next/link";
import { useState } from "react";

import { BRAND_NAME } from "@/lib/brand";

export default function PrivacyControls() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");

  async function downloadExport() {
    setMessage("");
    setExporting(true);
    try {
      const response = await fetch("/api/account/export", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sport-date-account.json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Your machine-readable account export is ready. It reflects the current preview boundary described in the Privacy Notice preview.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function requestDeletion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (confirmation !== "DELETE") return setMessage("Type DELETE exactly to confirm.");
    setDeleting(true);
    try {
      const response = await fetch("/api/account/deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion request failed.");
      window.location.assign("/login?deletion=requested");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Deletion request failed.");
      setDeleting(false);
    }
  }

  return (
    <section className="privacy-panel" aria-labelledby="privacy-title">
      <div>
        <p className="panel-label">Privacy controls</p>
        <h2 id="privacy-title">Your data should leave as easily as you arrived.</h2>
        <p>
          Download the information currently held by {BRAND_NAME} in a machine-readable JSON file, or start a deletion request that immediately locks your profile while final handling follows the applicable legal and retention review.
        </p>
        <p className="privacy-inline-note">
          Read the <Link href="/privacy">Privacy Notice preview</Link>, <Link href="/terms">Terms preview</Link>, and <Link href="/safety-guidelines">Safety Guidelines</Link> for the current member-facing boundary. Optional product-update preferences live separately so terms acceptance is not treated as marketing consent.
        </p>
        <button className="privacy-action" type="button" onClick={downloadExport} disabled={exporting}>{exporting ? "Preparing export…" : "Download my data"}</button>
      </div>
      <details className="deletion-control">
        <summary>Request account deletion</summary>
        <p>This immediately locks your profile and signs out every session. Final erasure is processed under the applicable retention and legal requirements described in the Privacy Notice preview.</p>
        <form onSubmit={requestDeletion}>
          <label htmlFor="deletion-password">Current password</label>
          <input id="deletion-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <label htmlFor="deletion-confirmation">Type DELETE to confirm</label>
          <input id="deletion-confirmation" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          <button className="danger-action" type="submit" disabled={deleting || confirmation !== "DELETE"}>{deleting ? "Locking profile…" : "Lock profile and request deletion"}</button>
        </form>
      </details>
      {message ? <p className="privacy-message" role="status">{message}</p> : null}
    </section>
  );
}
