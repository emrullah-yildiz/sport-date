import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { qualifiesReflectionForProgress } from "./reflections";

describe("reflection progress qualification", () => {
  it("advances the Movement Arc only for attended reflections", () => {
    expect(qualifiesReflectionForProgress("attended")).toBe(true);
    expect(qualifiesReflectionForProgress("left_early")).toBe(false);
    expect(qualifiesReflectionForProgress("did_not_attend")).toBe(false);
  });

  // Regression tripwire for "never reward prohibited signals". This gate is the
  // one server-side predicate that decides whether a finished event yields a
  // Movement Arc move, so it is the realistic place a prohibited signal could
  // later be wired in. Pin it to exactly one qualifying outcome.
  it("qualifies exactly one attendance outcome and nothing else", () => {
    const outcomes: Array<Parameters<typeof qualifiesReflectionForProgress>[0]> = [
      "attended",
      "left_early",
      "did_not_attend",
    ];
    const qualifying = outcomes.filter((outcome) => qualifiesReflectionForProgress(outcome));
    expect(qualifying).toEqual(["attended"]);
  });

  it("never qualifies a non-attendance / engagement-shaped outcome if one is forced in", () => {
    // Defensive: even a value outside the typed union (a skip, a view, a streak
    // marker that a regression might pass) must not pass the attended gate.
    for (const forged of ["skipped", "rejected", "viewed", "streak", "time_spent", ""]) {
      expect(
        qualifiesReflectionForProgress(forged as Parameters<typeof qualifiesReflectionForProgress>[0]),
      ).toBe(false);
    }
  });
});
