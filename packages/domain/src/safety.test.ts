import { describe, expect, it } from "vitest";

import { priorityForSafetyCategory, validateModerationCaseUpdate, validateSafetyAppeal, validateSafetyReport } from "./safety";

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

describe("moderation case updates", () => {
  it("accepts a reporter-safe final decision", () => {
    expect(validateModerationCaseUpdate({
      status: "actioned",
      decisionCode: "warning",
      decisionBasis: "Community Conduct Rule 2",
      decisionSummary: "We reviewed the report and issued a formal conduct warning.",
    }).valid).toBe(true);
  });

  it("rejects action details on a non-final state", () => {
    expect(validateModerationCaseUpdate({ status: "investigating", decisionCode: "warning", decisionBasis: "Community Conduct Rule 2", decisionSummary: "Not final yet but this is long enough." }).valid).toBe(false);
  });

  it("keeps dismissed and actioned decision codes consistent", () => {
    expect(validateModerationCaseUpdate({ status: "dismissed", decisionCode: "warning", decisionBasis: "Community Conduct Rule 2", decisionSummary: "This decision summary is sufficiently detailed." }).valid).toBe(false);
    expect(validateModerationCaseUpdate({ status: "actioned", decisionCode: "no_action", decisionBasis: "Community Conduct Rule 2", decisionSummary: "This decision summary is sufficiently detailed." }).valid).toBe(false);
  });
});
