// Pure, framework-free profile-readiness logic
// (CX-20260704-interactive-sporty-experience-microgames — part 3).
//
// A HONEST readiness signal: "You're ready to play" is true only when the member
// has the real thing they actually need to take part — at least one sport, which
// is what makes them discoverable and able to join a game. It is NOT a progress
// bar to grind, not a completion score, and not a gate on safety or signup:
//
//  - `ready` reflects a REAL capability (can this profile join/host a game?), not
//    an arbitrary "profile 80% complete" vanity metric.
//  - The enrichment items (intro, languages, prompt, photo) are surfaced as
//    genuinely OPTIONAL polish that helps people say yes — never as blockers, and
//    never framed as something lost by skipping.
//  - No streak, no score, no ranking, no comparison to anyone else, no deadline.

export type ProfileReadinessInput = Readonly<{
  /** Has at least one sport with a level — the real gate to being matchable. */
  hasSport: boolean;
  /** Optional enrichment that helps others decide to play with you. */
  hasIntro: boolean;
  hasLanguage: boolean;
  hasPrompt: boolean;
  hasPhoto: boolean;
}>;

export type ReadinessItem = Readonly<{
  id: "sport" | "intro" | "language" | "prompt" | "photo";
  label: string;
  done: boolean;
  /** Essential items are the real capability gate; the rest are optional polish. */
  essential: boolean;
}>;

export type ProfileReadiness = Readonly<{
  /** True once every ESSENTIAL item is done — i.e. the profile can really play. */
  ready: boolean;
  items: ReadonlyArray<ReadinessItem>;
  /** How many optional enrichment items are done (for a calm, honest "N of M"). */
  enrichmentDone: number;
  enrichmentTotal: number;
}>;

/**
 * Derive the honest readiness picture from real profile facts. Deterministic and
 * side-effect-free so it is trivially testable and can run on the server without
 * tracking anything new.
 */
export function calculateProfileReadiness(input: ProfileReadinessInput): ProfileReadiness {
  const items: ReadinessItem[] = [
    { id: "sport", label: "Add a sport you play", done: input.hasSport, essential: true },
    { id: "intro", label: "Write a short intro", done: input.hasIntro, essential: false },
    { id: "photo", label: "Add a photo", done: input.hasPhoto, essential: false },
    { id: "language", label: "List a language", done: input.hasLanguage, essential: false },
    { id: "prompt", label: "Answer a prompt", done: input.hasPrompt, essential: false },
  ];
  const enrichment = items.filter((item) => !item.essential);
  return {
    ready: items.filter((item) => item.essential).every((item) => item.done),
    items,
    enrichmentDone: enrichment.filter((item) => item.done).length,
    enrichmentTotal: enrichment.length,
  };
}
