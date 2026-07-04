import { describe, expect, it } from "vitest";

import { SAFETY_REPORT_CATEGORIES, priorityForSafetyCategory, validateEvidenceReference, validateModerationAppealUpdate, validateModerationCaseUpdate, validateSafetyAppeal, validateSafetyReport } from "./safety";
import { SEEKING_OPTIONS } from "./registration";

describe("safety reports", () => {
  it("prioritizes immediate physical and minor-safety risks", () => {
    expect(priorityForSafetyCategory("violence_threat")).toBe("critical");
    expect(priorityForSafetyCategory("suspected_underage")).toBe("critical");
    expect(priorityForSafetyCategory("harassment")).toBe("standard");
  });

  it("offers a 'sexual/inappropriate intent' report reason, routed as urgent (CX-20260704)", () => {
    expect(SAFETY_REPORT_CATEGORIES).toContain("sexual_intent");
    expect(priorityForSafetyCategory("sexual_intent")).toBe("urgent");
    // It is accepted as a valid category on an event report (routes to the queue).
    const result = validateSafetyReport({
      reportedUserId: null, eventId: "2c3b5c84-6926-4ba6-b926-5ceaf9e01399",
      category: "sexual_intent", details: "This event is clearly organised as a hookup, not a real activity.", blockUser: false,
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.priority).toBe("urgent");
  });

  it("has NO sexual/hookup intention option — dating means meeting a person, not sex", () => {
    expect(SEEKING_OPTIONS).toEqual(["dating", "friendship", "group"]);
    for (const option of SEEKING_OPTIONS as readonly string[]) {
      expect(option).not.toMatch(/sex|hookup|hook-up|casual|nsfw/i);
    }
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

describe("moderation appeal updates", () => {
  it("accepts review without a premature outcome", () => {
    expect(validateModerationAppealUpdate({ status: "reviewing" })).toEqual({ valid: true, status: "reviewing", outcomeSummary: null });
  });

  it("requires a reporter-safe final outcome", () => {
    expect(validateModerationAppealUpdate({ status: "reversed", outcomeSummary: "Too short" }).valid).toBe(false);
    expect(validateModerationAppealUpdate({
      status: "reversed",
      outcomeSummary: "A separate reviewer reconsidered the context and reversed the original decision.",
    }).valid).toBe(true);
  });
});

describe("moderation evidence references", () => {
  it("accepts an opaque locator with a review interval and purpose", () => {
    expect(validateEvidenceReference({
      sourceType: "system_record",
      sensitivity: "restricted",
      label: "Join request record captured at intake",
      referenceKey: "join_request:2c3b5c84-6926-4ba6-b926-5ceaf9e01399",
      preservationPurpose: "Preserve the event participation state while the safety report is reviewed.",
      reviewAfterDays: 90,
    }).valid).toBe(true);
  });

  it("rejects copied URLs, thin purposes, and arbitrary review periods", () => {
    const result = validateEvidenceReference({
      sourceType: "external_case",
      sensitivity: "restricted",
      label: "Support case",
      referenceKey: "https://support.example/case?id=secret",
      preservationPurpose: "Keep it.",
      reviewAfterDays: 365,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toHaveLength(3);
  });
});
