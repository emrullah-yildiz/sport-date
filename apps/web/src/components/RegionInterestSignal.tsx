"use client";

import Link from "next/link";
import { useState } from "react";

import { BRAND_NAME } from "@/lib/brand";

// Honest, pre-launch empty-state for a member whose area has no events yet
// (CX-20260704-region-honest-empty-state-and-demand-capture). Anyone, in any
// country, can sign up — there is no geo gate — so instead of a silent void we
// set an honest expectation ("we're not live near you *yet*, you're here early")
// and turn the out-of-region interest into a privacy-safe demand signal the
// growth loop can read.
//
// Demand capture reuses the EXISTING anonymous research pipeline: a one-tap
// submit posts ONLY the member's own already-stored approximate area into the
// survey's `q8_area` ("City or broad area (not an address)") field. No new PII,
// no exact address, no new table/migration, and the row is anonymous and
// unlinked to the member (same contract as the public survey). No dark
// patterns: nothing is fabricated, there is no fake nearby event and no
// invented scarcity — just an honest note and an optional way to raise a hand.

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
        {trimmedArea
          ? `No ${BRAND_NAME} games near ${trimmedArea} yet — you're here early.`
          : `No ${BRAND_NAME} games in your area yet — you're here early.`}{" "}
        We&apos;re opening city by city, Europe first, so new events show up here as hosts create them.
      </p>

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
              {state === "submitting" ? "Noting…" : `Notify me about games near ${trimmedArea}`}
            </button>
          ) : null}
          <Link href="/events/new">Host the first one</Link>
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
