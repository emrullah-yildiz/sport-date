/**
 * FirstEventPreparationCard — a warm, practical "how to show up" summary shown to a
 * member attending their FIRST event, right in the coordination room. It sits
 * alongside (not on top of) the pre-arrival safety micro-brief: the safety brief is
 * about staying safe and how to leave; this card is the earlier, calmer logistics /
 * confidence note — what the game is, when, roughly where, what to bring, and how the
 * meet-up actually begins — so a first-timer arrives feeling ready rather than anxious.
 *
 * It reuses only facts the room already has (sport, welcomed levels, start time,
 * approximate area). It exposes NO location beyond the approximate area the room is
 * already authorised to show, makes no invented claims, and is nothing paywalled.
 * Optional host details (welcomed levels, area) degrade to a calm generic line when
 * a host has not filled them in. Pure CSS reveal, reduced-motion honoured in globals.
 *
 * The gating decision ("is this their first event") and the copy derivation are pure
 * and exported so they are unit-testable without a database or a browser.
 */

import { BRAND_NAME } from "@/lib/brand";

const SKILL_RANK: Readonly<Record<string, number>> = { beginner: 1, intermediate: 2, advanced: 3 };

/**
 * Whether to show the first-event preparation card. It appears only for an accepted,
 * non-host participant whose event has not ended and who has no other event
 * participation (their first time). Pure so the page and tests share one rule and it
 * can never grant access — it only decides whether to render an informational card.
 */
export function shouldShowFirstEventPreparation(input: {
  isHost: boolean;
  hasEnded: boolean;
  viewerIsFirstTimer: boolean;
  viewerRequestStatus: string | null | undefined;
}): boolean {
  return (
    !input.isHost &&
    !input.hasEnded &&
    input.viewerIsFirstTimer &&
    input.viewerRequestStatus === "accepted"
  );
}

/**
 * Human, host-toned phrasing for the levels an event welcomes. The event stores the
 * levels it welcomes (e.g. ["beginner", "intermediate"]); matching is inclusive
 * upward, so we describe the FLOOR ("welcomes players from …") honestly rather than
 * implying an exact bracket. Empty / unrecognised input degrades to a calm generic
 * line so a partially-filled event never shows a blank.
 */
export function describeWelcomedLevels(experienceLevels: readonly string[]): string {
  const ranked = experienceLevels
    .map((level) => level.trim().toLowerCase())
    .filter((level) => level in SKILL_RANK);
  if (ranked.length === 0) return "Players of all levels are welcome — just come as you are.";
  const easiest = ranked.reduce((lowest, level) =>
    SKILL_RANK[level] < SKILL_RANK[lowest] ? level : lowest,
  );
  if (easiest === "beginner") return "Beginners are welcome — no experience needed to take part.";
  if (easiest === "intermediate") return "A relaxed intermediate game — comfortable with the basics is plenty.";
  return "An advanced-level game — expect a confident, experienced group.";
}

/**
 * A short, honest "what to bring" line derived from the sport. We only ever suggest
 * ordinary, obvious kit for the activity; we never claim the host provides anything
 * or invent equipment requirements. Falls back to a calm generic line for sports we
 * don't have a specific note for.
 */
export function whatToBringFor(sport: string): string {
  const key = sport.trim().toLowerCase();
  const notes: Readonly<Record<string, string>> = {
    tennis: "Your racket if you have one, comfortable shoes, and water. If you're borrowing gear, message the group beforehand.",
    running: "Comfortable running shoes, weather-appropriate layers, and water.",
    football: "Trainers or boots, comfortable clothes you can move in, and water.",
    basketball: "Court shoes, comfortable clothes, and water.",
    cycling: "Your bike, a helmet, and water — check the plan for the pace.",
    swimming: "Swimwear, a towel, and anything you like for the water.",
    volleyball: "Comfortable clothes you can move in, supportive shoes, and water.",
    yoga: "Comfortable clothes, a mat if you have one, and water.",
    climbing: "Comfortable clothes, and check the plan for whether gear is available to rent.",
    badminton: "Your racket if you have one, indoor shoes, and water.",
  };
  return (
    notes[key] ??
    "Comfortable clothes you can move in, suitable shoes, and water. If you're unsure what to bring, ask the group."
  );
}

export default function FirstEventPreparationCard({
  sport,
  experienceLevels,
  startsAtLabel,
  areaLabel,
  hostFirstName,
  safetyBriefId,
}: {
  sport: string;
  experienceLevels: readonly string[];
  startsAtLabel: string;
  areaLabel: string;
  hostFirstName: string;
  /** Anchor of the pre-arrival safety brief, so we can point at it rather than repeat it. */
  safetyBriefId: string;
}) {
  const levelLine = describeWelcomedLevels(experienceLevels);
  const bringLine = whatToBringFor(sport);
  const hasArea = areaLabel.trim().length > 0;

  return (
    <section className="first-event-prep" aria-labelledby="first-event-prep-title" role="region">
      <p className="panel-label">Your first {BRAND_NAME}</p>
      <h2 id="first-event-prep-title">You&apos;re set — here&apos;s how it&apos;ll go</h2>
      <p className="first-event-prep-lede">
        First time? Nothing fancy to prepare. Here&apos;s the plan in plain terms so you can just show
        up and enjoy the {sport.toLowerCase()}.
      </p>
      <dl className="first-event-prep-facts">
        <div>
          <dt>What you&apos;re joining</dt>
          <dd>
            <strong>{sport}</strong>
            <span>{levelLine}</span>
          </dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>
            <strong>{startsAtLabel}</strong>
            <span>Aim to arrive a few minutes early so you&apos;re not rushing.</span>
          </dd>
        </div>
        <div>
          <dt>Roughly where</dt>
          <dd>
            {hasArea ? (
              <>
                <strong>{areaLabel}</strong>
                <span>The exact meeting spot is in the room below, once you&apos;re accepted.</span>
              </>
            ) : (
              <>
                <strong>Shown in the room below</strong>
                <span>You&apos;ll find the meeting spot in &quot;Where you are meeting&quot; on this page.</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>What to bring</dt>
          <dd>
            <strong>Keep it simple</strong>
            <span>{bringLine}</span>
          </dd>
        </div>
      </dl>
      <ol className="first-event-prep-flow">
        <li>
          <span aria-hidden="true">1</span>
          <p>
            <strong>Meet in the public spot.</strong> Head to the venue shown below and look for{" "}
            {hostFirstName || "the host"} and the group — you don&apos;t need to message anyone first.
          </p>
        </li>
        <li>
          <span aria-hidden="true">2</span>
          <p>
            <strong>Play at your own pace.</strong> Everyone was new once. Say hello, warm up, and take
            it as easy as you like.
          </p>
        </li>
        <li>
          <span aria-hidden="true">3</span>
          <p>
            <strong>You can leave any time.</strong> If it&apos;s not for you, you&apos;re free to step
            away — no explanation owed. Your <a href={`#${safetyBriefId}`}>safety and leaving controls</a>{" "}
            are on this page.
          </p>
        </li>
      </ol>
    </section>
  );
}
