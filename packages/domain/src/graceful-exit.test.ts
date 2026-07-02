import { describe, expect, it } from "vitest";

import {
  DEFAULT_GRACEFUL_EXIT_REASON,
  GRACEFUL_EXIT_REASONS,
  MAX_GRACEFUL_EXIT_NOTE_LENGTH,
  exitReasonIsSafety,
  normalizeGracefulExit,
} from "./graceful-exit";

describe("graceful exit reasons", () => {
  it("keeps a valid reason and trimmed note", () => {
    expect(normalizeGracefulExit({ reason: "left_early", note: "  had to head off  " })).toEqual({
      reason: "left_early",
      note: "had to head off",
    });
  });

  it("defaults an unknown or missing reason to the non-punitive default", () => {
    expect(normalizeGracefulExit({ reason: "some_made_up_value" }).reason).toBe(DEFAULT_GRACEFUL_EXIT_REASON);
    expect(normalizeGracefulExit(null).reason).toBe(DEFAULT_GRACEFUL_EXIT_REASON);
    expect(normalizeGracefulExit(undefined).reason).toBe(DEFAULT_GRACEFUL_EXIT_REASON);
    expect(normalizeGracefulExit({}).reason).toBe(DEFAULT_GRACEFUL_EXIT_REASON);
  });

  it("never rejects — an over-long or non-string note is trimmed/dropped so leaving always succeeds", () => {
    const long = "x".repeat(MAX_GRACEFUL_EXIT_NOTE_LENGTH + 50);
    expect(normalizeGracefulExit({ reason: "cant_make_it", note: long }).note).toHaveLength(
      MAX_GRACEFUL_EXIT_NOTE_LENGTH,
    );
    expect(normalizeGracefulExit({ reason: "cant_make_it", note: 12345 as unknown }).note).toBe("");
  });

  it("treats prefer_not_to_say as a first-class, valid choice", () => {
    expect(normalizeGracefulExit({ reason: "prefer_not_to_say" }).reason).toBe("prefer_not_to_say");
  });

  it("flags only the safety reason for the report/block routing hint", () => {
    expect(exitReasonIsSafety("felt_unsafe")).toBe(true);
    for (const reason of GRACEFUL_EXIT_REASONS.filter((value) => value !== "felt_unsafe")) {
      expect(exitReasonIsSafety(reason)).toBe(false);
    }
  });
});
