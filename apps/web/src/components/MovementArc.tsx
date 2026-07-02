import Link from "next/link";

import { MOVEMENT_STAGES } from "@sport-date/domain";

import MomentGlow from "@/components/MomentGlow";
import type { MemberMovementProgress } from "@/lib/progress";

/**
 * A warm, HONEST, retrospective reflection built only from real completed events
 * the member privately confirmed they attended (never invented, never a target).
 * It celebrates real meetings that already happened — memory, not a score to
 * chase. Empty state stays encouraging without pressure.
 */
function movementReflection(progress: MemberMovementProgress): string {
  const { attendedMoves, hostedMoves, joinedMoves } = progress;
  if (attendedMoves === 0) {
    return "No shared games yet — your first real meeting is the only thing that starts this.";
  }
  const games = attendedMoves === 1 ? "1 real game" : `${attendedMoves} real games`;
  if (hostedMoves > 0 && joinedMoves > 0) {
    return `You've shared ${games} — some you hosted, some you joined. Each one actually happened.`;
  }
  if (hostedMoves > 0) {
    return `You've hosted and shared ${games}. Real people showed up because you made the plan real.`;
  }
  return `You've shown up for ${games}. That is time you spent moving with real people.`;
}

/**
 * MovementArc — a member's private, calm progression. This is a FAST, fully
 * functional 2D/SVG/CSS design (no WebGL, no canvas, no continuous render): a
 * horizontal milestone track whose nodes light up as stages are reached, with
 * the current stage highlighted and a lime fill showing partial progress toward
 * the next stage. Every bit of progress is also exposed as an accessible stage
 * list, and the privacy footer is preserved. It honours `prefers-reduced-motion`
 * (no transition) and is responsive down to ~390px.
 */
export default function MovementArc({ progress }: { progress: MemberMovementProgress }) {
  const currentSlug = progress.currentStage.slug;
  const currentIndex = MOVEMENT_STAGES.findIndex((stage) => stage.slug === currentSlug);
  const lastIndex = MOVEMENT_STAGES.length - 1;

  // How far the lime fill reaches along the track (0..100%): full stages cleared
  // plus the partial progress toward the next one. Mirrors the same real data
  // the stage list shows — no separate notion of "score". With the final stage
  // reached (none ahead) the track is fully lit.
  const fillPercent =
    lastIndex === 0
      ? 100
      : Math.min(100, ((currentIndex + progress.stageProgressPercent / 100) / lastIndex) * 100);

  return (
    <section className="movement-arc" aria-labelledby="movement-arc-title">
      {progress.attendedMoves > 0 ? <MomentGlow tone="go" /> : null}
      <header>
        <div>
          <p className="panel-label">Your Movement Arc</p>
          <h2 id="movement-arc-title">{progress.currentStage.label}</h2>
          <p className="movement-reflection">{movementReflection(progress)}</p>
        </div>
        <div className="movement-count">
          <strong>{progress.attendedMoves}</strong>
          <span>self-confirmed {progress.attendedMoves === 1 ? "move" : "moves"}</span>
        </div>
      </header>

      {/* Functional milestone track. Decorative (the real, labelled progression
          is the accessible <ol> below), so the visual track is aria-hidden to
          avoid a duplicate reading for screen-reader users. */}
      <div className="movement-rail" aria-hidden="true">
        <div className="movement-rail-line">
          <span className="movement-rail-fill" style={{ width: `${fillPercent}%` }} />
        </div>
        <ul className="movement-rail-nodes">
          {MOVEMENT_STAGES.map((stage) => {
            const reached = progress.attendedMoves >= stage.threshold;
            const isCurrent = stage.slug === currentSlug;
            const state = isCurrent ? "current" : reached ? "reached" : "upcoming";
            return (
              <li key={stage.slug} className={`movement-node movement-node--${state}`}>
                <span className="movement-node-dot">{reached ? "✓" : stage.threshold}</span>
                <span className="movement-node-label">{stage.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Accessible, labelled stage list — the source of truth for assistive tech. */}
      <ol className="movement-stages">
        {MOVEMENT_STAGES.map((stage) => (
          <li
            key={stage.slug}
            className={progress.attendedMoves >= stage.threshold ? "reached" : "upcoming"}
            aria-current={stage.slug === currentSlug ? "step" : undefined}
          >
            <span>{stage.threshold}</span>
            <strong>{stage.label}</strong>
          </li>
        ))}
      </ol>

      <div className="movement-story">
        <p>
          {progress.nextStage
            ? `${progress.movesToNextStage} more self-confirmed ${progress.movesToNextStage === 1 ? "move" : "moves"} to reach ${progress.nextStage.label}.`
            : "Your arc is open-ended now. Keep choosing movement that feels worthwhile—there is no leaderboard to chase."}
        </p>
        <div>
          <span>{progress.hostedMoves} hosted</span>
          <span>{progress.joinedMoves} joined</span>
        </div>
      </div>

      {progress.recentMoves.length > 0 ? (
        <div className="movement-recent">
          {progress.recentMoves.map((move) => (
            <Link href={`/events/${move.eventId}/room`} key={move.eventId}>
              <span>
                {move.sport} · {move.role}
              </span>
              <strong>{move.title}</strong>
              <small>{new Date(move.startsAt).toLocaleDateString()}</small>
            </Link>
          ))}
        </div>
      ) : (
        <div className="movement-empty">
          <p>Your arc begins after a finished event when you privately confirm you attended.</p>
          <Link href="/discover">Find a first move</Link>
        </div>
      )}

      <footer>Private by design. No streaks, public scores, or points for browsing and rejection.</footer>
    </section>
  );
}
