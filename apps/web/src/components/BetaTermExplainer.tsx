"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

// A single, shared, accessible way to explain a rare gate-keeping term the moment a
// member first meets it (e.g. "private beta"). It is NOT hover-only: the trigger is a
// real focusable button with an aria-expanded disclosure contract, and the explanation
// is a plain inline note linked to the trigger via aria-controls + aria-describedby, so
// keyboard and screen-reader members reach it exactly like a mouse user. Esc closes and
// returns focus; an outside click closes it; the panel is dismissible with its own Close
// control. Copy states only what is true today — no unproven safety/verification claims.
//
// Reused for any rare term surfaced to members by passing a different `label` / `points`.

// The honest explanation of the "early preview" (the member-visible term since
// CX-20260704 — "private beta" read as a closed door when access is genuinely
// open). Kept here so every surface tells the member the same true story. Each
// point is a short fact, not a promise.
export const PRIVATE_BETA_POINTS: readonly string[] = [
  "This is a free early preview for adults (18+); our first events are in Europe.",
  "Features are still being built — some are marked “preview” and may change or arrive later.",
  "It is free to use during the preview.",
  "Access is open: anyone eligible can create a profile — no invite is required.",
];

export const PRIVATE_BETA_LABEL = "What does “early preview” mean?";

// Presentational note — exported so it can be rendered and asserted in isolation. It is
// the exact content the disclosure renders when open.
export function BetaTermPanel({
  panelId,
  title,
  points,
  onClose,
  panelRef,
}: {
  panelId: string;
  title: string;
  points: readonly string[];
  onClose?: () => void;
  panelRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className="term-explainer-panel" id={panelId} role="group" aria-label={title} ref={panelRef}>
      <ul className="term-explainer-points">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {onClose ? (
        <button type="button" className="term-explainer-close" data-term-close onClick={onClose}>
          Got it
        </button>
      ) : null}
    </div>
  );
}

export default function BetaTermExplainer({
  label = PRIVATE_BETA_LABEL,
  points = PRIVATE_BETA_POINTS,
  className,
}: {
  label?: string;
  points?: readonly string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) buttonRef.current?.focus();
  }, []);

  // Close on outside click and on Escape so a member is never stranded with the note open.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <span className={`term-explainer${className ? ` ${className}` : ""}`} ref={containerRef}>
      <button
        type="button"
        ref={buttonRef}
        className="term-explainer-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="term-explainer-icon" aria-hidden="true">?</span>
        <span className="term-explainer-label">{label}</span>
      </button>
      {open ? (
        <BetaTermPanel
          panelId={panelId}
          title={label}
          points={points}
          onClose={() => close(true)}
          panelRef={panelRef}
        />
      ) : null}
    </span>
  );
}
