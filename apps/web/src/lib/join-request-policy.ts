export type JoinRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type JoinRequestDecisionSummary = Readonly<{
  status: JoinRequestStatus;
  skipCount: number;
  message: string;
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

export function declinedJoinRequestMessage(skipCount: number): string {
  return skipCount >= 3
    ? "This request was quietly closed after the host used all three skips for this event."
    : "Your request is closed. No public rejection signal is added to your profile.";
}
