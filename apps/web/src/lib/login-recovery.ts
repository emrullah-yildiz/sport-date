/**
 * Pure helpers for turning a `/api/auth/login` response into a member-facing
 * recovery state (CX-20260701-login-rate-limited-state-no-recovery-guidance).
 *
 * These are deliberately framework-free so they can be unit-tested at the lib
 * layer: reproducing a live 429 is IP-rate-limited, so the retry-after parsing
 * and copy are pinned here instead of end-to-end. `LoginForm` consumes them.
 *
 * Anti-enumeration is preserved: this module never inspects *which* account or
 * why a 401 happened — it only distinguishes a rate-limit (429) cool-down from
 * any other failure so the UI can show a wait time and a recovery route.
 */

/** A parsed, member-facing login failure. */
export type LoginFailure = Readonly<{
  /** Calm message to show in the `role="alert"` block. */
  message: string;
  /**
   * When the failure is a rate-limit (429), the number of seconds to wait
   * before another attempt can succeed, clamped to a sane range. `0` for any
   * non-rate-limited failure (nothing to count down).
   */
  cooldownSeconds: number;
  /**
   * Whether to surface the "Forgot your password?" recovery route prominently.
   * True for rate-limited lockouts (password reset runs on a separate limiter
   * and is often the fastest way back in).
   */
  suggestRecovery: boolean;
}>;

// Cap the surfaced wait so a mis-set / very large Retry-After can never render
// an absurd countdown or disable the form indefinitely. The browser-auth window
// is 15 minutes; 30 minutes is a generous ceiling that still covers stacked
// windows without stranding the member.
const MAX_COOLDOWN_SECONDS = 30 * 60;

/**
 * Parse a `Retry-After` header value into whole seconds.
 *
 * Per RFC 7231 the header may be either a delta in seconds (e.g. `"518"`) or an
 * HTTP-date. Our limiter always sends the delta form, but we tolerate the date
 * form defensively. Returns `0` when absent or unparseable.
 */
export function parseRetryAfterSeconds(headerValue: string | null, nowMs = Date.now()): number {
  if (!headerValue) return 0;
  const trimmed = headerValue.trim();
  if (trimmed === "") return 0;

  // Delta-seconds form.
  if (/^\d+$/.test(trimmed)) {
    return clampCooldown(Number(trimmed));
  }

  // HTTP-date form.
  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return 0;
  const deltaSeconds = Math.ceil((dateMs - nowMs) / 1000);
  return clampCooldown(deltaSeconds);
}

function clampCooldown(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(Math.round(seconds), MAX_COOLDOWN_SECONDS);
}

/**
 * Render a calm, non-alarming wait message from a cool-down in seconds.
 *
 * Rounds up to a whole minute so the member never returns a hair too early, and
 * uses "less than a minute" for short waits. No blame language, no raw seconds.
 */
export function formatRateLimitMessage(cooldownSeconds: number): string {
  if (cooldownSeconds <= 0) {
    return "Too many attempts. Please wait a little while before trying again.";
  }
  if (cooldownSeconds < 60) {
    return "Too many attempts — you can try again in less than a minute.";
  }
  const minutes = Math.ceil(cooldownSeconds / 60);
  const unit = minutes === 1 ? "minute" : "minutes";
  return `Too many attempts — you can try again in about ${minutes} ${unit}.`;
}

/**
 * Turn a login `Response` (already known to be non-ok) plus its parsed JSON body
 * into a member-facing failure. On a 429 we read the server's `Retry-After`
 * (which the limiter always sends) so the UI can show a wait time, disable the
 * button for the cool-down, and point at password reset. Every other status
 * falls through to the server's own message (e.g. the generic, anti-enumeration
 * "Email or password is incorrect.").
 */
export function interpretLoginFailure(
  response: Pick<Response, "status"> & { headers: Pick<Headers, "get"> },
  body: unknown,
  nowMs = Date.now(),
): LoginFailure {
  const serverMessage =
    body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
      ? (body as { error: string }).error
      : "";

  if (response.status === 429) {
    const cooldownSeconds = parseRetryAfterSeconds(response.headers.get("retry-after"), nowMs);
    return {
      message: formatRateLimitMessage(cooldownSeconds),
      cooldownSeconds,
      suggestRecovery: true,
    };
  }

  return {
    message: serverMessage || "Login failed.",
    cooldownSeconds: 0,
    suggestRecovery: false,
  };
}
