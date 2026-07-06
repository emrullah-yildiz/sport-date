// The self-hosted market-research survey: question definitions + server-side
// answer sanitizers (CX-20260704-research-self-hosted-market-survey).
//
// The wording below is taken VERBATIM from
// `docs/marketing/member-survey-and-forum-kit.md` Part A (Survey 1: Q1–Q6 + Q8;
// Survey 2 extension: Q10–Q15). The questions were deliberately written to be
// non-leading and answer-neutral — measuring how people behave TODAY, not
// whether they like our idea — so DO NOT rewrite them here; a test tripwire
// asserts this file's texts still appear verbatim in the kit. Q7 (the optional
// research-conversation contact) is intentionally NOT part of the answer set:
// it is collected on a separate final screen, with its own consent checkbox,
// and stored in a separate, unlinked table.
//
// Sanitizers are the privacy/abuse boundary for the anonymous write path: they
// copy an explicit allowlist of question keys, accept only the exact published
// options for choice questions, clamp all free text, and drop everything else —
// so the stored JSONB can only ever contain expected shapes. Every question is
// skippable: an empty (even fully empty) answer set is valid.
//
// Kept free of `server-only` / DB / React imports so the whole boundary is
// unit-testable in the node test environment.

/** Shown before the questions — verbatim from the kit ("Intro (show before questions)"). */
// CX-20260706-research-page-denies-product-exists: the intro used to say "there
// is no service to join yet", which was true when the survey shipped and is now
// false (KeepItUp is in open beta). The survey stays methodologically honest —
// answering is not a sign-up, everything is skippable and anonymous — without
// denying the product exists.
export const RESEARCH_SURVEY_INTRO = [
  "This is a short, anonymous research survey about how adults currently find people to be active with.",
  "It is separate from the KeepItUp open beta — answering is not a sign-up. Skip any question. We publish",
  "no answer or identity without separate permission.",
].join(" ");

export const RESEARCH_SURVEY_ID = "meeting-through-activity-v1" as const;

export type ResearchQuestion = Readonly<{
  /** Stable storage key, e.g. "q1". */
  id: string;
  /** The verbatim question text from the kit. */
  text: string;
  kind: "single" | "multi" | "text" | "rate";
  /** Exact options for single/multi; factors for rate (each rated 1–5). */
  options?: readonly string[];
  /** Optional companion free-text key (e.g. Q2's "Other"). */
  otherKey?: string;
  optional?: boolean;
}>;

// ── Survey 1 — "How adults meet through activity today" (Q1–Q6, Q8) ──────────

export const SURVEY_ONE_QUESTIONS: readonly ResearchQuestion[] = [
  {
    id: "q1",
    text: "In the last 3 months, how often did you do a social/physical activity (run, gym class, padel, climbing, team sport, walk-and-talk, etc.) with other people?",
    kind: "single",
    options: ["A few times a week", "About weekly", "A few times a month", "Rarely", "Not at all"],
  },
  {
    id: "q2",
    text: "When you wanted a partner or group for an activity and didn't have one, what did you usually do? (select all)",
    kind: "multi",
    options: [
      "Went alone",
      "Skipped it",
      "Asked existing friends",
      "Used a group chat or club",
      "Used an app or website",
      "Posted in an online community",
      "Other",
      "Prefer not to say",
    ],
    otherKey: "q2_other",
  },
  {
    id: "q3",
    text: "If you have used an app, website, or community to find activity partners, which one(s)?",
    kind: "text",
    optional: true,
  },
  {
    id: "q4",
    text: "What, if anything, makes it hard to find good people to be active with?",
    kind: "text",
    optional: true,
  },
  {
    id: "q5",
    text: "When meeting someone new for an activity, how much do safety considerations affect whether/how you do it?",
    kind: "single",
    options: ["A lot", "Somewhat", "A little", "Not at all", "Prefer not to say"],
  },
  {
    id: "q6",
    text: "What would make meeting a new activity partner feel safer to you?",
    kind: "text",
    optional: true,
  },
  {
    id: "q8_age",
    text: "Age band",
    kind: "single",
    options: ["under 25", "25-29", "30-34", "35-39", "40+", "prefer not to say"],
    optional: true,
  },
  {
    id: "q8_area",
    text: "City or broad area (not an address)",
    kind: "text",
    optional: true,
  },
] as const;

// ── Survey 2 extension — discovery + willingness-to-pay (Q10–Q15) ────────────

/** The seven "know before you commit" factors of Q11, each rated 1–5. */
export const Q11_FACTORS = [
  "skill/level match",
  "time",
  "general area",
  "price",
  "who else is coming",
  "the host",
  "safety information",
] as const;

export const SURVEY_TWO_QUESTIONS: readonly ResearchQuestion[] = [
  {
    id: "q10",
    text: "Which intentions do you associate with meeting new people through activity? (select all — none is \"lesser\")",
    kind: "multi",
    options: [
      "making friends",
      "finding a regular training partner",
      "joining a community",
      "dating",
      "just doing the activity",
      "other",
    ],
    otherKey: "q10_other",
  },
  {
    id: "q11",
    text: "When considering an activity with new people, how important is knowing each of these before you commit? (rank or rate each 1-5)",
    kind: "rate",
    options: Q11_FACTORS,
  },
  {
    id: "q12",
    text: "How do you feel about paying for a service that helps you find and safely coordinate activities with compatible new people?",
    kind: "single",
    options: [
      "I'd never pay",
      "I'd pay only if it saved real effort",
      "I'd pay for convenience features",
      "I'd pay a regular subscription",
      "Depends",
    ],
    otherKey: "q12_depends",
  },
  {
    id: "q13",
    text: "Without anchoring to any specific product, what monthly amount would feel fair for such a service?",
    kind: "single",
    options: ["under €5", "€5-9", "€10-15", "€15-25", "over €25", "would not pay"],
    optional: true,
  },
  {
    id: "q14",
    text: "What would make you distrust or avoid a service like this?",
    kind: "text",
  },
  {
    id: "q15",
    text: "Anything about safety, privacy, or how such a service should behave that we should understand?",
    kind: "text",
    optional: true,
  },
] as const;

/** Free text is clamped hard: long enough for a real answer, useless for abuse. */
export const RESEARCH_FREE_TEXT_MAX = 600;

export type ResearchAnswers = Readonly<Record<string, string | readonly string[] | Readonly<Record<string, number>>>>;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, RESEARCH_FREE_TEXT_MAX).trim();
  return text ? text : null;
}

function cleanSingle(value: unknown, options: readonly string[]): string | null {
  return typeof value === "string" && options.includes(value) ? value : null;
}

function cleanMulti(value: unknown, options: readonly string[]): string[] | null {
  if (!Array.isArray(value)) return null;
  const picked = [...new Set(value.filter((entry): entry is string => typeof entry === "string" && options.includes(entry)))];
  return picked.length > 0 ? picked : null;
}

function cleanRatings(value: unknown, factors: readonly string[]): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const ratings: Record<string, number> = {};
  for (const factor of factors) {
    const raw = (value as Record<string, unknown>)[factor];
    const rating = typeof raw === "number" ? Math.trunc(raw) : NaN;
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) ratings[factor] = rating;
  }
  return Object.keys(ratings).length > 0 ? ratings : null;
}

function sanitizeAgainst(questions: readonly ResearchQuestion[], input: unknown): ResearchAnswers | null {
  // Anything but a plain object is a malformed submission, not "all skipped".
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const clean: Record<string, string | string[] | Record<string, number>> = {};

  for (const question of questions) {
    const value = raw[question.id];
    if (value === undefined || value === null) continue; // skipped — always fine
    if (question.kind === "single" && question.options) {
      const picked = cleanSingle(value, question.options);
      if (picked) clean[question.id] = picked;
    } else if (question.kind === "multi" && question.options) {
      const picked = cleanMulti(value, question.options);
      if (picked) clean[question.id] = picked;
    } else if (question.kind === "text") {
      const text = cleanText(value);
      if (text) clean[question.id] = text;
    } else if (question.kind === "rate" && question.options) {
      const ratings = cleanRatings(value, question.options);
      if (ratings) clean[question.id] = ratings;
    }
    // Companion free text ("Other" / "Depends") — clamped like any free text.
    if (question.otherKey) {
      const other = cleanText(raw[question.otherKey]);
      if (other) clean[question.otherKey] = other;
    }
  }

  return clean;
}

/**
 * Sanitize a Survey 1 (Q1–Q6, Q8) submission. Unknown keys are dropped, choice
 * answers must match the published options exactly, free text is clamped. An
 * empty result is VALID (every question is skippable); null means the payload
 * was not even an object.
 */
export function sanitizeSurveyOneAnswers(input: unknown): ResearchAnswers | null {
  return sanitizeAgainst(SURVEY_ONE_QUESTIONS, input);
}

/** Sanitize the optional Survey 2 extension (Q10–Q15). Same contract as above. */
export function sanitizeSurveyTwoAnswers(input: unknown): ResearchAnswers | null {
  return sanitizeAgainst(SURVEY_TWO_QUESTIONS, input);
}

/**
 * Sanitize the OPTIONAL research-conversation contact (Q7). A short free-text
 * handle (email or other), 3–200 chars. Consent is enforced separately by the
 * API — this only shapes the string.
 */
export function sanitizeResearchContact(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const contact = input.trim().slice(0, 200).trim();
  return contact.length >= 3 ? contact : null;
}
