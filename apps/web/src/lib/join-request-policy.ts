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

// Member-facing, sentence-case headline for a join-request state. This is the
// SINGLE source of the humane wording shared by the event-page join panel
// (JoinRequestControls) and the /discover feed card footer, so the two surfaces
// can never drift into different phrasing for the same state — and no member ever
// reads the raw internal status token
// (CX-20260703-discover-card-request-status-raw-enum). Pure map; an unknown or
// future status degrades to a calm, honest generic rather than leaking a database
// word or `undefined`.
export function joinRequestStateHeadline(status: JoinRequestStatus | string): string {
  switch (status) {
    case "pending":
      return "Your request is with the host.";
    case "accepted":
      return "You have a place.";
    case "declined":
      return "Not this game.";
    case "cancelled":
      return "Request cancelled.";
    default:
      return "You have a request.";
  }
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

// Calm confirmation a polite live region announces to the HOST the moment an
// accept/skip resolves in place (no full-document reload). Success on accept is
// warm but not manufactured; skip/close stays respectful and PRIVATE — it never
// exposes the skip count or the requester's history to anyone. `firstName` is a
// name the host already sees on the request card, so naming it exposes no new data.
export function hostDecisionConfirmationMessage(
  status: JoinRequestStatus,
  firstName: string,
): string {
  const who = firstName.trim() || "This member";
  switch (status) {
    case "accepted":
      return `You welcomed ${who}. They can now see the exact meeting point.`;
    case "declined":
      return "Request closed quietly. Skip counts stay private.";
    case "pending":
      return "Request skipped. Nothing is shown to them; skip counts stay private.";
    case "cancelled":
      return "Request closed. Skip counts stay private.";
  }
}

// Full-event join gating (CX-20260703-full-event-join-form-invites-doomed-request).
// A fully booked event must NOT show the open request form to a member with no
// existing request — the server capacity guard would 409 the submission, a
// dead-ended "why did you let me do that" failure. This is the SINGLE source of
// that decision, shared by the join panel: show the honest "full" state ONLY when
// the event has no places left AND the viewer holds no request row of their own
// (status === null). A member who already has a pending/accepted/declined/cancelled
// row keeps their own state — the fully booked state never hides or overrides an
// existing request; it only replaces the pre-request open form.
export function showsFullJoinState(isFull: boolean, status: JoinRequestStatus | null): boolean {
  return isFull && status === null;
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
