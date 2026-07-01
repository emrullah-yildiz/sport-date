import { describe, expect, it } from "vitest";

import { declinedJoinRequestMessage, hostSkipButtonLabel, joinRequestConfirmationMessage, summarizeHostDecision, summarizeHostRequestQueue } from "./join-request-policy";

describe("join request policy copy", () => {
  it("marks the third skip as a quiet decline", () => {
    expect(summarizeHostDecision("skip", { status: "declined", skipCount: 3 })).toEqual({
      status: "declined",
      skipCount: 3,
      message: "Third skip reached. The request is now quietly declined.",
    });
  });

  it("keeps early skips pending and warns about the limit", () => {
    expect(summarizeHostDecision("skip", { status: "pending", skipCount: 1 })).toEqual({
      status: "pending",
      skipCount: 1,
      message: "Request skipped. One more skip will quietly close it on the third pass.",
    });
  });

  it("explains host controls and requester decline states honestly", () => {
    expect(hostSkipButtonLabel(0)).toBe("Skip");
    expect(hostSkipButtonLabel(1)).toBe("Skip (1/3)");
    expect(hostSkipButtonLabel(2)).toBe("Skip and close (2/3)");
    expect(declinedJoinRequestMessage(3)).toContain("quietly closed");
  });

  it("announces each in-place commitment result calmly, with skip-count privacy preserved", () => {
    // These strings are read by the join control's polite aria-live region when a
    // commitment resolves without a full-document reload, so keyboard and
    // screen-reader members hear the result. Copy stays calm and honest: no
    // manufactured urgency or celebration, no exposure of private skip counts.
    expect(joinRequestConfirmationMessage("pending")).toBe("Request sent. Your request is now with the host.");
    expect(joinRequestConfirmationMessage("accepted")).toBe("You have a place. The exact meeting point is now shown below.");
    expect(joinRequestConfirmationMessage("cancelled")).toBe("Request cancelled. This invitation is closed for your account.");
    expect(joinRequestConfirmationMessage("declined")).toBe("This request is closed.");
    for (const status of ["pending", "accepted", "cancelled", "declined"] as const) {
      expect(joinRequestConfirmationMessage(status).toLowerCase()).not.toContain("skip");
    }
  });

  it("summarizes pending-first host request review", () => {
    expect(summarizeHostRequestQueue([
      { status: "pending", skipCount: 0 },
      { status: "pending", skipCount: 2 },
      { status: "accepted", skipCount: 0 },
      { status: "declined", skipCount: 3 },
    ])).toEqual({
      pendingCount: 2,
      acceptedCount: 1,
      closedCount: 1,
      finalSkipPendingCount: 1,
      pendingHeadline: "2 pending requests are ready for review.",
      pendingBody: "1 request is already on the final skip, so the next pass would close it quietly.",
    });
  });

  it("reports when no pending requests remain", () => {
    expect(summarizeHostRequestQueue([
      { status: "accepted", skipCount: 0 },
      { status: "declined", skipCount: 3 },
    ])).toEqual({
      pendingCount: 0,
      acceptedCount: 1,
      closedCount: 1,
      finalSkipPendingCount: 0,
      pendingHeadline: "No pending requests are waiting right now.",
      pendingBody: null,
    });
  });
});
