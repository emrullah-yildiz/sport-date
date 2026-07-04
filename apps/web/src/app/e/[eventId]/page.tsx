import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { BRAND_NAME, Wordmark } from "@/lib/brand";
import { resolveAuthEmailOrigin } from "@/lib/auth-email-content";
import { getPublicEventInvite } from "@/lib/events";
import { describePublicInvite } from "@/lib/public-event-invite";
import { getCurrentUser } from "@/lib/session";

// The PUBLIC, UNAUTHENTICATED shareable invite page (`/e/{id}`) —
// CX-20260704-growth-shareable-event-invite-og-image.
//
// A host shares this link anywhere (WhatsApp, Instagram bio, X); it must preview
// richly (see ./opengraph-image.tsx) and land the tap somewhere real. It renders
// ONLY the discovery-safe facts from `getPublicEventInvite` — sport, welcomed
// levels, language, the approximate area, when, duration, honest places left.
// The exact meeting point, host-authored free text, and every person are absent
// by construction (see public-event-invite.ts). Unknown / draft / cancelled /
// completed events 404 safely with zero data leaked.

// Deduplicate the read across generateMetadata + the page within one request.
const loadInvite = cache((eventId: string) => getPublicEventInvite(eventId));

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  const { eventId } = await params;
  const invite = await loadInvite(eventId);
  if (!invite) {
    // A safe, generic 404 title — never confirms whether the id ever existed.
    return { title: "Invitation not available", robots: { index: false } };
  }
  const described = describePublicInvite(invite);
  const origin = resolveAuthEmailOrigin();
  const path = `/e/${invite.id}`;
  return {
    // Absolute og:image / canonical URLs when the deploy origin is configured;
    // Next falls back to the request origin otherwise.
    metadataBase: origin ? new URL(origin) : undefined,
    title: described.metaTitle,
    description: described.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: BRAND_NAME,
      url: path,
      title: `${described.metaTitle} — ${BRAND_NAME}`,
      description: described.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: `${described.metaTitle} — ${BRAND_NAME}`,
      description: described.metaDescription,
    },
  };
}

export default async function PublicEventInvitePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const invite = await loadInvite(eventId);
  if (!invite) notFound();

  const described = describePublicInvite(invite);
  // Auth-aware CTAs: a signed-in member continues straight into the existing
  // request-a-place flow; a visitor is routed to the existing beta sign-up.
  // No new data collection happens on this page.
  const user = await getCurrentUser();
  const memberInvitePath = `/discover/events/${invite.id}`;

  return (
    <main className="public-invite-page">
      <header className="navbar">
        <div className="nav-container">
          <Link className="logo" href="/" aria-label={`${BRAND_NAME} home`}>
            <Wordmark decorative />
          </Link>
          <div className="landing-nav-actions">
            {user ? (
              <Link href="/discover" className="btn btn--accent">Enter {BRAND_NAME}</Link>
            ) : (
              <>
                <Link href="/login" className="nav-signin nav-signin--guest">Sign in</Link>
                <Link href="/signup" className="btn btn--accent">Create a profile</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="landing-shell">
        <section className="public-invite-card" aria-labelledby="invite-title">
          <p className="eyebrow">You&rsquo;re invited · {invite.sport}</p>
          <h1 id="invite-title">{described.headline}</h1>

          <dl className="public-invite-facts">
            <div>
              <dt>When</dt>
              <dd>
                <time dateTime={described.when.machineDateTime}>
                  <span className="public-invite-day">{described.when.day}</span>
                  <span className="public-invite-time">{described.when.time}</span>
                </time>
              </dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{invite.durationMinutes} minutes</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{described.levels}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{invite.language}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{described.area}</dd>
            </div>
            <div>
              <dt>Places</dt>
              <dd>{described.availability.label}</dd>
            </div>
          </dl>

          <p className="public-invite-privacy">
            The area shown is deliberately approximate. The exact meeting point is shared
            only with people the host accepts — it is not on this page, in its link
            preview, or in its data.
          </p>

          {described.hasStarted ? (
            <div className="public-invite-cta" role="status">
              <p className="public-invite-cta-note">
                This one has already started, so requests are closed — but games like it
                are being hosted all the time.
              </p>
              {user ? (
                <Link href="/discover" className="btn btn--primary btn--lg">Find a game near you</Link>
              ) : (
                <Link href="/signup" className="btn btn--primary btn--lg">Join {BRAND_NAME} and find yours</Link>
              )}
            </div>
          ) : described.availability.isFull ? (
            <div className="public-invite-cta" role="status">
              <p className="public-invite-cta-note">
                Every place is taken right now. A spot can open up if someone steps back —
                or there are other games nearby.
              </p>
              {user ? (
                <>
                  <Link href={memberInvitePath} className="btn btn--primary btn--lg">Open this invitation</Link>
                  <Link href="/discover" className="btn btn--secondary btn--lg">See other games</Link>
                </>
              ) : (
                <Link href="/signup" className="btn btn--primary btn--lg">Join {BRAND_NAME} to see more games</Link>
              )}
            </div>
          ) : (
            <div className="public-invite-cta">
              {user ? (
                <Link href={memberInvitePath} className="btn btn--primary btn--lg">Request a place</Link>
              ) : (
                <>
                  <Link href="/signup" className="btn btn--primary btn--lg">Request a place</Link>
                  <Link href="/login" className="btn btn--secondary btn--lg">Sign in to request</Link>
                </>
              )}
              {!user ? (
                <p className="public-invite-cta-note">
                  {BRAND_NAME} is in private beta for adults. Creating a profile takes a
                  couple of minutes; the host then decides on your request.
                </p>
              ) : null}
            </div>
          )}
        </section>

        <footer className="public-invite-footer">
          <p>
            {BRAND_NAME} — meet through movement. Adults only · Europe first ·{" "}
            <Link href="/trust">Trust</Link> · <Link href="/privacy">Privacy</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
