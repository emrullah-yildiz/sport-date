import { validateLogin } from "@sport-date/domain";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSession, hashSessionToken, verifyPassword } from "@/lib/auth";
import { DatabaseNotConfiguredError, getDatabase } from "@/lib/db";
import { deriveDeviceLabel } from "@/lib/device-label";
import { browserAuthRateLimitRules, enforceRateLimit, normalizeRateLimitKeyPart } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { AUTH_COOKIE_NAME, setSessionCookie } from "@/lib/session";
import { MAX_WEB_SESSIONS_PER_USER } from "@/lib/web-sessions";

export const runtime = "nodejs";

const DUMMY_PASSWORD_HASH = "$2b$12$Ad/rUVoyWWEHpeHc7A7mX.CJ5QzyE20ylxhB323v6GK1CvjyTuxMq";

type LoginUserRow = { id: string | number; email: string; password_hash: string; account_status: string };

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  try {
    const body = await request.json();
    const email = normalizeRateLimitKeyPart((body as Record<string, unknown>)?.email);
    const limited = await enforceRateLimit(
      "auth:login",
      browserAuthRateLimitRules(request, email),
      "Too many login attempts. Please wait before trying again.",
    );
    if (limited) return limited;
    const validation = validateLogin(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }

    const sql = getDatabase();
    const rows = await sql`
      SELECT id, email, password_hash, account_status
      FROM users
      WHERE email = ${validation.data.email}
      LIMIT 1
    ` as unknown as LoginUserRow[];
    const user = rows[0];
    const passwordMatches = await verifyPassword(
      validation.data.password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || user.account_status !== "active") {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    // Opt-in only: a longer, still-revocable session is created solely when the
    // member ticks "Remember me". Anything other than an explicit boolean true
    // (missing, false, string, etc.) keeps today's default 7-day window, so a
    // shared/public computer is never silently kept signed in.
    const remember = (body as Record<string, unknown>)?.rememberMe === true;
    const session = createSession({ remember });
    // Coarse, honest "Browser on OS" hint (e.g. "Chrome on Windows") derived
    // from the User-Agent so the member can recognise this browser in the
    // "Signed-in browsers" panel. We store ONLY this derived family label — not
    // the raw UA, IP, or any location. null when the UA is missing/unrecognised.
    const deviceLabel = deriveDeviceLabel(request.headers.get("user-agent"));
    const previousToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    const previousTokenHash = previousToken ? hashSessionToken(previousToken) : "";
    await sql.transaction((transaction) => [
      transaction`
        DELETE FROM sessions
        WHERE ${previousTokenHash} <> '' AND token_hash = ${previousTokenHash}
      `,
      transaction`
        INSERT INTO sessions (id, user_id, token_hash, expires_at, device_label, last_active_at)
        VALUES (${session.id}::uuid, ${user.id}, ${session.tokenHash}, ${session.expiresAt.toISOString()}::timestamptz, ${deviceLabel}, NOW())
      `,
      // Bound the number of concurrent web/browser sessions per member. Without a
      // cap, every new browser sign-in left a permanent `sessions` row (login only
      // clears the SAME-cookie row above), so an active account accumulated rows
      // without limit — and the "Signed-in browsers" panel silently hid everything
      // past its display limit, so those sessions could not be individually seen or
      // revoked. We keep the newest MAX_WEB_SESSIONS_PER_USER active rows and evict
      // the OLDEST active ones beyond that. This bounds growth AND keeps every
      // remaining session visible/revocable (the panel's display limit is >= the
      // cap, so nothing is ever silently omitted). We NEVER evict the session just
      // created here — it is excluded by id, so the current browser is always kept
      // signed in — and we only touch ACTIVE (not-yet-expired) rows, leaving expired
      // residue to session-cleanup. The cap is deliberately generous so a member is
      // very unlikely to hit it; if they do, only their truly-oldest device is signed
      // out and can simply sign in again. This scopes to WEB `sessions` only; mobile
      // devices live in the separate `mobile_sessions` table and are unaffected.
      transaction`
        DELETE FROM sessions
        WHERE user_id = ${user.id}
          AND id <> ${session.id}::uuid
          AND expires_at > NOW()
          AND id IN (
            SELECT id FROM sessions
            WHERE user_id = ${user.id}
              AND id <> ${session.id}::uuid
              AND expires_at > NOW()
            ORDER BY created_at DESC
            OFFSET ${MAX_WEB_SESSIONS_PER_USER - 1}
          )
      `,
    ]);

    const response = NextResponse.json({ success: true });
    setSessionCookie(response, session);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Login is not connected yet. Please try again later." }, { status: 503 });
    }
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
