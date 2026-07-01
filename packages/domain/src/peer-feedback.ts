// Post-attendance peer signal — the SAFE MINIMUM.
//
// This is a private, mutual, reliability & respect confirmation one member leaves
// about another member they ACTUALLY attended the same event with. It is
// deliberately NOT a rating: there is no numeric score, no star, no attractiveness
// / desirability / "would date again" dimension, and no public or profile-facing
// surface. The only captured signals are a small fixed set of positive/neutral
// reliability & respect confirmations plus an optional private note routed to
// trust & safety. Whether any of this is ever aggregated or made visible is an
// OWNER decision tracked separately
// (CX-20260701-owner-decision-peer-rating-visibility-and-dimensions) — nothing
// here exposes a signal.

// Fixed confirmation questions. Each is answerable yes / no / prefer_not_to_say.
// The keys are the only dimensions that exist; adding an attractiveness/rating
// dimension here would be a design violation (guarded by a test).
export const PEER_FEEDBACK_CONFIRMATIONS = ["showed_up", "felt_respected", "felt_safe"] as const;
export type PeerFeedbackConfirmation = (typeof PEER_FEEDBACK_CONFIRMATIONS)[number];

export const PEER_FEEDBACK_ANSWERS = ["yes", "no", "prefer_not_to_say"] as const;
export type PeerFeedbackAnswer = (typeof PEER_FEEDBACK_ANSWERS)[number];

export const PEER_FEEDBACK_NOTE_MAX_LENGTH = 1000 as const;

export type PeerFeedbackInput = Readonly<{
  showedUp: PeerFeedbackAnswer;
  feltRespected: PeerFeedbackAnswer;
  feltSafe: PeerFeedbackAnswer;
  // Optional private note to trust & safety. Never shown to the recipient.
  note: string | null;
}>;

export type PeerFeedbackValidation =
  | { valid: true; data: PeerFeedbackInput }
  | { valid: false; errors: readonly string[] };

// Reuse the same private-data guards the product feedback form uses, so a note
// can never smuggle precise coordinates, map pins, or credentials into storage.
const CREDENTIAL_PATTERN = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:password|passcode|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization)\s*[:=]\s*\S+)/i;
const COORDINATE_PATTERN = /(?:^|[^\d])[-+]?\d{1,2}\.\d{4,}\s*[,;]\s*[-+]?\d{1,3}\.\d{4,}(?:$|[^\d])/;
const MAP_PIN_PATTERN = /(?:google\.[^\s/]+\/maps|maps\.apple\.com|openstreetmap\.org).*(?:[?/#]|%2C)/i;

function containsRestrictedPrivateData(value: string): boolean {
  return CREDENTIAL_PATTERN.test(value) || COORDINATE_PATTERN.test(value) || MAP_PIN_PATTERN.test(value);
}

function readAnswer(value: unknown): PeerFeedbackAnswer | null {
  return PEER_FEEDBACK_ANSWERS.includes(value as PeerFeedbackAnswer) ? (value as PeerFeedbackAnswer) : null;
}

export function validatePeerFeedback(raw: unknown): PeerFeedbackValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Peer feedback is required."] };
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  const showedUp = readAnswer(input.showedUp);
  const feltRespected = readAnswer(input.feltRespected);
  const feltSafe = readAnswer(input.feltSafe);
  if (!showedUp) errors.push("Choose whether they showed up.");
  if (!feltRespected) errors.push("Choose whether you felt respected.");
  if (!feltSafe) errors.push("Choose whether you felt safe.");

  let note: string | null = null;
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== "string") errors.push("A private note must be text.");
    else {
      const trimmed = input.note.trim();
      note = trimmed.length > 0 ? trimmed : null;
      if (note && note.length > PEER_FEEDBACK_NOTE_MAX_LENGTH) {
        errors.push(`Keep the private note under ${PEER_FEEDBACK_NOTE_MAX_LENGTH} characters.`);
      }
      if (note && containsRestrictedPrivateData(note)) {
        errors.push("Remove credentials, precise coordinates, or map pins from your note.");
      }
    }
  }

  // Guard the safe-minimum contract: no numeric / star / rating / attractiveness
  // dimension may be smuggled in. If any known-forbidden key is present we reject
  // rather than silently ignore it, so a regression that starts sending one fails
  // loudly instead of quietly persisting a score.
  const forbiddenKeys = ["rating", "stars", "score", "attractiveness", "desirability", "hotness", "wouldDateAgain", "popularity"];
  if (forbiddenKeys.some((key) => key in input)) {
    errors.push("Peer feedback does not accept ratings or scores.");
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data: { showedUp: showedUp!, feltRespected: feltRespected!, feltSafe: feltSafe!, note } };
}

// A "no" on the safety confirmation is not a rating — it is a signal that the
// member should be offered the real safety path (report/block). The signal itself
// never substitutes for a report; this predicate only drives the UI nudge and an
// internal flag.
export function peerFeedbackFlagsSafetyConcern(input: Pick<PeerFeedbackInput, "feltSafe" | "feltRespected">): boolean {
  return input.feltSafe === "no" || input.feltRespected === "no";
}
