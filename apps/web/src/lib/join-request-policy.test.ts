import { describe, expect, it } from "vitest";

import { declinedJoinRequestMessage, hostSkipButtonLabel, summarizeHostDecision, summarizeHostRequestQueue } from "./join-request-policy";

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
