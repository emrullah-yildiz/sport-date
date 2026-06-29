import { describe, expect, it } from "vitest";

import { validateFeedbackTicket } from "./feedback";

const validTicket = {
  category: "missing_feature",
  surface: "mobile",
  summary: "I cannot change the event language",
  details: "While hosting an event, I could not find a way to change its language.",
  currentPath: "Create event / Language",
  expectedOutcome: "I expected to select another supported language.",
  actualOutcome: "The language stayed on the original choice.",
  severity: "medium",
};

describe("customer feedback tickets", () => {
  it("normalizes a useful customer experience report", () => {
    expect(validateFeedbackTicket({ ...validTicket, summary: `  ${validTicket.summary}  ` })).toEqual({
      valid: true,
      data: validTicket,
    });
  });

  it("allows expected and actual outcomes to be omitted", () => {
    const result = validateFeedbackTicket({ ...validTicket, expectedOutcome: "", actualOutcome: undefined });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.expectedOutcome).toBeNull();
      expect(result.data.actualOutcome).toBeNull();
    }
  });

  it("rejects unsupported values and thin customer context", () => {
    const result = validateFeedbackTicket({
      ...validTicket, category: "security", surface: "watch", severity: "urgent",
      summary: "Broken", details: "It broke", currentPath: "",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toHaveLength(6);
  });

  it("rejects non-text optional outcomes instead of silently discarding them", () => {
    const result = validateFeedbackTicket({ ...validTicket, expectedOutcome: 42, actualOutcome: false });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toEqual(["Expected outcome must be text.", "Actual outcome must be text."]);
  });

  it("rejects credentials, precise coordinates, map pins, and URL parameters", () => {
    expect(validateFeedbackTicket({ ...validTicket, details: "The request failed with authorization: Bearer-secret-value" }).valid).toBe(false);
    expect(validateFeedbackTicket({ ...validTicket, actualOutcome: "The app showed 44.42680, 26.10250 as my position." }).valid).toBe(false);
    expect(validateFeedbackTicket({ ...validTicket, details: "The meeting pin is https://maps.apple.com/?ll=44.4268,26.1025" }).valid).toBe(false);
    expect(validateFeedbackTicket({ ...validTicket, currentPath: "/events/123?token=private" }).valid).toBe(false);
  });
});
