"use client";

import { useState } from "react";

// "Invite a friend" — an honest, lightweight way to bring a specific friend to a
// real game (CX-20260704-growth-invite-a-friend-to-event). It shares the event's
// PUBLIC invite link (`/e/{id}` — approximate area only, no PII) via the OS share
// sheet (navigator.share) with a copy-link fallback. Deliberately NOT gamified:
// no invite counts/rewards/leaderboards, no address-book access, no auto-DMs, no
// attribution tracking — just a convenience to share a link the member chooses.
export default function InviteFriendButton({ eventId, sport }: { eventId: string; sport?: string }) {
  const [state, setState] = useState<"idle" | "shared" | "copied" | "failed">("idle");

  async function invite() {
    const path = `/e/${eventId}`;
    const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
    const shareData = {
      title: sport ? `${sport} — come along?` : "Come along to this?",
      text: "I'm thinking of going to this — want to come along?",
      url,
    };
    // Prefer the native share sheet where available (mobile). It shows only the
    // approximate-area public invite.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setState("shared");
        return;
      } catch {
        // A user-cancelled share is not an error — fall through to copy only if
        // sharing genuinely isn't usable; a cancel just returns to idle.
        setState("idle");
        return;
      }
    }
    // Fallback: copy the link to the clipboard.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setState("copied");
        return;
      }
      throw new Error("clipboard-unavailable");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="invite-friend">
      <button type="button" className="invite-friend-button" onClick={() => void invite()} aria-label="Invite a friend to this event">
        Invite a friend
      </button>
      <p className="invite-friend-status" role="status" aria-live="polite">
        {state === "shared"
          ? "Shared. It only shows the approximate area — the exact meeting point stays private."
          : state === "copied"
            ? "Link copied. Send it to a friend you'd actually play with — it reveals only the approximate area."
            : state === "failed"
              ? "Couldn't share automatically. Copy this page's link from your browser to send it on."
              : "Bring a friend you'd play with. The link shows only the approximate area, never the exact spot."}
      </p>
    </div>
  );
}
