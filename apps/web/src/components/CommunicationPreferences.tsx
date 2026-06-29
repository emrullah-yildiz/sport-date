"use client";

import { useState } from "react";

import type { CommunicationPreferences as CommunicationPreferencesState } from "@/lib/communication-preferences";

function formatUpdatedAt(value: string | null) {
  if (!value) return "Not set yet";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CommunicationPreferences({ preferences }: { preferences: CommunicationPreferencesState }) {
  const [productUpdatesOptIn, setProductUpdatesOptIn] = useState(preferences.productUpdatesOptIn);
  const [updatedAt, setUpdatedAt] = useState(preferences.productUpdatesUpdatedAt);
  const [history, setHistory] = useState(preferences.consentHistory);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function savePreference(enabled: boolean) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/communication-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUpdatesOptIn: enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Communication preference update failed.");
      setProductUpdatesOptIn(result.preferences.productUpdatesOptIn);
      setUpdatedAt(result.preferences.productUpdatesUpdatedAt);
      setHistory(result.preferences.consentHistory);
      setMessage(enabled
        ? "Optional product and launch updates are now enabled for this account. No promotional mail will be sent until the reviewed delivery setup exists."
        : "Optional product and launch updates are now off for this account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Communication preference update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="privacy-panel communication-panel" aria-labelledby="communication-title">
      <div>
        <p className="panel-label">Communication preferences</p>
        <h2 id="communication-title">Essential product mail stays separate from optional updates.</h2>
        <p>
          Account security, safety, and event-critical emails are part of operating the service. Promotional or launch updates must be optional, specific, and withdrawable, so this preference is separate.
        </p>
        <div className="communication-status-grid" aria-label="Communication categories">
          <article>
            <strong>Account and security</strong>
            <span>Always on while your account is active</span>
          </article>
          <article>
            <strong>Safety and event changes</strong>
            <span>Always on while your account is active</span>
          </article>
          <article>
            <strong>Product and launch updates</strong>
            <span>{productUpdatesOptIn ? "Optional updates enabled" : "Optional updates disabled"}</span>
          </article>
        </div>
      </div>
      <div className="communication-control">
        <label className="communication-toggle">
          <input
            type="checkbox"
            checked={productUpdatesOptIn}
            onChange={(event) => void savePreference(event.target.checked)}
            disabled={saving}
          />
          <span>
            <strong>Receive optional product and launch updates</strong>
            <small>No promotional mail is currently live. This stores your separate preference for later reviewed use.</small>
          </span>
        </label>
        <p className="communication-updated">Last changed: {formatUpdatedAt(updatedAt)}</p>
        {history.length > 0 ? (
          <div className="communication-history">
            <strong>Consent history</strong>
            <ul>
              {history.map((entry) => (
                <li key={entry.id}>
                  <span>{entry.newValue ? "Opted in" : "Opted out"}</span>
                  <small>{formatUpdatedAt(entry.createdAt)}</small>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="communication-updated">No separate marketing-style preference has been changed yet.</p>
        )}
      </div>
      {message ? <p className="privacy-message" role="status">{message}</p> : null}
    </section>
  );
}
