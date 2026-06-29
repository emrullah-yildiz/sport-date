import { describe, expect, it } from "vitest";

import {
  acceptJoinRequest,
  cancelJoinRequest,
  InvalidJoinRequestTransition,
  MAX_EVENT_REQUEST_SKIPS,
  skipJoinRequest,
  type JoinRequest,
} from "./join-request";

const pendingRequest = (): JoinRequest => ({
  id: "request-1",
  eventId: "event-1",
  requesterId: "member-1",
  status: "pending",
  skipCount: 0,
});

describe("join request decisions", () => {
  it("accepts a pending request", () => {
    const decidedAt = new Date("2026-06-28T10:00:00.000Z");
    const result = acceptJoinRequest(pendingRequest(), decidedAt);

    expect(result).toMatchObject({
      status: "accepted",
      decisionReason: "accepted",
      decidedAt,
    });
  });

  it("keeps a request pending before the third skip", () => {
    const once = skipJoinRequest(pendingRequest(), new Date());
    const twice = skipJoinRequest(once, new Date());

    expect(twice.status).toBe("pending");
    expect(twice.skipCount).toBe(MAX_EVENT_REQUEST_SKIPS - 1);
  });

  it("declines a request at the maximum skip count", () => {
    const once = skipJoinRequest(pendingRequest(), new Date());
    const twice = skipJoinRequest(once, new Date());
    const final = skipJoinRequest(twice, new Date("2026-06-28T10:00:00.000Z"));

    expect(final).toMatchObject({
      status: "declined",
      skipCount: MAX_EVENT_REQUEST_SKIPS,
      decisionReason: "maximum_skips_reached",
    });
  });

  it("rejects a second decision", () => {
    const accepted = acceptJoinRequest(pendingRequest(), new Date());

    expect(() => skipJoinRequest(accepted, new Date())).toThrow(
      InvalidJoinRequestTransition,
    );
  });

  it("allows a requester to cancel pending or accepted participation", () => {
    expect(cancelJoinRequest(pendingRequest(), new Date()).status).toBe("cancelled");
    const accepted = acceptJoinRequest(pendingRequest(), new Date());
    expect(cancelJoinRequest(accepted, new Date()).decisionReason).toBe("requester_cancelled");
  });

  it("does not cancel an already declined request", () => {
    const declined = skipJoinRequest(skipJoinRequest(skipJoinRequest(pendingRequest(), new Date()), new Date()), new Date());
    expect(() => cancelJoinRequest(declined, new Date())).toThrow(InvalidJoinRequestTransition);
  });
});
