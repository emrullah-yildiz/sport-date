import { describe, expect, it } from "vitest";

import {
  isValidExperienceStars,
  PEER_FEEDBACK_AGGREGATE_MIN_COUNT,
  PEER_FEEDBACK_ANSWERS,
  PEER_FEEDBACK_CONFIRMATIONS,
  peerFeedbackFlagsSafetyConcern,
  peerFeedbackHasSubstance,
  summarizeReceivedRatings,
  validatePeerFeedback,
} from "./peer-feedback";

const VALID = { showedUp: "yes", feltRespected: "yes", feltSafe: "yes" } as const;

describe("peer feedback dimensions", () => {
  it("captures exactly the three reliability & respect confirmations and nothing else", () => {
    // The confirmation set is pinned; a new confirmation dimension changes this and
    // fails loudly. The one numeric dimension (experienceStars) is separate.
    expect([...PEER_FEEDBACK_CONFIRMATIONS]).toEqual(["showed_up", "felt_respected", "felt_safe"]);
  });

  it("offers only yes / no / prefer_not_to_say answers for the confirmations", () => {
    expect([...PEER_FEEDBACK_ANSWERS]).toEqual(["yes", "no", "prefer_not_to_say"]);
    for (const answer of PEER_FEEDBACK_ANSWERS) expect(Number.isNaN(Number(answer))).toBe(true);
  });

  it("still rejects any attractiveness / desirability / popularity dimension smuggled in", () => {
    // The ONLY accepted numeric dimension is `experienceStars`. Every other rating
    // key — including a bare `rating`/`stars`/`score` that could be repurposed into
    // an attractiveness score — is still rejected loudly.
    for (const forbidden of ["rating", "stars", "score", "attractiveness", "desirability", "hotness", "wouldDateAgain", "popularity"]) {
      const result = validatePeerFeedback({ ...VALID, [forbidden]: 5 });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.join(" ")).toMatch(/attractiveness|desirability|popularity/i);
    }
  });
});

describe("experience star rating (the one accepted numeric dimension)", () => {
  it("accepts an integer 1-5 star anchored to the meetup experience", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      const result = validatePeerFeedback({ ...VALID, experienceStars: value });
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.data.experienceStars).toBe(value);
    }
  });

  it("treats an omitted or null star as no star", () => {
    const omitted = validatePeerFeedback(VALID);
    expect(omitted.valid).toBe(true);
    if (omitted.valid) expect(omitted.data.experienceStars).toBeNull();
    const nulled = validatePeerFeedback({ ...VALID, experienceStars: null });
    expect(nulled.valid).toBe(true);
    if (nulled.valid) expect(nulled.data.experienceStars).toBeNull();
  });

  it("rejects a star outside 1-5, a non-integer, or a non-number", () => {
    for (const bad of [0, 6, -1, 2.5, "5", Number.NaN]) {
      const result = validatePeerFeedback({ ...VALID, experienceStars: bad });
      expect(result.valid).toBe(false);
    }
  });

  it("isValidExperienceStars guards the 1-5 integer range", () => {
    expect(isValidExperienceStars(1)).toBe(true);
    expect(isValidExperienceStars(5)).toBe(true);
    expect(isValidExperienceStars(0)).toBe(false);
    expect(isValidExperienceStars(6)).toBe(false);
    expect(isValidExperienceStars(3.5)).toBe(false);
    expect(isValidExperienceStars("3")).toBe(false);
    expect(isValidExperienceStars(null)).toBe(false);
  });

  it("counts a lone star as substance (a member can rate without answering the yes/no set)", () => {
    const onlyStar = { showedUp: "prefer_not_to_say", feltRespected: "prefer_not_to_say", feltSafe: "prefer_not_to_say", experienceStars: 4 } as const;
    const result = validatePeerFeedback(onlyStar);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.experienceStars).toBe(4);
  });
});

describe("summarizeReceivedRatings (recipient aggregate — ≥3 threshold, average only)", () => {
  it("returns a calm 'not enough' state below the threshold and never a partial average", () => {
    for (const count of [0, 1, PEER_FEEDBACK_AGGREGATE_MIN_COUNT - 1]) {
      const aggregate = summarizeReceivedRatings(Array.from({ length: count }, () => 5));
      expect(aggregate.state).toBe("not_enough");
      // No average field exists below threshold — a single rater can't be outed.
      expect("average" in aggregate).toBe(false);
    }
  });

  it("returns an aggregate average (rounded to one decimal) at exactly the threshold", () => {
    const aggregate = summarizeReceivedRatings([5, 4, 3]);
    expect(aggregate).toEqual({ state: "available", average: 4, ratingCount: 3 });
    const rounded = summarizeReceivedRatings([5, 4, 4]);
    expect(rounded).toEqual({ state: "available", average: 4.3, ratingCount: 3 });
  });

  it("ignores corrupt out-of-range values defensively so a bad row can't skew or break the average", () => {
    // Two valid + two junk => still below the threshold, not an average of junk.
    const aggregate = summarizeReceivedRatings([5, 4, 9, Number.NaN]);
    expect(aggregate.state).toBe("not_enough");
    expect(aggregate.ratingCount).toBe(2);
  });

  it("never exposes individual ratings or who gave them — only an average and a count", () => {
    const aggregate = summarizeReceivedRatings([2, 3, 4, 5]);
    expect(Object.keys(aggregate).sort()).toEqual(["average", "ratingCount", "state"]);
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
