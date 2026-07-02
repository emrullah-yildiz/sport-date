// Shared, client-safe helper for cancelling a pending request or leaving an
// accepted place. Both member-facing surfaces — the discover/event-detail
// "Cancel request" / "Cancel my place" control (`JoinRequestControls`) and the
// in-room graceful-exit control (`RoomLeaveControl`) — go through this one path
// so the resilience guarantees are identical on both:
//
//   * a hung or slow request can never spin the button forever — an
//     AbortController with a timeout aborts it and surfaces a recoverable error;
//   * any failure (network, timeout, non-OK response, unreadable body, or the
//     raw empty-body 500 the route no longer emits) resolves to a calm,
//     recoverable message so the caller re-enables the control;
//   * on success the caller gets the resolved status for its confirmation.
//
// This file is intentionally free of `server-only` and of any React/DOM import
// so it stays usable from client components AND directly unit-testable in the
// node test environment with a mocked global `fetch`.

// The private, optional graceful-exit reason. Kept as a loose shape here so the
// helper never has to import the server-only domain types; the data layer
// normalizes/validates it. It is the member's own record, never shown to peers.
export type CancelExitReason = {
  reason?: string;
  note?: string;
};

export type CancelJoinRequestResult =
  | { ok: true; status: string }
  | { ok: false; message: string };

// The calm, recoverable message shown on ANY failure. Deliberately non-punitive
// and reassuring: the seat/request is untouched when the call fails, so we tell
// the member exactly that and invite a retry — never a dead end, never blame.
export const CANCEL_RECOVERABLE_MESSAGE =
  "Your place is still yours — nothing changed. Please try again.";

// A hung request must not strand the member on "Cancelling…". If the server has
// not responded in this window we abort and fall back to the recoverable state.
export const DEFAULT_CANCEL_TIMEOUT_MS = 15000;

/**
 * Cancel a pending request or leave an accepted place. Always resolves (never
 * rejects): failures come back as `{ ok: false, message }` so the caller can
 * simply re-enable its control and render the message with role="alert".
 */
export async function cancelJoinRequest(
  eventId: string,
  requestId: string,
  options: {
    exit?: CancelExitReason | null;
    timeoutMs?: number;
    // Injectable for tests; defaults to the global fetch in the browser.
    fetchImpl?: typeof fetch;
  } = {},
): Promise<CancelJoinRequestResult> {
  const { exit = null, timeoutMs = DEFAULT_CANCEL_TIMEOUT_MS } = options;
  const fetchImpl = options.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const init: RequestInit = { method: "DELETE", signal: controller.signal };
    // Send the optional private reason only when there is one. An absent body is
    // fine — the route parses best-effort and the seat is removed regardless.
    if (exit) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(exit);
    }

    const response = await fetchImpl(`/api/events/${eventId}/requests/${requestId}`, init);

    // Parse defensively: even a well-behaved route can return a non-JSON body on
    // some failure paths, and we must never let `.json()` throw us into an
    // unhandled state that leaves the button spinning.
    let payload: { error?: string; status?: string } = {};
    try {
      payload = (await response.json()) as { error?: string; status?: string };
    } catch {
      payload = {};
    }

    if (!response.ok) return { ok: false, message: payload.error || CANCEL_RECOVERABLE_MESSAGE };
    return { ok: true, status: payload.status ?? "cancelled" };
  } catch {
    // Network error, or the abort fired (timeout). Either way the member's place
    // is untouched — surface the calm recoverable message.
    return { ok: false, message: CANCEL_RECOVERABLE_MESSAGE };
  } finally {
    clearTimeout(timer);
  }
}
