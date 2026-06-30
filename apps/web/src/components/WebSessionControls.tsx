"use client";

import { useEffect, useState } from "react";

type WebSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export default function WebSessionControls() {
  const [sessions, setSessions] = useState<WebSession[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

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
          {sessions.map((session) => (
            <li key={session.id}>
              <div className="web-session-row-head">
                <strong>{session.isCurrent ? "This browser" : "Browser session"}</strong>
                {session.isCurrent ? <span className="web-session-badge">This device</span> : null}
              </div>
              <small>Signed in {new Date(session.createdAt).toLocaleString()} · expires {new Date(session.expiresAt).toLocaleDateString()}</small>
              <button
                type="button"
                onClick={() => void revoke(session)}
                disabled={revoking === session.id}
                aria-label={session.isCurrent ? "Sign out this browser" : "End this browser session"}
              >
                {revoking === session.id ? "Ending…" : session.isCurrent ? "Sign out this browser" : "End session"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? <p role="status" className="web-session-message">{message}</p> : null}
    </section>
  );
}
