import { describe, expect, it, vi } from "vitest";

import { CANCEL_RECOVERABLE_MESSAGE, cancelJoinRequest } from "./cancel-join-request";

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function jsonResponse(body: unknown, ok: boolean): Response {
  return { ok, json: async () => body } as unknown as Response;
}

describe("cancelJoinRequest (shared cancel/leave client helper)", () => {
  it("resolves with the server status on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ success: true, status: "cancelled" }, true));

    const result = await cancelJoinRequest(EVENT_ID, REQUEST_ID, { fetchImpl });

    expect(result).toEqual({ ok: true, status: "cancelled" });
    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/events/${EVENT_ID}/requests/${REQUEST_ID}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("sends the optional private exit reason only when provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: "cancelled" }, true));

    await cancelJoinRequest(EVENT_ID, REQUEST_ID, {
      exit: { reason: "felt_unsafe", note: "someone kept following me" },
      fetchImpl,
    });

    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ reason: "felt_unsafe", note: "someone kept following me" }));
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("surfaces the server error message on a non-OK response (no exception thrown)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: "Request cannot be cancelled." }, false));

    const result = await cancelJoinRequest(EVENT_ID, REQUEST_ID, { fetchImpl });

    expect(result).toEqual({ ok: false, message: "Request cannot be cancelled." });
  });

  it("falls back to the calm recoverable message when a failed response has no JSON body (the old empty-500 case)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    } as unknown as Response);

    const result = await cancelJoinRequest(EVENT_ID, REQUEST_ID, { fetchImpl });

    expect(result).toEqual({ ok: false, message: CANCEL_RECOVERABLE_MESSAGE });
  });

  it("returns the recoverable message (never rejects) on a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await cancelJoinRequest(EVENT_ID, REQUEST_ID, { fetchImpl });

    expect(result).toEqual({ ok: false, message: CANCEL_RECOVERABLE_MESSAGE });
  });

  it("aborts a hung request via the timeout and returns the recoverable message (never spins forever)", async () => {
    // fetch that only rejects when its abort signal fires — models a hung server.
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    }) as unknown as typeof fetch;

    const result = await cancelJoinRequest(EVENT_ID, REQUEST_ID, { fetchImpl, timeoutMs: 10 });

    expect(result).toEqual({ ok: false, message: CANCEL_RECOVERABLE_MESSAGE });
  });
});
