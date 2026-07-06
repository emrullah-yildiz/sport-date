"use client";

import { useState } from "react";

import { trackClick } from "@/lib/track-click";

/**
 * Copies the public (approximate-only) invitation link so a host can share their
 * event. The link points at the discovery view, which never exposes the precise
 * meeting point. Falls back to selecting the URL text if the clipboard API is
 * unavailable, and stays fully keyboard reachable and screen-reader named.
 */
export default function ShareEventLink({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    // Anonymous counter (CX-20260706): counts only that sharing was opened —
    // never which event or member. Fire-and-forget.
    trackClick("share_opened");
    const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
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
    <div className="share-event">
      <button type="button" className="share-event-button" onClick={copy} aria-label="Copy the shareable invitation link to your clipboard">
        {state === "copied" ? "Link copied" : "Copy invitation link"}
      </button>
      <p className="share-event-status" role="status" aria-live="polite">
        {state === "copied"
          ? "Copied. Share it anywhere — it only reveals the approximate area, never the exact meeting point."
          : state === "failed"
            ? "Couldn't copy automatically. Open the invitation below and copy the address from your browser."
            : "The shared link shows only the approximate area until you accept a request."}
      </p>
    </div>
  );
}
