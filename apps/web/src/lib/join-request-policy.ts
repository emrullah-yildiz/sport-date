export type JoinRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type JoinRequestDecisionSummary = Readonly<{
  status: JoinRequestStatus;
  skipCount: number;
  message: string;
}>;

export type HostRequestQueueSummary = Readonly<{
  pendingCount: number;
  acceptedCount: number;
  closedCount: number;
  finalSkipPendingCount: number;
  pendingHeadline: string;
  pendingBody: string | null;
}>;

export function summarizeHostDecision(
  action: "accept" | "skip",
  decision: Readonly<{ status: JoinRequestStatus | string; skipCount: number }>,
): JoinRequestDecisionSummary {
  if (action === "accept") {
    return {
      status: "accepted",
      skipCount: decision.skipCount,
      message: "Request accepted. The member can now access the event room and exact meeting details.",
    };
  }

  if (decision.status === "declined" || decision.skipCount >= 3) {
    return {
      status: "declined",
      skipCount: Math.max(3, decision.skipCount),
      message: "Third skip reached. The request is now quietly declined.",
    };
  }

  return {
    status: "pending",
    skipCount: decision.skipCount,
    message: "Request skipped. One more skip will quietly close it on the third pass.",
  };
}

export function hostSkipButtonLabel(skipCount: number): string {
  if (skipCount >= 2) return `Skip and close (${skipCount}/3)`;
  if (skipCount > 0) return `Skip (${skipCount}/3)`;
  return "Skip";
}

// Short, calm confirmation a live region announces to keyboard / screen-reader
// members the moment a commitment resolves in place (no full-document reload).
// Success uses polite phrasing with no manufactured celebration or urgency.
export function joinRequestConfirmationMessage(status: JoinRequestStatus): string {
  switch (status) {
    case "pending":
      return "Request sent. Your request is now with the host.";
    case "accepted":
      return "You have a place. The exact meeting point is now shown below.";
    case "cancelled":
      return "Request cancelled. This invitation is closed for your account.";
    case "declined":
      return "This request is closed.";
  }
}

export function declinedJoinRequestMessage(skipCount: number): string {
  return skipCount >= 3
    ? "This request was quietly closed after the host used all three skips for this event."
    : "Your request is closed. No public rejection signal is added to your profile.";
}

export function summarizeHostRequestQueue(
  requests: ReadonlyArray<Readonly<{ status: JoinRequestStatus | string; skipCount: number }>>,
): HostRequestQueueSummary {
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const acceptedCount = requests.filter((request) => request.status === "accepted").length;
  const closedCount = requests.filter((request) => request.status === "declined" || request.status === "cancelled").length;
  const finalSkipPendingCount = requests.filter((request) => request.status === "pending" && request.skipCount >= 2).length;

  let pendingHeadline = "No pending requests are waiting right now.";
  let pendingBody: string | null = null;

  if (pendingCount === 1) {
    pendingHeadline = "1 pending request is ready for a decision.";
    pendingBody = finalSkipPendingCount > 0
      ? "This request is already on its final skip, so the next pass will close it quietly."
      : "Review this request here before widening discovery again.";
  } else if (pendingCount > 1) {
    pendingHeadline = `${pendingCount} pending requests are ready for review.`;
    pendingBody = finalSkipPendingCount > 0
      ? `${finalSkipPendingCount} ${finalSkipPendingCount === 1 ? "request is" : "requests are"} already on the final skip, so the next pass would close ${finalSkipPendingCount === 1 ? "it" : "them"} quietly.`
      : "Work through these requests before widening discovery again.";
  }

  return { pendingCount, acceptedCount, closedCount, finalSkipPendingCount, pendingHeadline, pendingBody };
}
