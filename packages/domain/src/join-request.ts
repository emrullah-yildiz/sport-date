export const MAX_EVENT_REQUEST_SKIPS = 3 as const;

export type JoinRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type JoinRequest = Readonly<{
  id: string;
  eventId: string;
  requesterId: string;
  status: JoinRequestStatus;
  skipCount: number;
  decidedAt?: Date;
  decisionReason?: "accepted" | "maximum_skips_reached" | "requester_cancelled";
}>;

export class InvalidJoinRequestTransition extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidJoinRequestTransition";
  }
}

function requirePending(request: JoinRequest): void {
  if (request.status !== "pending") {
    throw new InvalidJoinRequestTransition(
      `Cannot decide a join request with status ${request.status}.`,
    );
  }
}

export function acceptJoinRequest(
  request: JoinRequest,
  decidedAt: Date,
): JoinRequest {
  requirePending(request);

  return {
    ...request,
    status: "accepted",
    decidedAt,
    decisionReason: "accepted",
  };
}

export function skipJoinRequest(
  request: JoinRequest,
  decidedAt: Date,
): JoinRequest {
  requirePending(request);

  const skipCount = request.skipCount + 1;

  if (skipCount >= MAX_EVENT_REQUEST_SKIPS) {
    return {
      ...request,
      skipCount: MAX_EVENT_REQUEST_SKIPS,
      status: "declined",
      decidedAt,
      decisionReason: "maximum_skips_reached",
    };
  }

  return { ...request, skipCount };
}

export function cancelJoinRequest(request: JoinRequest, decidedAt: Date): JoinRequest {
  if (request.status !== "pending" && request.status !== "accepted") {
    throw new InvalidJoinRequestTransition(`Cannot cancel a join request with status ${request.status}.`);
  }
  return { ...request, status: "cancelled", decidedAt, decisionReason: "requester_cancelled" };
}
