import { NextResponse } from "next/server";

import { DatabaseNotConfiguredError } from "@/lib/db";

// Shared calm-failure contract for the cancel/leave DELETE routes (web + mobile).
// A thrown error (a DB failure like the missing exit_reason/exit_note columns that
// took cancel/leave down, or any other unexpected throw) must NEVER escape as a raw
// empty-body 500 that leaves a member stuck. Every exit returns a readable JSON body
// the client can act on; internals/stack/PII are only logged server-side (redacted —
// no event/request/user IDs). Sharing one helper keeps the two surfaces from
// drifting apart. The member's place is unchanged on failure, so the re-request /
// retry path is always still open — no permanent lockout.
export function cancelFailureResponse(error: unknown): NextResponse {
  // Distinguish a not-yet-connected database (a transient, retryable condition) from
  // an unexpected failure, but never leak details to the member.
  if (error instanceof DatabaseNotConfiguredError) {
    console.error("Cancel join request failed: database not configured");
    return NextResponse.json(
      { error: "We couldn't reach the service just now. Your place is unchanged — please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("Cancel join request failed:", error instanceof Error ? error.message : "unknown error");
  return NextResponse.json(
    { error: "We couldn't complete that just now. Your place is unchanged — please try again." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
