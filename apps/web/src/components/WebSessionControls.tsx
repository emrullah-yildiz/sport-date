"use client";

import { useEffect, useState } from "react";

type WebSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
  deviceLabel: string | null;
  lastActiveAt: string | null;
};

function formatLastActive(value: string | null): string | null {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return null;
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 5) return "active just now";
  if (minutes < 60) return `active about ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "active about an hour ago" : `active about ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "active about a day ago";
  if (days < 30) return `active about ${days} days ago`;
  // Beyond a month, an exact count adds no recognition value — stay coarse.
  return "last active over a month ago";
}

export default function WebSessionControls() {
  const [sessions, setSessions] = useState<WebSession[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    setState("loading");
    try {
      const response = await fetch("/api/account/web-sessions", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Browser sessions could not be loaded.");
      setSessions(result.sessions);
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Browser sessions could not be loaded.");
      setState("error");
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/account/web-sessions", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Browser sessions could not be loaded.");
        return result.sessions as WebSession[];
      })
      .then((result) => { if (active) { setSessions(result); setState("ready"); } })
      .catch((error: unknown) => { if (active) { setMessage(error instanceof Error ? error.message : "Browser sessions could not be loaded."); setState("error"); } });
    return () => { active = false; };
  }, []);

  async function revoke(session: WebSession) {
    setMessage("");
    setRevoking(session.id);
    try {
      const response = await fetch(`/api/account/web-sessions/${session.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Browser session could not be ended.");
      if (result.signedOut) {
        setMessage("This browser has been signed out. Redirecting to sign in…");
        window.location.assign("/login");
        return;
      }
      setMessage("Browser session ended. That browser will need to sign in again.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Browser session could not be ended.");
    } finally {
      setRevoking(null);
    }
  }

  async function signOutOthers() {
    setMessage("");
    setBulkBusy(true);
    try {
      const response = await fetch("/api/account/web-sessions", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Other browsers could not be signed out.");
      const count = typeof result.revokedCount === "number" ? result.revokedCount : 0;
      setMessage(
        count === 0
          ? "No other browsers were signed in. You're all set."
          : count === 1
            ? "Signed out 1 other browser. It will need to sign in again. You're still signed in here."
            : `Signed out ${count} other browsers. They will need to sign in again. You're still signed in here.`,
      );
      setConfirmingBulk(false);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Other browsers could not be signed out.");
    } finally {
      setBulkBusy(false);
    }
  }

  const otherCount = sessions.filter((session) => !session.isCurrent).length;

  return (
    <section className="web-session-panel" aria-labelledby="web-sessions-title">
      <p className="panel-label">Account security</p>
      <h2 id="web-sessions-title">Signed-in browsers</h2>
      <p>End any browser session you no longer trust — for example, on a shared or public computer — without changing your password.</p>
      {state === "loading" ? <p>Loading browser sessions…</p> : null}
      {state === "error" ? <button type="button" onClick={() => void load()}>Try again</button> : null}
      {state === "ready" && otherCount === 0 ? (
        <p className="web-session-empty">This is your only signed-in browser. New sessions appear here when you sign in elsewhere.</p>
      ) : null}
      {state === "ready" ? (
        <ul className="web-session-list">
          {sessions.map((session) => {
            const lastActive = formatLastActive(session.lastActiveAt);
            const name = session.deviceLabel ?? "Browser session";
            return (
              <li key={session.id}>
                <div className="web-session-row-head">
                  <strong>{session.isCurrent ? `${name} · this browser` : name}</strong>
                  {session.isCurrent ? <span className="web-session-badge">This device</span> : null}
                </div>
                <small>
                  {lastActive ? `${lastActive} · ` : ""}Signed in {new Date(session.createdAt).toLocaleString()} · expires {new Date(session.expiresAt).toLocaleDateString()}
                </small>
                <button
                  type="button"
                  onClick={() => void revoke(session)}
                  disabled={revoking === session.id || bulkBusy}
                  aria-label={session.isCurrent ? "Sign out this browser" : `End the browser session for ${name}`}
                >
                  {revoking === session.id ? "Ending…" : session.isCurrent ? "Sign out this browser" : "End session"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {state === "ready" && otherCount > 0 ? (
        <div className="web-session-bulk">
          {confirmingBulk ? (
            <div className="web-session-bulk-confirm" role="group" aria-label="Confirm signing out other browsers">
              <p>
                Sign out {otherCount === 1 ? "the 1 other browser" : `all ${otherCount} other browsers`}? You&apos;ll stay signed in here; the others will need to sign in again.
              </p>
              <div className="web-session-bulk-actions">
                <button
                  type="button"
                  className="web-session-bulk-danger"
                  onClick={() => void signOutOthers()}
                  disabled={bulkBusy}
                >
                  {bulkBusy ? "Signing out…" : "Sign out other browsers"}
                </button>
                <button
                  type="button"
                  className="web-session-bulk-cancel"
                  onClick={() => setConfirmingBulk(false)}
                  disabled={bulkBusy}
                >
                  Keep them
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="web-session-bulk-open"
              onClick={() => { setMessage(""); setConfirmingBulk(true); }}
              disabled={bulkBusy || revoking !== null}
            >
              Sign out all other browsers
            </button>
          )}
        </div>
      ) : null}
      {message ? <p role="status" className="web-session-message">{message}</p> : null}
    </section>
  );
}
