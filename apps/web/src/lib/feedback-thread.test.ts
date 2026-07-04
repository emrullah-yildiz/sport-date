import { describe, expect, it, vi } from "vitest";

import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  MEMBER_FEEDBACK_STATUSES,
  MEMBER_FEEDBACK_STATUS_INFO,
  buildFeedbackUpdateEmail,
  dispatchFeedbackNotification,
  isMemberFeedbackStatus,
  normalizeMemberFeedbackStatus,
  resolveFeedbackEmailProvider,
  validateFeedbackComment,
} from "./feedback-thread";

describe("member feedback status lifecycle", () => {
  it("exposes the honest lifecycle with a plain meaning for every status", () => {
    expect(MEMBER_FEEDBACK_STATUSES).toEqual([
      "received", "in_review", "planned", "in_progress", "resolved", "closed_not_planned",
    ]);
    for (const status of MEMBER_FEEDBACK_STATUSES) {
      expect(MEMBER_FEEDBACK_STATUS_INFO[status].label.length).toBeGreaterThan(0);
      expect(MEMBER_FEEDBACK_STATUS_INFO[status].meaning.length).toBeGreaterThan(0);
    }
    // No fake "resolved": the not-planned path is a distinct, honest close.
    expect(MEMBER_FEEDBACK_STATUS_INFO.closed_not_planned.label).toContain("not planned");
  });

  it("normalises legacy 012 statuses to the member lifecycle", () => {
    expect(normalizeMemberFeedbackStatus("open")).toBe("received");
    expect(normalizeMemberFeedbackStatus("closed")).toBe("closed_not_planned");
    expect(normalizeMemberFeedbackStatus("in_progress")).toBe("in_progress");
    expect(normalizeMemberFeedbackStatus("resolved")).toBe("resolved");
    expect(normalizeMemberFeedbackStatus("garbage")).toBe("received");
    expect(normalizeMemberFeedbackStatus(undefined)).toBe("received");
  });

  it("guards the status type", () => {
    expect(isMemberFeedbackStatus("planned")).toBe(true);
    expect(isMemberFeedbackStatus("open")).toBe(false); // legacy value is not a canonical member status
    expect(isMemberFeedbackStatus(5)).toBe(false);
  });
});

describe("validateFeedbackComment", () => {
  it("accepts and trims a real reply", () => {
    expect(validateFeedbackComment({ body: "  Thanks for the update!  " })).toEqual({ valid: true, body: "Thanks for the update!" });
    expect(validateFeedbackComment("Bare string reply")).toEqual({ valid: true, body: "Bare string reply" });
  });

  it("rejects empty, whitespace-only, or over-length replies", () => {
    expect(validateFeedbackComment({ body: "" }).valid).toBe(false);
    expect(validateFeedbackComment({ body: "   " }).valid).toBe(false);
    expect(validateFeedbackComment(null).valid).toBe(false);
    expect(validateFeedbackComment({ body: "x".repeat(FEEDBACK_COMMENT_MAX_LENGTH + 1) }).valid).toBe(false);
  });
});

describe("feedback-update email is DARK by default", () => {
  it("is disabled unless delivery is explicitly enabled AND a provider is chosen", () => {
    expect(resolveFeedbackEmailProvider({})).toBe("disabled");
    expect(resolveFeedbackEmailProvider({ EMAIL_DELIVERY_ENABLED: "true" })).toBe("disabled");
    expect(resolveFeedbackEmailProvider({ EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "console" })).toBe("console");
  });

  it("builds an absolute tracking link and NEVER invokes the real sender while off", async () => {
    const draft = buildFeedbackUpdateEmail({
      origin: "https://keepitup.social",
      ticketId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      to: "ana@example.com",
      firstName: "Ana",
      summary: "The map felt cramped",
      statusLabel: "In review",
    });
    expect(draft.trackUrl).toBe("https://keepitup.social/feedback/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(draft.text).toContain("In review");

    const send = vi.fn();
    const result = await dispatchFeedbackNotification(draft, { env: {}, send });
    expect(result).toEqual({ state: "disabled", provider: "disabled" });
    expect(send).not.toHaveBeenCalled();
  });
});
