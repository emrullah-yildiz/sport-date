"use client";

import { useEffect, useState } from "react";

import { detectMilestone, type MilestoneCounts } from "@sport-date/domain";

import MomentGlow from "@/components/MomentGlow";
import ShareMotivationalCard from "@/components/ShareMotivationalCard";

/**
 * MilestoneMoment — a warm, dignified, PRIVATE acknowledgement when a member
 * crosses a REAL milestone in their own real participation: their first game,
 * third game, or first time hosting (CX-20260701-humane-milestone-moments).
 *
 * Humane guardrails (these are the point of the feature):
 *  - Honest + derived: the milestone is computed by `detectMilestone` purely from
 *    the member's already-earned, qualified-attendance counts (the same data the
 *    Movement Arc uses). It invents no number and tracks no new behavior. If there
 *    is no real milestone, this renders nothing — no dead-end, no nag.
 *  - NOT a scoreboard: no streak, score, rank, points, level, badge, leaderboard,
 *    popularity, or comparison to anyone else. It is a reflection of what the
 *    member actually did, in a calm host voice — never a target to chase or lose.
 *  - Private: it appears only on the member's own profile and says nothing to or
 *    about anyone else.
 *  - Opt-out: a clear, private "turn these off" control. It suppresses future
 *    moments only; the member's real progress/earned milestones are unaffected.
 *    The preference is remembered locally (like the pre-arrival brief) — no new
 *    tracked server behavior.
 *  - Celebration is a decorative MomentGlow (aria-hidden, one-shot, static under
 *    reduced motion), never a gate. It MAY offer the opt-in ShareMotivationalCard
 *    as a calm way to keep the moment — never required.
 *
 * It renders on first paint (server + hydrate) so it is present without JS and
 * for screen readers; an opted-out member hides it after mount.
 */

// Per-member local suppression key. Private to this browser/account view; turning
// milestones off never touches the member's earned progress.
const OPT_OUT_KEY = "rally:milestone-moments-opt-out";

export default function MilestoneMoment({
  counts,
  firstName,
}: {
  counts: MilestoneCounts;
  /** The member's OWN first name, passed only to the opt-in share card. */
  firstName?: string;
}) {
  const milestone = detectMilestone(counts);
  const [optedOut, setOptedOut] = useState(false);
  const [confirmingOff, setConfirmingOff] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        if (window.localStorage.getItem(OPT_OUT_KEY) === "1") setOptedOut(true);
      } catch {
        // Storage blocked (private mode) — just keep default (shown). Never fail.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function turnOff() {
    setOptedOut(true);
    setConfirmingOff(false);
    try {
      window.localStorage.setItem(OPT_OUT_KEY, "1");
    } catch {
      // Storage unavailable — it still hides for this view.
    }
  }

  function turnBackOn() {
    setOptedOut(false);
    try {
      window.localStorage.removeItem(OPT_OUT_KEY);
    } catch {
      // Storage unavailable — no-op.
    }
  }

  // No real milestone → nothing to acknowledge. No dead-end, no placeholder.
  if (!milestone) return null;

  // Opted out → show only a tiny, calm way back on; no moment, no pressure.
  if (optedOut) {
    return (
      <section className="milestone-moment milestone-moment--off" aria-label="Milestone moments">
        <p className="milestone-off-note">
          Milestone moments are off. We&rsquo;ll keep them to yourself and stay quiet.
        </p>
        <button type="button" className="milestone-linkbutton" onClick={turnBackOn}>
          Turn milestone moments back on
        </button>
      </section>
    );
  }

  return (
    <section className="milestone-moment" aria-labelledby="milestone-moment-title" role="region">
      {/* Decorative one-shot green glow behind the content — never gates it. */}
      <MomentGlow tone="go" />
      <div className="milestone-moment-body">
        <p className="panel-label">A quiet moment, just for you</p>
        <h2 id="milestone-moment-title">{milestone.title}</h2>
        <p className="milestone-moment-copy">{milestone.body}</p>
        <p className="milestone-moment-private">
          This is private to you — no one else sees it, and there&rsquo;s nothing to keep up or lose.
        </p>
        <div className="milestone-moment-controls">
          {confirmingOff ? (
            <span className="milestone-confirm" role="group" aria-label="Turn milestone moments off?">
              <span>Turn these off? Your progress stays exactly as it is.</span>
              <button type="button" className="milestone-linkbutton" onClick={turnOff}>
                Yes, turn off
              </button>
              <button
                type="button"
                className="milestone-linkbutton milestone-linkbutton--muted"
                onClick={() => setConfirmingOff(false)}
              >
                Keep them
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="milestone-linkbutton milestone-linkbutton--muted"
              onClick={() => setConfirmingOff(true)}
            >
              Turn milestone moments off
            </button>
          )}
        </div>
      </div>

      {/* Optional, opt-in way to keep the moment. Never required, never a nag. */}
      <ShareMotivationalCard firstName={firstName} />
    </section>
  );
}
