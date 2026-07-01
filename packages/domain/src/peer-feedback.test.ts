import { describe, expect, it } from "vitest";

import {
  PEER_FEEDBACK_ANSWERS,
  PEER_FEEDBACK_CONFIRMATIONS,
  peerFeedbackFlagsSafetyConcern,
  peerFeedbackHasSubstance,
  validatePeerFeedback,
} from "./peer-feedback";

const VALID = { showedUp: "yes", feltRespected: "yes", feltSafe: "yes" } as const;

describe("peer feedback dimensions (safe minimum)", () => {
  it("captures exactly the three reliability & respect confirmations and nothing else", () => {
    // The whole safe-minimum contract lives here: if a rating dimension is ever
    // added, this pinned set changes and the test fails loudly.
    expect([...PEER_FEEDBACK_CONFIRMATIONS]).toEqual(["showed_up", "felt_respected", "felt_safe"]);
  });

  it("offers only yes / no / prefer_not_to_say answers (no numeric scale)", () => {
    expect([...PEER_FEEDBACK_ANSWERS]).toEqual(["yes", "no", "prefer_not_to_say"]);
    // Nothing in the answer set is numeric, so no star/score scale can slip in.
    for (const answer of PEER_FEEDBACK_ANSWERS) expect(Number.isNaN(Number(answer))).toBe(true);
  });

  it("rejects any attractiveness / rating / score dimension smuggled into the payload", () => {
    for (const forbidden of ["rating", "stars", "score", "attractiveness", "desirability", "hotness", "wouldDateAgain", "popularity"]) {
      const result = validatePeerFeedback({ ...VALID, [forbidden]: 5 });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.join(" ")).toMatch(/ratings or scores/i);
    }
  });
});

describe("peer feedback validation", () => {
  it("accepts a complete set of confirmations with no note", () => {
    const result = validatePeerFeedback(VALID);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.note).toBeNull();
  });

  it("accepts an optional private note and trims it", () => {
    const result = validatePeerFeedback({ ...VALID, note: "  friendly and on time  " });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.note).toBe("friendly and on time");
  });

  it("treats an empty / whitespace note as no note", () => {
    const result = validatePeerFeedback({ ...VALID, note: "   " });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.note).toBeNull();
  });

  it("requires every confirmation", () => {
    expect(validatePeerFeedback({ showedUp: "yes" }).valid).toBe(false);
    expect(validatePeerFeedback({}).valid).toBe(false);
    expect(validatePeerFeedback(null).valid).toBe(false);
  });

  it("rejects an invalid answer value", () => {
    expect(validatePeerFeedback({ ...VALID, feltSafe: "5" }).valid).toBe(false);
    expect(validatePeerFeedback({ ...VALID, feltSafe: "maybe" }).valid).toBe(false);
  });

  it("rejects a note over the length limit", () => {
    expect(validatePeerFeedback({ ...VALID, note: "x".repeat(1001) }).valid).toBe(false);
  });

  it("rejects a note that leaks precise coordinates or credentials", () => {
    expect(validatePeerFeedback({ ...VALID, note: "meet at 44.4361,26.1027" }).valid).toBe(false);
    expect(validatePeerFeedback({ ...VALID, note: "password: hunter2" }).valid).toBe(false);
  });

  it("rejects a content-free all-prefer_not_to_say submission with no note", () => {
    // An idle expand + click would otherwise file an empty row that then occupies the
    // one-per-pair slot and locks. The validation layer must not accept it.
    const empty = { showedUp: "prefer_not_to_say", feltRespected: "prefer_not_to_say", feltSafe: "prefer_not_to_say" } as const;
    const result = validatePeerFeedback(empty);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(" ")).toMatch(/at least one question|private note/i);
    // Same, with a whitespace-only note (which normalizes to no note).
    expect(validatePeerFeedback({ ...empty, note: "   " }).valid).toBe(false);
  });

  it("accepts a prefer_not_to_say set once any one answer is substantive or a note is left", () => {
    const empty = { showedUp: "prefer_not_to_say", feltRespected: "prefer_not_to_say", feltSafe: "prefer_not_to_say" } as const;
    expect(validatePeerFeedback({ ...empty, feltSafe: "yes" }).valid).toBe(true);
    expect(validatePeerFeedback({ ...empty, feltRespected: "no" }).valid).toBe(true);
    expect(validatePeerFeedback({ ...empty, note: "quiet but kind" }).valid).toBe(true);
  });
});

describe("peerFeedbackHasSubstance (content floor)", () => {
  const EMPTY = { showedUp: "prefer_not_to_say", feltRespected: "prefer_not_to_say", feltSafe: "prefer_not_to_say", note: null } as const;

  it("is false when nothing was said (all prefer_not_to_say, no note)", () => {
    expect(peerFeedbackHasSubstance(EMPTY)).toBe(false);
    expect(peerFeedbackHasSubstance({ ...EMPTY, note: "   " })).toBe(false);
  });

  it("is true when any confirmation is a substantive yes/no", () => {
    expect(peerFeedbackHasSubstance({ ...EMPTY, showedUp: "yes" })).toBe(true);
    expect(peerFeedbackHasSubstance({ ...EMPTY, feltSafe: "no" })).toBe(true);
  });

  it("is true when only a private note is left", () => {
    expect(peerFeedbackHasSubstance({ ...EMPTY, note: "something felt off" })).toBe(true);
  });
});

describe("peer feedback safety routing", () => {
  it("flags a concern when the giver did not feel safe or respected", () => {
    expect(peerFeedbackFlagsSafetyConcern({ feltSafe: "no", feltRespected: "yes" })).toBe(true);
    expect(peerFeedbackFlagsSafetyConcern({ feltSafe: "yes", feltRespected: "no" })).toBe(true);
  });

  it("does not flag a concern for positive or neutral answers", () => {
    expect(peerFeedbackFlagsSafetyConcern({ feltSafe: "yes", feltRespected: "yes" })).toBe(false);
    expect(peerFeedbackFlagsSafetyConcern({ feltSafe: "prefer_not_to_say", feltRespected: "prefer_not_to_say" })).toBe(false);
  });
});
