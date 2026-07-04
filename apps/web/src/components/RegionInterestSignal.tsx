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
          ? `${BRAND_NAME} isn't live near ${trimmedArea} yet.`
          : `${BRAND_NAME} isn't live in many places yet.`}{" "}
        We&apos;re opening it city by city — Europe first — and you&apos;re here early. As hosts
        start events {trimmedArea ? `near ${trimmedArea}` : "near you"}, they&apos;ll show up right here.
      </p>

      {state === "done" ? (
        <p className="region-interest-thanks" role="status">
          Thanks — we&apos;ve noted interest{trimmedArea ? ` near ${trimmedArea}` : ""}. This helps us decide where to open next.
        </p>
      ) : (
        <div className="region-interest-actions">
          {trimmedArea ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void raiseHand()}
              disabled={state === "submitting"}
            >
              {state === "submitting" ? "Noting…" : `Tell us you'd play near ${trimmedArea}`}
            </button>
          ) : null}
          <Link href="/research">Tell us where you&apos;d play</Link>
          <Link href="/landing">See how it works</Link>
        </div>
      )}

      {state === "error" ? (
        <p className="error-message" role="alert">{errorMessage}</p>
      ) : null}
    </div>
  );
}
