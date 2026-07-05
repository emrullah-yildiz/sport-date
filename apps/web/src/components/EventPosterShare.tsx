"use client";

import { useState, useSyncExternalStore } from "react";

import { POSTER_FILE_NAME } from "@/lib/event-poster";
import { buildEventShareIntentLinks } from "@/lib/event-share";

// CapCut-style "Share" control for an event's poster + public invite link
// (CX-20260705-event-poster-share), used on the host event page and the public
// invite page.
//
// - Where the Web Share API can share files (mobile), one tap opens the native
//   sheet with the poster PNG attached → Instagram/WhatsApp/TikTok/etc.
// - Everywhere else: download-poster + copy-link + WhatsApp/Telegram/X intent
//   links (Instagram has no web prefill, so the flow there is download + post
//   from the app — stated honestly below the controls).
//
// PRIVACY: this component only ever shares the poster image, the public invite
// link, and the server-derived `shareText` — all built from the allowlisted
// public payload (approximate area only, no person). Sharing is optional and
// never incentivized. Mirrors InviteFriendButton/ShareEventLink: a cancelled
// native share is not an error, and every control is keyboard reachable with a
// polite live status.

type ShareState = "idle" | "shared" | "copied" | "no-share" | "copy-failed" | "share-failed";

// Hydration-safe "are we in the browser yet?" signal: false on the server and
// for the first client render, true after hydration — without any effect state.
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export default function EventPosterShare({
  invitePath,
  posterPath,
  shareTitle,
  shareText,
  posterAlt,
  absoluteInviteUrl,
  showPreview = true,
}: {
  /** The public invite path, e.g. `/e/{id}`. */
  invitePath: string;
  /** The poster image path, e.g. `/e/{id}/poster`. */
  posterPath: string;
  /** Share-sheet title — the derived public headline, never host free text. */
  shareTitle: string;
  /** Share message, precomputed server-side from the public payload only. */
  shareText: string;
  /** Accessible description of the poster preview. */
  posterAlt: string;
  /** Absolute invite URL when the deploy origin is configured; else derived client-side. */
  absoluteInviteUrl?: string | null;
  showPreview?: boolean;
}) {
  const [state, setState] = useState<ShareState>("idle");
  // Without a configured origin the absolute link is only knowable in the
  // browser; it resolves right after hydration so server and first client
  // render match ("" → the intent links appear once the origin is known).
  const hydrated = useHydrated();
  const shareUrl = absoluteInviteUrl ?? (hydrated ? new URL(invitePath, window.location.origin).toString() : "");

  async function share() {
    const url = shareUrl || (typeof window !== "undefined" ? new URL(invitePath, window.location.origin).toString() : invitePath);
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      // No native sheet here (most desktops) — point at the always-visible fallbacks.
      setState("no-share");
      return;
    }

    // Attach the poster file where the platform can take it (the CapCut flow).
    // A failed poster fetch degrades to sharing the link — never a blocked share.
    let files: File[] | undefined;
    try {
      if (typeof navigator.canShare === "function") {
        const response = await fetch(posterPath);
        if (response.ok) {
          const file = new File([await response.blob()], POSTER_FILE_NAME, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) files = [file];
        }
      }
    } catch {
      files = undefined;
    }

    try {
      // With a file attached some targets drop the separate `url`, so the link
      // rides inside the text; link-only shares pass `url` for rich previews.
      if (files) {
        await navigator.share({ files, title: shareTitle, text: `${shareText}\n${url}` });
      } else {
        await navigator.share({ title: shareTitle, text: shareText, url });
      }
      setState("shared");
    } catch (error) {
      // A user-cancelled sheet is not an error — return to idle quietly.
      if (error instanceof DOMException && error.name === "AbortError") {
        setState("idle");
        return;
      }
      setState("share-failed");
    }
  }

  async function copyLink() {
    const url = shareUrl || (typeof window !== "undefined" ? new URL(invitePath, window.location.origin).toString() : invitePath);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setState("copied");
        return;
      }
      throw new Error("clipboard-unavailable");
    } catch {
      setState("copy-failed");
    }
  }

  const intents = shareUrl ? buildEventShareIntentLinks(shareUrl, shareText) : null;

  return (
    <div className="event-poster-share">
      {showPreview ? (
        <a
          className="event-poster-share-preview"
          href={posterPath}
          target="_blank"
          rel="noreferrer"
          aria-label="Open the full-size event poster in a new tab"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- the poster is itself a
              server-generated PNG route; Next's optimizer would only re-proxy it. */}
          <img src={posterPath} alt={posterAlt} width={270} height={338} loading="lazy" />
        </a>
      ) : null}

      <div className="event-poster-share-actions">
        <button
          type="button"
          className="event-poster-share-button"
          onClick={() => void share()}
          aria-label="Share the event poster and invitation link"
        >
          Share
        </button>
        <a
          className="event-poster-share-download"
          href={`${posterPath}?download=1`}
          download={POSTER_FILE_NAME}
          aria-label="Download the event poster image"
        >
          Download poster
        </a>
        <button
          type="button"
          className="event-poster-share-copy"
          onClick={() => void copyLink()}
          aria-label="Copy the public invitation link to your clipboard"
        >
          {state === "copied" ? "Link copied" : "Copy link"}
        </button>
      </div>

      {intents ? (
        <div className="event-poster-share-intents" role="group" aria-label="Share on a specific platform">
          <a href={intents.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={intents.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
          <a href={intents.x} target="_blank" rel="noopener noreferrer">X</a>
        </div>
      ) : null}

      <p className="event-poster-share-status" role="status" aria-live="polite">
        {state === "shared"
          ? "Shared. The poster and link show only the approximate area — the exact meeting point stays private."
          : state === "copied"
            ? "Copied. Paste it anywhere — it reveals only the approximate area, never the exact meeting point."
            : state === "no-share"
              ? "No share sheet in this browser — use download, copy, or a platform button below."
              : state === "share-failed"
                ? "Sharing didn't work here. Download the poster or copy the link instead."
                : state === "copy-failed"
                  ? "Couldn't copy automatically. Open the invitation and copy the address from your browser."
                  : "Poster and link show the approximate area only. For Instagram: download the poster, then post it from the app."}
      </p>
    </div>
  );
}
