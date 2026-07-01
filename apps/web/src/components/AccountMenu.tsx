"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

// A single, shared account affordance for every authenticated surface. It gives a
// signed-in member a discoverable, keyboard-operable way to reach their profile,
// sign out, or switch account from anywhere in ≤1 click — so nobody feels trapped
// on a shared or borrowed device. Both "Sign out" and "Switch account" reuse the
// existing /api/auth/logout flow (which clears the session) and then land on /login;
// "Switch account" is the intent to sign in as someone else, and is the entry point
// for a future true multi-account switcher (tracked as a follow-up).

// Presentational panel — exported so it can be rendered/asserted in isolation. It
// always renders the profile link plus the two logout-backed actions.
export function AccountMenuPanel({
  menuId,
  submitting,
  onNavigate,
  onSignOut,
  panelRef,
}: {
  menuId: string;
  submitting: boolean;
  onNavigate: () => void;
  onSignOut: () => void;
  panelRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className="account-menu-panel" id={menuId} role="menu" ref={panelRef} aria-label="Account">
      <Link
        href="/profile"
        role="menuitem"
        data-account-item
        className="account-menu-item"
        onClick={onNavigate}
      >
        Your profile
      </Link>
      <button
        type="button"
        role="menuitem"
        data-account-item
        className="account-menu-item account-menu-item-switch"
        onClick={onSignOut}
        disabled={submitting}
      >
        {submitting ? "Signing out…" : "Switch account"}
      </button>
      <button
        type="button"
        role="menuitem"
        data-account-item
        className="account-menu-item account-menu-item-signout"
        onClick={onSignOut}
        disabled={submitting}
      >
        {submitting ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

export default function AccountMenu({ firstName }: { firstName?: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) buttonRef.current?.focus();
  }, []);

  // Close on outside click and on Escape, and move focus into the menu on open so
  // keyboard members are never stranded outside it.
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
    // Focus the first item so keyboard members land inside the menu on open.
    const first = panelRef.current?.querySelector<HTMLElement>("[data-account-item]");
    first?.focus();
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  async function signOut() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Full navigation guarantees the cleared session is reflected everywhere.
      window.location.assign("/login");
    }
  }

  const label = firstName ? `Account: ${firstName}` : "Account";

  return (
    <div className="account-menu" ref={containerRef}>
      <button
        type="button"
        ref={buttonRef}
        className="account-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-menu-avatar" aria-hidden="true">
          {firstName ? firstName.charAt(0).toUpperCase() : "•"}
        </span>
        <span className="account-menu-trigger-label">{label}</span>
        <span className="account-menu-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <AccountMenuPanel
          menuId={menuId}
          submitting={submitting}
          onNavigate={() => close()}
          onSignOut={signOut}
          panelRef={panelRef}
        />
      ) : null}
    </div>
  );
}
