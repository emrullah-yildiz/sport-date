import Link from "next/link";

import type { ProfileReadiness, ReadinessItem } from "@sport-date/domain";

import MomentGlow from "@/components/MomentGlow";
import ProfileEmptyAction from "@/components/ProfileEmptyAction";

/**
 * ReadinessIndicator — an HONEST "You're ready to play" signal on the member's
 * own profile (CX-20260704-interactive-sporty-experience-microgames — part 3).
 *
 * It reflects a REAL capability, not a vanity metric: you are "ready" once you
 * have a sport, because that is what actually makes you discoverable and able to
 * join a game. When that real bar is crossed, we mark the moment with a subtle,
 * decorative MomentGlow (aria-hidden, one-shot, static under reduced motion) —
 * a success beat tied to a genuine accomplishment, never a payout.
 *
 * Anti-dark-pattern (durable guardrail):
 *  - No score, streak, rank, or completion percentage-as-pressure. The optional
 *    enrichment items are framed as help ("more for people to say yes to"), never
 *    as something lost by skipping, and readiness never depends on them.
 *  - It gates nothing. It is a reflection + a couple of gentle next steps.
 *  - Private to the member's own profile; it says nothing to or about anyone else.
 *
 * Server-renderable (no hooks) so it's present without JS and for screen readers;
 * MomentGlow / ProfileEmptyAction are the only client children.
 */

// Deep-links for each item's "add it" action. Form fields open the profile editor
// on the right field (ProfileEmptyAction); the photo uploader is an in-page anchor.
const ITEM_EDIT_TARGET: Record<ReadinessItem["id"], string> = {
  sport: "edit-profile-sports",
  intro: "edit-profile-bio",
  language: "edit-profile-languages",
  prompt: "edit-profile-prompts",
  photo: "profile-photos-heading",
};

function ItemAction({ item }: { item: ReadinessItem }) {
  if (item.done) return null;
  // The photo uploader isn't a field inside the editor <details>, so it uses a
  // plain in-page anchor; the four editor-backed fields use ProfileEmptyAction,
  // which opens the editor and focuses the named field.
  if (item.id === "photo") {
    return (
      <Link href={`#${ITEM_EDIT_TARGET.photo}`} className="profile-empty-action">
        {item.label} <span aria-hidden="true">→</span>
      </Link>
    );
  }
  return (
    <ProfileEmptyAction target={ITEM_EDIT_TARGET[item.id]}>
      {item.label} <span aria-hidden="true">→</span>
    </ProfileEmptyAction>
  );
}

export default function ReadinessIndicator({
  readiness,
  firstName,
}: {
  readiness: ProfileReadiness;
  firstName: string;
}) {
  const { ready, items, enrichmentDone, enrichmentTotal } = readiness;

  return (
    <section
      className={`readiness${ready ? " readiness--ready" : ""}`}
      aria-labelledby="readiness-title"
      role="region"
    >
      {/* Celebrate the REAL moment the profile can actually play — once, decoratively. */}
      {ready ? <MomentGlow tone="go" /> : null}
      <div className="readiness-body">
        <p className="panel-label">{ready ? "You're set" : "Almost set"}</p>
        {ready ? (
          <>
            <h2 id="readiness-title" className="readiness-title">
              You&rsquo;re ready to play, {firstName}. <span aria-hidden="true">🎉</span>
            </h2>
            <p className="readiness-copy">
              Your profile can be matched to real games now — that&rsquo;s the whole bar. The best
              next step isn&rsquo;t here; it&rsquo;s a game near you.
            </p>
            <div className="readiness-actions">
              <Link href="/discover" className="btn btn--primary">Discover events</Link>
              <Link href="/events/new" className="btn btn--secondary">Host a game</Link>
            </div>
          </>
        ) : (
          <>
            <h2 id="readiness-title" className="readiness-title">
              One step from your first game.
            </h2>
            <p className="readiness-copy">
              Add a sport you play and your profile can be matched to real games. Everything else
              below is optional — it just helps people say yes.
            </p>
          </>
        )}

        <ul className="readiness-list" aria-label="Profile readiness">
          {items.map((item) => (
            <li
              key={item.id}
              className={`readiness-item${item.done ? " readiness-item--done" : ""}${
                item.essential ? " readiness-item--essential" : ""
              }`}
            >
              <span className="readiness-check" aria-hidden="true">{item.done ? "✓" : "○"}</span>
              <span className="readiness-item-label">
                {item.label}
                {item.essential ? <span className="readiness-tag">needed to play</span> : null}
                {!item.essential ? <span className="readiness-tag readiness-tag--optional">optional</span> : null}
              </span>
              <span className="readiness-item-state">
                {item.done ? (
                  <span className="readiness-done-note">Done</span>
                ) : (
                  <ItemAction item={item} />
                )}
              </span>
            </li>
          ))}
        </ul>

        {/* A calm, honest count of optional extras — never a bar to fill under pressure. */}
        <p className="readiness-enrichment-note">
          {enrichmentDone === enrichmentTotal
            ? "You've added every optional touch too — lovely, but never required."
            : `${enrichmentDone} of ${enrichmentTotal} optional touches added. Add more whenever, or don't — your call.`}
        </p>
      </div>
    </section>
  );
}
