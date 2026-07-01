import Link from "next/link";
import type { ReactNode } from "react";

import AccountMenu from "@/components/AccountMenu";
import { BRAND_NAME, Wordmark } from "@/lib/brand";

// The single shared primary navigation for every authenticated member surface.
//
// Before this component, each page assembled its own `.profile-nav` by hand, so
// the destinations drifted surface to surface (discover linked "Your events" +
// "Host an event"; hosting linked only "Host an event"; profile linked nothing;
// safety/feedback linked "Back to profile"; the logo pointed at /profile on some
// pages and /discover on others). That is exactly the "hard to navigate" clutter
// the refresh calls out.
//
// This standardizes the primary bar to a small, consistent set of destinations
// (docs/design-refresh-2026.md §3):
//
//   Discover · Host · Safety   + the Account menu
//
// Everything else — Profile, Switch account, Sign out, Feedback — lives in the
// AccountMenu (progressive disclosure); Legal & trust lives in the SiteFooter.
// `/moderation` is staff-only and never appears here.
//
// The bar is a `<nav aria-label="Primary">` landmark. Each destination is a
// real link; the one matching the current section carries `aria-current="page"`
// so screen readers and the blue active-state styling agree on where you are.
// The optional `action` slot holds a single page-specific affordance (e.g. the
// discover "Host an event" CTA, or a hosting-context label) without reintroducing
// per-page destination drift.

export type PrimaryNavSection = "discover" | "host" | "safety" | null;

/** The consistent primary destinations, in order. Blue active-state per §1. */
const DESTINATIONS: { key: Exclude<PrimaryNavSection, null>; href: string; label: string }[] = [
  { key: "discover", href: "/discover", label: "Discover" },
  { key: "host", href: "/hosting", label: "Host" },
  { key: "safety", href: "/safety", label: "Safety" },
];

export default function PrimaryNav({
  firstName,
  current = null,
  action,
}: {
  firstName?: string;
  /** Which primary destination is the current section, for `aria-current`. */
  current?: PrimaryNavSection;
  /** Optional single page-specific affordance rendered before the account menu. */
  action?: ReactNode;
}) {
  return (
    <nav className="primary-nav" aria-label="Primary">
      <Link href="/discover" className="logo primary-nav-logo" aria-label={`${BRAND_NAME} — go to discover`}>
        <Wordmark decorative />
      </Link>
      <ul className="primary-nav-links">
        {DESTINATIONS.map((destination) => {
          const isCurrent = current === destination.key;
          return (
            <li key={destination.key}>
              <Link
                href={destination.href}
                className="primary-nav-link"
                aria-current={isCurrent ? "page" : undefined}
              >
                {destination.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="primary-nav-end">
        {action ? <div className="primary-nav-action">{action}</div> : null}
        <AccountMenu firstName={firstName} />
      </div>
    </nav>
  );
}
