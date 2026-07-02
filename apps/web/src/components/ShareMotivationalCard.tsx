"use client";

import { useId, useMemo, useState } from "react";

import { BRAND_NAME } from "@/lib/brand";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  buildCardSvg,
  selectMotivationalLine,
  sanitizeFirstName,
  type MotivationalCardData,
} from "@/lib/motivational-card";

/**
 * ShareMotivationalCard — a calm, member-INITIATED offer to create a warm, branded
 * card to share (Instagram Story friendly). Nothing is ever posted automatically;
 * the share sheet / download only fires on the member's explicit tap.
 *
 * Humane guardrails (CX-20260701-shareable-branded-motivational-card):
 *  - The card carries ONLY a curated warm line + the Rally brand, plus the
 *    member's OWN first name IF they opt in. No other member, no photo, no
 *    location, no stat/score/count/streak — enforced by the payload type in
 *    lib/motivational-card (this component cannot add those fields).
 *  - Copy is a curated rotation (no free text → no PII/abuse vector).
 *  - It is an offer, never a nag: no "share to unlock", no counter, no pressure.
 *  - Accessible: real <button>s, keyboard-operable, 44px targets, visible focus
 *    (global ring), screen-reader labels. Static card → inherently reduced-motion
 *    safe (no required animation).
 *  - Self-contained: rasterizes the SVG to PNG client-side; no paid/external
 *    service. Fails closed calmly (a clear message + the raw card stays visible)
 *    if a browser capability is missing.
 */

type ShareResult =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "shared" }
  | { kind: "downloaded" }
  | { kind: "unavailable" }
  | { kind: "error" };

/**
 * Decide, purely, how a share attempt should proceed given the environment's
 * capabilities. Kept separate + exported so the branch selection is unit-tested
 * without a real browser. Web Share with a file is preferred (native Story
 * sharing on mobile); otherwise we fall back to a PNG download; if neither is
 * possible we surface a calm "unavailable" state — never a dead button.
 */
export function decideShareStrategy(caps: {
  canShareFiles: boolean;
  canDownload: boolean;
}): "web-share" | "download" | "unavailable" {
  if (caps.canShareFiles) return "web-share";
  if (caps.canDownload) return "download";
  return "unavailable";
}

/** Build a PNG blob from the card SVG via an offscreen canvas (browser only). */
async function rasterizeCardToPng(svg: string): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image-decode-failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas-unavailable");
    ctx.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) throw new Error("encode-failed");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ShareMotivationalCard({
  firstName,
  seed,
}: {
  /** The member's OWN first name, offered as an OPT-IN personal touch only. */
  firstName?: string;
  /** Deterministic seed for which curated line shows (defaults to day-of-year). */
  seed?: number;
}) {
  const panelId = useId();
  const resolvedSeed = seed ?? dayOfYearSeed();
  const [includeName, setIncludeName] = useState(false);
  const [result, setResult] = useState<ShareResult>({ kind: "idle" });

  const cleanFirstName = sanitizeFirstName(firstName);
  const canOfferName = cleanFirstName.length > 0;

  const cardData: MotivationalCardData = useMemo(
    () => ({
      line: selectMotivationalLine(resolvedSeed),
      firstName: includeName && canOfferName ? cleanFirstName : undefined,
    }),
    [resolvedSeed, includeName, canOfferName, cleanFirstName],
  );

  const svg = useMemo(() => buildCardSvg(cardData), [cardData]);
  // Inline data URL for the on-screen preview — pure, no network.
  const previewSrc = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    [svg],
  );

  async function onShare() {
    setResult({ kind: "working" });
    // Build the PNG first; if rasterization isn't possible, fail closed calmly.
    let pngFile: File;
    try {
      const blob = await rasterizeCardToPng(svg);
      pngFile = new File([blob], `${BRAND_NAME.toLowerCase()}-card.png`, { type: "image/png" });
    } catch {
      setResult({ kind: "unavailable" });
      return;
    }

    const nav = typeof navigator === "undefined" ? undefined : navigator;
    const canShareFiles = Boolean(
      nav?.share &&
        (typeof nav.canShare !== "function" || nav.canShare({ files: [pngFile] })),
    );
    const canDownload =
      typeof document !== "undefined" && typeof URL.createObjectURL === "function";

    const strategy = decideShareStrategy({ canShareFiles, canDownload });

    if (strategy === "web-share") {
      try {
        await nav!.share({
          files: [pngFile],
          title: `${BRAND_NAME}`,
          text: cardData.line,
        });
        setResult({ kind: "shared" });
      } catch (err) {
        // A user-cancelled share is not an error — return calmly to idle.
        if (err instanceof DOMException && err.name === "AbortError") {
          setResult({ kind: "idle" });
          return;
        }
        // Otherwise try the download fallback rather than dead-ending.
        if (canDownload) {
          downloadPng(pngFile);
          setResult({ kind: "downloaded" });
        } else {
          setResult({ kind: "error" });
        }
      }
      return;
    }

    if (strategy === "download") {
      downloadPng(pngFile);
      setResult({ kind: "downloaded" });
      return;
    }

    setResult({ kind: "unavailable" });
  }

  return (
    <section className="share-card" aria-labelledby={`${panelId}-title`}>
      <div className="share-card-copy">
        <p className="panel-label">A moment to keep</p>
        <h2 id={`${panelId}-title`}>Make a card to share</h2>
        <p>
          If you feel like it, make a small, warm card to share on a Story — just a
          kind line and the {BRAND_NAME} name. It shows nothing about anyone else, no
          location, and no numbers. Entirely up to you; nothing is posted unless you
          choose to.
        </p>
        {canOfferName ? (
          <label className="share-card-name-opt">
            <input
              type="checkbox"
              checked={includeName}
              onChange={(e) => setIncludeName(e.target.checked)}
            />
            <span>Add my first name ({cleanFirstName}) to the card</span>
          </label>
        ) : null}
        <div className="share-card-actions">
          <button
            type="button"
            className="share-card-button"
            onClick={onShare}
            disabled={result.kind === "working"}
            aria-label={`Create and share a ${BRAND_NAME} motivational card`}
          >
            {result.kind === "working" ? "Preparing your card…" : "Share this moment"}
          </button>
        </div>
        <p className="share-card-status" role="status" aria-live="polite">
          {statusMessage(result)}
        </p>
      </div>
      <div className="share-card-preview" aria-hidden="true">
        {/* On-screen preview of the exact card. Decorative — the accessible card
            content is announced via the button label + the SVG's own aria-label
            when shared. eslint-disable: this is a generated data URL, not a remote
            asset, so next/image is inappropriate. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt=""
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          className="share-card-preview-img"
        />
      </div>
    </section>
  );
}

function statusMessage(result: ShareResult): string {
  switch (result.kind) {
    case "shared":
      return "Shared. Thanks for spreading a little of the good feeling.";
    case "downloaded":
      return "Saved to your device — share it to a Story whenever you like.";
    case "unavailable":
      return "This browser can't create the image. You can still enjoy the preview above.";
    case "error":
      return "Something went wrong making the card. No worries — nothing was shared.";
    case "working":
      return "Preparing your card…";
    default:
      return "";
  }
}

function downloadPng(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Day-of-year → rotates the curated line gently by default; deterministic. */
function dayOfYearSeed(date = new Date()): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}
