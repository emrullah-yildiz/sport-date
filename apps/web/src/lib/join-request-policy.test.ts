import { describe, expect, it } from "vitest";

import { declinedJoinRequestMessage, hostSkipButtonLabel, summarizeHostDecision } from "./join-request-policy";

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
});
