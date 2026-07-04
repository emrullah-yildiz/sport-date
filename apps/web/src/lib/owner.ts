import "server-only";

import { getCurrentUser, type SessionUser } from "@/lib/session";

// Owner gating for owner-only surfaces (CX-20260705-social-content-approval-queue).
//
// The OWNER is an authenticated member (a real session — we reuse getCurrentUser,
// never a new auth path) whose email is in the OWNER_EMAILS allow-list. The list
// is a comma-separated env; when unset it DEFAULTS to the owner's address so the
// feature works pre-config on first deploy. Matching is case-insensitive and
// trims whitespace. Anyone else — signed out or an ordinary member — is not the
// owner (the caller answers 401/403 accordingly).

const DEFAULT_OWNER_EMAIL = "ey.myacc@gmail.com";

export function ownerEmails(): string[] {
  const raw = process.env.OWNER_EMAILS;
  const source = raw && raw.trim().length > 0 ? raw : DEFAULT_OWNER_EMAIL;
  return source
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ownerEmails().includes(email.trim().toLowerCase());
}

/**
 * Resolve the current session and confirm it is the owner. Returns the owner's
 * SessionUser, or null when signed out or not on the allow-list. Fail-closed:
 * any absence of a matching authenticated session yields null.
 */
export async function getCurrentOwner(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || !isOwnerEmail(user.email)) return null;
  return user;
}
