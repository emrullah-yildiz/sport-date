"use client";

import { useState } from "react";

// The confirm/cancel action on the tokenized landing page
// (CX-20260704-feature-event-attendance-confirmation). Progressive enhancement:
// it renders a real <form method="post" action="/api/attendance"> so a no-JS
// click still works (the API 303-redirects back with ?state=…). With JS we
// intercept, POST url-encoded with Accept: application/json, and show the outcome
// inline without a navigation.

type Result = "confirmed" | "cancelled" | "expired" | "invalid" | "already-cancelled" | "error" | null;

function messageFor(action: "confirm" | "cancel", result: Result): string {
  switch (result) {
    case "confirmed":
      return "You're confirmed — thanks for letting the group know. See you there.";
    case "cancelled":
      return "Your place has been released so someone else can take it. Thanks for the heads-up.";
    case "already-cancelled":
      return action === "confirm"
        ? "Your place was already released. To come along, request a place again."
        : "Your place is already released — nothing more to do.";
    case "expired":
      return "This event has already started, so this link has expired.";
    case "invalid":
      return "This link isn't valid. If you think it should be, contact us and we'll help.";
    case "error":
      return "Something went wrong. Please try again in a moment.";
    default:
      return "";
  }
}

export default function AttendanceActionPanel({
  eventId,
  token,
  action,
  expired,
  initialResult,
}: {
  eventId: string;
  token: string;
  action: "confirm" | "cancel";
  expired: boolean;
  initialResult: Result;
}) {
  const [result, setResult] = useState<Result>(initialResult);
  const [busy, setBusy] = useState(false);

  const settled = result === "confirmed" || result === "cancelled" || result === "already-cancelled" || result === "expired" || result === "invalid";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ eventId, token, action }).toString(),
      });
      const payload = (await response.json().catch(() => ({}))) as { result?: Result };
      setResult(payload.result ?? "error");
    } catch {
      setResult("error");
    } finally {
      setBusy(false);
    }
  }

  if (expired && !settled) {
    return <p className="attendance-result" role="status">{messageFor(action, "expired")}</p>;
  }

  if (settled) {
    return <p className="attendance-result" role="status">{messageFor(action, result)}</p>;
  }

  return (
    <form className="attendance-action" method="post" action="/api/attendance" onSubmit={submit}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={action === "cancel" ? "btn btn--secondary btn--lg" : "btn btn--primary btn--lg"} disabled={busy}>
        {busy ? "Saving…" : action === "confirm" ? "Approve" : "Cancel"}
      </button>
    </form>
  );
}
