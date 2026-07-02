import { describe, expect, it } from "vitest";

import { declinedJoinRequestMessage, hostDecisionConfirmationMessage, hostSkipButtonLabel, joinRequestConfirmationMessage, joinRequestStateHeadline, showsFullJoinState, summarizeHostDecision, summarizeHostRequestQueue } from "./join-request-policy";

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

  it("announces each host accept/skip result calmly, naming only what the host already sees and never leaking skip counts", () => {
    // These strings are read by HostRequestDecision's polite aria-live region when
    // an accept/skip resolves in place (no window.location.reload). Accept names
    // the requester (a first name already on the card) warmly; skip/close stays
    // respectful and private and NEVER exposes the skip count or their history.
    expect(hostDecisionConfirmationMessage("accepted", "Mara")).toBe("You welcomed Mara. They can now see the exact meeting point.");
    expect(hostDecisionConfirmationMessage("declined", "Mara")).toBe("Request closed quietly. Skip counts stay private.");
    expect(hostDecisionConfirmationMessage("pending", "Mara")).toBe("Request skipped. Nothing is shown to them; skip counts stay private.");
    expect(hostDecisionConfirmationMessage("cancelled", "Mara")).toBe("Request closed. Skip counts stay private.");
    // A blank / whitespace name degrades gracefully without exposing an empty slot.
    expect(hostDecisionConfirmationMessage("accepted", "   ")).toBe("You welcomed This member. They can now see the exact meeting point.");
    // The skip/close copy never names a number or the private "skip" mechanic to
    // the requester side; the accept copy carries no manufactured urgency.
    for (const status of ["declined", "pending", "cancelled"] as const) {
      const message = hostDecisionConfirmationMessage(status, "Mara").toLowerCase();
      expect(message).not.toMatch(/\d/);
      expect(message).toContain("private");
    }
  });

  it("gives one shared, humane sentence-case headline per join state so the feed and event page cannot drift", () => {
    // This is the SINGLE source of the state wording rendered both by the
    // event-page join panel (JoinRequestControls) and the /discover feed card
    // footer, replacing the raw `Request: <enum>` leak
    // (CX-20260703-discover-card-request-status-raw-enum). The strings are the
    // exact panel headlines, so the two surfaces stay in lockstep by construction.
    expect(joinRequestStateHeadline("pending")).toBe("Your request is with the host.");
    expect(joinRequestStateHeadline("accepted")).toBe("You have a place.");
    expect(joinRequestStateHeadline("declined")).toBe("Not this game.");
    expect(joinRequestStateHeadline("cancelled")).toBe("Request cancelled.");
    for (const status of ["pending", "accepted", "declined", "cancelled"] as const) {
      const copy = joinRequestStateHeadline(status);
      // Never the raw enum footer leak, and always a complete sentence-case phrase.
      expect(copy).not.toBe(`Request: ${status}`);
      expect(copy).toMatch(/^[A-Z].*\.$/);
    }
    // An unknown / future status degrades to a calm generic — never a raw token,
    // never `undefined`.
    const unknown = joinRequestStateHeadline("archived");
    expect(unknown).toBe("You have a request.");
    expect(unknown).not.toContain("archived");
  });

  it("shows the honest full state INSTEAD of the request form only for a full event with no request of one's own", () => {
    // CX-20260703: a fully booked event must not invite a new request the server
    // capacity guard will 409. The full state replaces the open form ONLY when the
    // event has no places AND the viewer holds no request row (status === null).
    expect(showsFullJoinState(true, null)).toBe(true);
    // A member who already holds ANY request/place keeps their own state — the full
    // state never hides or overrides it, so the gate is false for every non-null.
    for (const status of ["pending", "accepted", "declined", "cancelled"] as const) {
      expect(showsFullJoinState(true, status)).toBe(false);
    }
    // A not-full event always keeps the open form for a member with no request, and
    // of course never changes an existing state either.
    expect(showsFullJoinState(false, null)).toBe(false);
    for (const status of ["pending", "accepted", "declined", "cancelled"] as const) {
      expect(showsFullJoinState(false, status)).toBe(false);
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
