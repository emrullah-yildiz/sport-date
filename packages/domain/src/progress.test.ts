import { describe, expect, it } from "vitest";

import { calculateMovementProgress, validateEventReflection } from "./progress";

describe("event reflection", () => {
  it("accepts a private attendance and willingness reflection", () => {
    expect(validateEventReflection({ attendance: "attended", wouldJoinAgain: "yes" })).toEqual({
      valid: true,
      data: { attendance: "attended", wouldJoinAgain: "yes" },
    });
  });

  it("rejects invented outcomes", () => {
    expect(validateEventReflection({ attendance: "mostly", wouldJoinAgain: "maybe" })).toEqual({
      valid: false,
      errors: ["Choose what happened with your attendance.", "Choose whether you would join this group again."],
    });
  });
});

describe("movement progression", () => {
  it("starts at warm-up and advances only from attended moves", () => {
    expect(calculateMovementProgress(0)).toMatchObject({ currentStage: { slug: "warm_up" }, movesToNextStage: 1, stageProgressPercent: 0 });
    expect(calculateMovementProgress(3)).toMatchObject({ currentStage: { slug: "finding_rhythm" }, movesToNextStage: 3, stageProgressPercent: 0 });
    expect(calculateMovementProgress(5)).toMatchObject({ currentStage: { slug: "finding_rhythm" }, movesToNextStage: 1, stageProgressPercent: 67 });
  });

  it("caps the path without manufacturing an endless points loop", () => {
    expect(calculateMovementProgress(10)).toMatchObject({ currentStage: { slug: "local_pulse" }, nextStage: null, movesToNextStage: 0, stageProgressPercent: 100 });
    expect(calculateMovementProgress(Number.NaN).attendedMoves).toBe(0);
  });
});
