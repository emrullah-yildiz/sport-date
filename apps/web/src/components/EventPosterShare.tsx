"use client";

import { useState, useSyncExternalStore } from "react";

import { POSTER_FILE_NAME, STORY_FILE_NAME } from "@/lib/event-poster";
import { buildEventShareIntentLinks } from "@/lib/event-share";

// CapCut-style "Share" control for an event's poster + public invite link
// (CX-20260705-event-poster-share, extended by CX-20260706-poster-share-v2),
// used on the host event page and the public invite page.
//
// - Where the Web Share API can share files (mobile), one tap opens the native
//   sheet with the poster PNG attached → Instagram/WhatsApp/TikTok/etc.
// - Platform row (owner-specified order): Instagram, WhatsApp, Facebook,
//   TikTok, X, copy-link. WhatsApp/Facebook/X are web intents; Instagram and
//   TikTok have NO web prefill, so their buttons run the honest two-step —
//   native file-share of the 9:16 story where possible, otherwise download the
//   story then post from the app (stated plainly in the status line).
// - The ONLY download control is the icon overlaid on the poster preview's
//   top-right corner (owner direction 2026-07-06): revealed on hover/focus on
//   pointer devices, always visible on touch.
//
// PRIVACY: this component only ever shares the poster image, the public invite
// link, and the server-derived `shareText` — all built from the allowlisted
// public payload (approximate area only, no person). Sharing is optional and
// never incentivized. Mirrors InviteFriendButton/ShareEventLink: a cancelled
// native share is not an error, and every control is keyboard reachable with a
// polite live status.

type ShareState =
  | "idle"
  | "shared"
  | "copied"
  | "no-share"
  | "copy-failed"
  | "share-failed"
  | "story-instagram"
  | "story-tiktok";

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
  const storyPath = `${posterPath}?format=story`;

  function resolveShareUrl(): string {
    return shareUrl || (typeof window !== "undefined" ? new URL(invitePath, window.location.origin).toString() : invitePath);
  }

  async function fetchPosterFile(path: string, fileName: string): Promise<File | null> {
    try {
      const response = await fetch(path);
      if (!response.ok) return null;
      return new File([await response.blob()], fileName, { type: "image/png" });
    } catch {
      return null;
    }
  }

  async function share() {
    const url = resolveShareUrl();
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      // No native sheet here (most desktops) — point at the always-visible fallbacks.
      setState("no-share");
      return;
    }

    // Attach the poster file where the platform can take it (the CapCut flow).
    // A failed poster fetch degrades to sharing the link — never a blocked share.
    let files: File[] | undefined;
    if (typeof navigator.canShare === "function") {
      const file = await fetchPosterFile(posterPath, POSTER_FILE_NAME);
      if (file && navigator.canShare({ files: [file] })) files = [file];
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

  // Instagram / TikTok: no web prefill exists, so this is the honest flow —
  // the native sheet with the 9:16 story attached where the browser can do
  // that (the primary mobile path), otherwise download the story and tell the
  // member exactly what to do next. Never a fake "posting…" state.
  async function shareStory(app: "instagram" | "tiktok") {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function"
    ) {
      const file = await fetchPosterFile(storyPath, STORY_FILE_NAME);
      if (file && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: shareTitle, text: `${shareText}\n${resolveShareUrl()}` });
          setState("shared");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setState("idle");
            return;
          }
          // Fall through to the two-step download below.
        }
      }
    }
    // Two-step: save the story-size poster, then post it from the app.
    const anchor = document.createElement("a");
    anchor.href = `${storyPath}&download=1`;
    anchor.download = STORY_FILE_NAME;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setState(app === "instagram" ? "story-instagram" : "story-tiktok");
  }

  async function copyLink() {
    const url = resolveShareUrl();
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
        <div className="event-poster-share-figure">
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
          {/* The one and only download control (owner direction 2026-07-06):
              hover/focus-revealed on pointer devices, always visible on touch.
              An anchor with `download` + the route's attachment disposition
              works without JS and is fully keyboard reachable. */}
          <a
            className="event-poster-share-download-icon"
            href={`${posterPath}?download=1`}
            download={POSTER_FILE_NAME}
            aria-label="Download the event poster image"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M12 3v11m0 0-4.5-4.5M12 14l4.5-4.5M4 18.5h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
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
      </div>

      <div className="event-poster-share-intents" role="group" aria-label="Share on a specific platform">
        <button
          type="button"
          onClick={() => void shareStory("instagram")}
          aria-label="Instagram: get the story-size poster, then post it from the Instagram app"
        >
          Instagram
        </button>
        {intents ? <a href={intents.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
        {intents ? <a href={intents.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> : null}
        <button
          type="button"
          onClick={() => void shareStory("tiktok")}
          aria-label="TikTok: get the story-size poster, then post it from the TikTok app"
        >
          TikTok
        </button>
        {intents ? <a href={intents.x} target="_blank" rel="noopener noreferrer">X</a> : null}
        <button
          type="button"
          onClick={() => void copyLink()}
          aria-label="Copy the public invitation link to your clipboard"
        >
          {state === "copied" ? "Link copied" : "Copy link"}
        </button>
      </div>

      <p className="event-poster-share-status" role="status" aria-live="polite">
        {state === "shared"
          ? "Shared. The poster and link show only the approximate area — the exact meeting point stays private."
          : state === "copied"
            ? "Copied. Paste it anywhere — it reveals only the approximate area, never the exact meeting point."
            : state === "story-instagram"
              ? "Story poster saved (9:16, QR join code included). 1. If it didn't download, use the icon on the poster · 2. Open Instagram and post it as a story."
              : state === "story-tiktok"
                ? "Story poster saved (9:16, QR join code included). 1. If it didn't download, use the icon on the poster · 2. Open TikTok and post it as a story."
                : state === "no-share"
                  ? "No share sheet in this browser — use a platform button, copy the link, or the download icon on the poster."
                  : state === "share-failed"
                    ? "Sharing didn't work here. Use the download icon on the poster or copy the link instead."
                    : state === "copy-failed"
                      ? "Couldn't copy automatically. Open the invitation and copy the address from your browser."
                      : "Poster and link show the approximate area only. Instagram and TikTok have no web posting — their buttons hand you the story to post from the app."}
      </p>
    </div>
  );
}
