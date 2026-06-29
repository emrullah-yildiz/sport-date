import { describe, expect, it } from "vitest";

import { priorityForSafetyCategory, validateSafetyAppeal, validateSafetyReport } from "./safety";

describe("safety reports", () => {
  it("prioritizes immediate physical and minor-safety risks", () => {
    expect(priorityForSafetyCategory("violence_threat")).toBe("critical");
    expect(priorityForSafetyCategory("suspected_underage")).toBe("critical");
    expect(priorityForSafetyCategory("harassment")).toBe("standard");
  });

  it("accepts a structured event report with optional blocking", () => {
    const result = validateSafetyReport({
      reportedUserId: "42", eventId: "2c3b5c84-6926-4ba6-b926-5ceaf9e01399",
      category: "stalking", details: "They followed me away from the event after I asked them to stop.", blockUser: true,
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.priority).toBe("critical");
  });

  it("rejects thin descriptions, invalid references, and block-without-person", () => {
    const result = validateSafetyReport({ eventId: "bad", category: "other", details: "Too short", blockUser: true });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toHaveLength(3);
  });
});

describe("safety appeals", () => {
  it("trims and accepts a sufficiently detailed appeal", () => {
    expect(validateSafetyAppeal({ reason: "  The decision missed the attached event context.  " })).toEqual({
      valid: true,
      reason: "The decision missed the attached event context.",
    });
  });

  it("rejects an appeal without enough context", () => {
    expect(validateSafetyAppeal({ reason: "Please reconsider." })).toEqual({
      valid: false,
      errors: ["Explain the appeal using 20 to 2000 characters."],
    });
  });
});
