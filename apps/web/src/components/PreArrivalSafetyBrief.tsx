"use client";

import { useEffect, useState } from "react";

/**
 * PreArrivalSafetyBrief — a calm, always-free "meeting safely" note shown to an
 * accepted participant at the commitment/arrival moment (the event room). It is
 * NOT a paywall or a scary warning: it restates the core safety promise in host
 * voice and points at the report / block / leave controls that are already on
 * this page.
 *
 * It claims only what is true (no "verified", no "guaranteed safe") and exposes
 * no location beyond what the room already shows to accepted participants. It is
 * dismissible per-event (remembered in localStorage) so it never nags, but the
 * underlying safety controls stay on the page whether or not the brief is shown.
 *
 * Pure CSS reveal; honours prefers-reduced-motion via globals.css. No data
 * fetching, so there is no loading/failure network state — the only "state" is
 * whether this member already dismissed the brief for this event.
 */

const STORAGE_PREFIX = "sd:prearrival-brief-dismissed:";

// How close to the start counts as "soon" — tunes only the eyebrow framing, not
// what guidance is shown. Exported for tests.
export const NEAR_ARRIVAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Choose the calm eyebrow for the brief based on how near the meeting is. Pure
 * and deterministic so it is unit-testable and identical on server and client.
 */
export function preArrivalEyebrow(startsAt: string, now: number = Date.now()): string {
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) return "Meeting safely";
  const untilStart = start - now;
  if (untilStart <= 0) return "You're meeting today";
  if (untilStart <= NEAR_ARRIVAL_WINDOW_MS) return "Before you head out";
  return "Meeting safely";
}

export default function PreArrivalSafetyBrief({
  eventId,
  startsAt,
  safetyControlsId,
  leaveControlId,
}: {
  eventId: string;
  startsAt: string;
  safetyControlsId: string;
  leaveControlId: string;
}) {
  // Server render and first client paint show the brief so it is present without
  // JS and for screen readers; an already-dismissed member hides it after mount.
  const [dismissed, setDismissed] = useState(false);
  const [eyebrow, setEyebrow] = useState<string>(() => preArrivalEyebrow(startsAt, 0));

  useEffect(() => {
    let active = true;
    // Resolve the client-only bits (current-time framing + prior dismissal) off
    // the effect body so we never synchronously cascade a re-render on mount.
    Promise.resolve().then(() => {
      if (!active) return;
      setEyebrow(preArrivalEyebrow(startsAt));
      try {
        if (window.localStorage.getItem(`${STORAGE_PREFIX}${eventId}`) === "1") {
          setDismissed(true);
        }
      } catch {
        // Private-mode / storage-blocked: just keep showing the brief. Never fail.
      }
    });
    return () => {
      active = false;
    };
  }, [eventId, startsAt]);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${eventId}`, "1");
    } catch {
      // Storage unavailable — the brief still hides for this view.
    }
  }

  if (dismissed) return null;

  return (
    <section className="prearrival-brief" aria-labelledby="prearrival-brief-title" role="region">
      <div className="prearrival-brief-head">
        <div>
          <p className="panel-label">{eyebrow}</p>
          <h2 id="prearrival-brief-title">Meeting someone new, calmly</h2>
        </div>
        <button
          type="button"
          className="prearrival-brief-dismiss"
          onClick={dismiss}
          aria-label="Dismiss the meeting-safely note"
        >
          Got it
        </button>
      </div>
      <p className="prearrival-brief-lede">
        A quick, always-free note before you go. Nothing here costs anything, and you stay in control
        the whole time.
      </p>
      <ul className="prearrival-brief-list">
        <li>
          <strong>Meet in the public spot first.</strong> Start where the plan says — the stated venue,
          in the open — before anything else.
        </li>
        <li>
          <strong>Tell a friend where you&apos;re going.</strong> Share the venue and time with someone
          you trust, and roughly when you expect to be back.
        </li>
        <li>
          <strong>You can leave any time.</strong> If it feels different from the invitation, you owe no
          explanation. Stepping back is always allowed.
        </li>
        <li>
          <strong>Report, block, or leave from here.</strong> Those controls are on this page and free
          to use — <a href={`#${safetyControlsId}`}>report or block someone</a> or{" "}
          <a href={`#${leaveControlId}`}>leave this event</a> whenever you need to.
        </li>
      </ul>
      <p className="prearrival-brief-emergency">
        If anyone is ever in immediate danger, move somewhere safe and contact local emergency services.
      </p>
    </section>
  );
}
