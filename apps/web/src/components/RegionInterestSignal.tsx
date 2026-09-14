"use client";

import Link from "next/link";
import { useState } from "react";

// Empty results describe this search, not total city supply. The optional
// anonymous research signal stores only an approximate area; it cannot notify.

type SignalState = "idle" | "submitting" | "done" | "error";

export default function RegionInterestSignal({ area }: { area?: string }) {
  const trimmedArea = (area ?? "").trim();
  const [state, setState] = useState<SignalState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function raiseHand() {
    if (!trimmedArea || state === "submitting") return;
    setState("submitting");
    setErrorMessage("");
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Anonymous research "answers" row carrying only the approximate area.
        body: JSON.stringify({ action: "answers", answers: { q8_area: trimmedArea } }),
      });
      if (!response.ok) {
        let message = "We couldn't note that just now — please try again in a moment.";
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === "string") message = body.error;
        } catch {
          // keep the calm generic message
        }
        setErrorMessage(message);
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErrorMessage("We couldn't note that just now — please try again in a moment.");
      setState("error");
    }
  }

  return (
    <div className="region-interest">
      <p>
        No activities are showing for your current search. Try another area or start a plan.
      </p>

      {trimmedArea ? <p>Area interest is anonymous; it does not subscribe you to notifications.</p> : null}
      {state === "done" && trimmedArea ? (
        <p className="region-interest-thanks" role="status">
          Thanks — we&apos;ll let you know as games open near {trimmedArea}. It also helps us decide where to open next.
        </p>
      ) : (
        <div className="region-interest-actions">
          {trimmedArea ? (
            <button
              type="button"
              className="region-interest-primary"
              onClick={() => void raiseHand()}
              disabled={state === "submitting"}
            >
              {state === "submitting" ? "Noting…" : `Show interest near ${trimmedArea}`}
            </button>
          ) : null}
          <Link href="/events/new">Start a plan</Link>
          <Link href="/discover?near=all">Search everywhere</Link>
          <Link href="/landing">See how it works</Link>
        </div>
      )}

      {state === "error" ? (
        <p className="error-message" role="alert">{errorMessage}</p>
      ) : null}
    </div>
  );
}
