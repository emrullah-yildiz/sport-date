// Post-attendance peer signal.
//
// This is a private, mutual, reliability & respect confirmation one member leaves
// about another member they ACTUALLY attended the same event with, PLUS a single
// 1-5 star rating anchored to the MEETUP EXPERIENCE — reliability, respect, and how
// the shared activity went. The star is explicitly NOT an attractiveness /
// desirability / looks / "would date again" score. That one experience-anchored
// star field is the ONLY numeric dimension this feature accepts; any other rating
// key (attractiveness, popularity, "hotness", …) is still rejected loudly.
//
// The owner decided (CX-20260701-owner-decision-peer-rating-visibility-and-dimensions)
// to make the star recipient-visible as an AGGREGATE AVERAGE only, once there are
// ≥3 ratings, behind a DOUBLE-BLIND reveal — never showing who gave which rating,
// never exposing an individual received star, and never surfacing anything to other
// members or on public profiles. Those visibility rules are enforced server-side in
// lib/peer-feedback.ts; the ≥3 threshold and aggregate maths are the pure helpers
// at the bottom of this file.

// Fixed confirmation questions. Each is answerable yes / no / prefer_not_to_say.
// The keys are the only dimensions that exist; adding an attractiveness/rating
// dimension here would be a design violation (guarded by a test).
export const PEER_FEEDBACK_CONFIRMATIONS = ["showed_up", "felt_respected", "felt_safe"] as const;
export type PeerFeedbackConfirmation = (typeof PEER_FEEDBACK_CONFIRMATIONS)[number];

export const PEER_FEEDBACK_ANSWERS = ["yes", "no", "prefer_not_to_say"] as const;
export type PeerFeedbackAnswer = (typeof PEER_FEEDBACK_ANSWERS)[number];

export const PEER_FEEDBACK_NOTE_MAX_LENGTH = 1000 as const;

// The single accepted numeric dimension: a 1-5 star OVERALL rating of the MEETUP
// EXPERIENCE (reliability / respect / how the shared activity went). Optional — a
// member can leave the reliability/respect confirmations without a star. It is NOT
// attractiveness/desirability; the copy and the key name make that explicit.
export const PEER_FEEDBACK_STARS_MIN = 1 as const;
export const PEER_FEEDBACK_STARS_MAX = 5 as const;
// The recipient only ever sees an aggregate; below this many ratings we show a calm
// "not enough ratings yet" state so a single revenge rating can never define — or
// out — anyone.
export const PEER_FEEDBACK_AGGREGATE_MIN_COUNT = 3 as const;

export function isValidExperienceStars(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= PEER_FEEDBACK_STARS_MIN &&
    value <= PEER_FEEDBACK_STARS_MAX
  );
}

export type PeerFeedbackInput = Readonly<{
  showedUp: PeerFeedbackAnswer;
  feltRespected: PeerFeedbackAnswer;
  feltSafe: PeerFeedbackAnswer;
  // Optional private note to trust & safety. Never shown to the recipient.
  note: string | null;
  // Optional 1-5 star rating of the meetup experience. `null` means "no star given".
  experienceStars: number | null;
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

// A submission is only meaningful if the member actually said something: at least
// one confirmation is a substantive yes/no, or a private note was left. Three
// `prefer_not_to_say` answers with no note express nothing — persisting that would
// silently occupy the one-per-pair slot and lock, degrading the honest trust
// signal. This is the content-floor for the private word.
export function peerFeedbackHasSubstance(
  input: Pick<PeerFeedbackInput, "showedUp" | "feltRespected" | "feltSafe" | "note"> &
    Partial<Pick<PeerFeedbackInput, "experienceStars">>,
): boolean {
  const answered = input.showedUp !== "prefer_not_to_say" || input.feltRespected !== "prefer_not_to_say" || input.feltSafe !== "prefer_not_to_say";
  const hasNote = typeof input.note === "string" && input.note.trim().length > 0;
  const hasStar = isValidExperienceStars(input.experienceStars);
  return answered || hasNote || hasStar;
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

  // The ONE accepted numeric dimension: an optional 1-5 star rating of the meetup
  // EXPERIENCE. `null`/absent means no star. Anything outside the 1-5 integer range
  // is rejected rather than clamped, so a malformed client fails loudly.
  let experienceStars: number | null = null;
  if (input.experienceStars !== undefined && input.experienceStars !== null) {
    if (!isValidExperienceStars(input.experienceStars)) {
      errors.push(`The experience rating must be a whole number of stars from ${PEER_FEEDBACK_STARS_MIN} to ${PEER_FEEDBACK_STARS_MAX}.`);
    } else {
      experienceStars = input.experienceStars;
    }
  }

  // Guard the design contract: the ONLY numeric dimension that exists is
  // `experienceStars` — an experience-anchored star. Any OTHER rating-shaped key
  // (an attractiveness/desirability/popularity score, or a generic `rating`/`stars`
  // that could be repurposed into one) is still rejected loudly, so a regression
  // that starts sending one fails instead of quietly persisting a score. This is
  // what keeps the feature an experience signal and not a "hot-or-not".
  const forbiddenKeys = ["rating", "stars", "score", "attractiveness", "desirability", "hotness", "wouldDateAgain", "popularity"];
  if (forbiddenKeys.some((key) => key in input)) {
    errors.push("Peer feedback only accepts a 1-5 meetup-experience star — not an attractiveness, desirability, or popularity score.");
  }

  // Reject a content-free signal: three `prefer_not_to_say` answers and no note say
  // nothing, yet would occupy the one-per-pair slot and lock after the edit window.
  // We reject rather than silently persist so an accidental idle submit can't file a
  // misleading empty note about a real person. Only checked once the answers parse.
  if (showedUp && feltRespected && feltSafe && !peerFeedbackHasSubstance({ showedUp, feltRespected, feltSafe, note, experienceStars })) {
    errors.push("Answer at least one question, leave a star, or leave a private note — an empty note is not recorded.");
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data: { showedUp: showedUp!, feltRespected: feltRespected!, feltSafe: feltSafe!, note, experienceStars } };
}

// A "no" on the safety confirmation is not a rating — it is a signal that the
// member should be offered the real safety path (report/block). The signal itself
// never substitutes for a report; this predicate only drives the UI nudge and an
// internal flag.
export function peerFeedbackFlagsSafetyConcern(input: Pick<PeerFeedbackInput, "feltSafe" | "feltRespected">): boolean {
  return input.feltSafe === "no" || input.feltRespected === "no";
}

// What the recipient is allowed to see about the stars they have RECEIVED. Two
// shapes only, both privacy-preserving:
//  - `not_enough`: below the ≥3 threshold — a calm state that never leaks a partial
//    number that could out a single rater.
//  - `available`: an aggregate average across ≥3 events, rounded to one decimal.
// It NEVER carries an individual rating, who gave it, or (below the threshold) even
// a count. This is the only recipient-facing shape; other members never receive it.
export type PeerRatingAggregate =
  | { state: "not_enough"; ratingCount: number }
  | { state: "available"; average: number; ratingCount: number };

// Build the recipient's aggregate from the set of received stars that are ALREADY
// eligible to be revealed (the caller applies the double-blind reveal gate before
// calling this — see lib/peer-feedback.ts). Enforces the ≥3 threshold and rounds to
// one decimal. Any value outside 1-5 is ignored defensively so a corrupt row can
// never skew or break the average.
export function summarizeReceivedRatings(revealedStars: readonly number[]): PeerRatingAggregate {
  const clean = revealedStars.filter((value) => isValidExperienceStars(value));
  if (clean.length < PEER_FEEDBACK_AGGREGATE_MIN_COUNT) {
    return { state: "not_enough", ratingCount: clean.length };
  }
  const sum = clean.reduce((total, value) => total + value, 0);
  const average = Math.round((sum / clean.length) * 10) / 10;
  return { state: "available", average, ratingCount: clean.length };
}
