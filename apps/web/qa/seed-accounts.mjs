// Seed a small pool of persistent synthetic adult accounts for QA reuse.
//
// The continuous QA loop (see qa/explore.mjs and .agents/experience-*.md)
// retests member journeys repeatedly against a live dev server. Registering a
// fresh account every pass burns the browser-registration rate limit
// (5 / hour per IP, hardcoded in src/lib/rate-limit.ts). This script instead
// creates a STABLE pool of accounts ONCE and writes their credentials to
// qa/artifacts/test-accounts.json (a gitignored dir), so future QA/explore
// agents can LOG IN with a pooled account (browser-auth is 10 / 15 min per IP —
// far more headroom) rather than re-registering.
//
// It is idempotent-ish: if a pool account already exists (register -> 409
// conflict), it falls back to verifying that login works and still records the
// account in the JSON. So re-running it does NOT necessarily consume the
// registration budget — only genuinely new accounts do (at most 4 here).
//
// This is a SETUP tool, not an assertion harness. It does not fix anything.
//
// Usage (mirrors qa:explore — needs a live dev server with the DB configured):
//   npm run qa:seed --workspace @sport-date/web
//   BASE_URL=http://localhost:3000 node apps/web/qa/seed-accounts.mjs
//
// Requires: a dev server already running (see qa/README.md), reachable at
// BASE_URL, with NEON_DATABASE_URL configured so register/login work.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = join(HERE, "artifacts");
const OUT_FILE = join(ARTIFACTS_DIR, "test-accounts.json");
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

// One strong password shared across the throwaway pool (>=12 chars, upper +
// lower + digit, per validateRegistration). Never a real credential.
const POOL_PASSWORD = "Movement-Pool-2026";

// The reusable pool. Emails are stable (no run-id) so the pool persists across
// runs and re-registration hits the 409 conflict fall-back rather than making a
// new account. Every member is comfortably 18+.
//
// Variation is deliberate, to cover the retest scenarios the QA loop needs:
//   - host-A / seeker-B: identical Bucharest Tennis intermediate English pair,
//     so B is compatible with an event A hosts (join-request happy path).
//   - seeker-advanced-C: Bucharest Tennis ADVANCED, for the discover
//     advanced-skill scenario.
//   - seeker-D: a different city + sport (Cluj, Running), for filter /
//     empty-state scenarios where no compatible event exists.
const POOL = [
  {
    role: "host-A",
    firstName: "Riley",
    lastName: "HostA",
    location: "Bucharest",
    dateOfBirth: "1990-04-12",
    bio: "Hosts relaxed evening rallies for newcomers.",
    seeking: "group",
    sports: [{ name: "Tennis", skillLevel: "intermediate", frequency: "weekly" }],
  },
  {
    role: "seeker-B",
    firstName: "Sam",
    lastName: "SeekerB",
    location: "Bucharest",
    dateOfBirth: "1992-08-03",
    bio: "Looking for friendly intermediate tennis partners.",
    seeking: "friendship",
    sports: [{ name: "Tennis", skillLevel: "intermediate", frequency: "weekly" }],
  },
  {
    role: "seeker-advanced-C",
    firstName: "Alex",
    lastName: "SeekerC",
    location: "Bucharest",
    dateOfBirth: "1988-11-22",
    bio: "Advanced player after competitive but respectful matches.",
    seeking: "friendship",
    sports: [{ name: "Tennis", skillLevel: "advanced", frequency: "weekly" }],
  },
  {
    role: "seeker-D",
    firstName: "Jordan",
    lastName: "SeekerD",
    location: "Cluj-Napoca",
    dateOfBirth: "1995-02-17",
    bio: "New to running, hoping to find a casual group.",
    seeking: "friendship",
    sports: [{ name: "Running", skillLevel: "beginner", frequency: "casual" }],
  },
];

function emailFor(role) {
  return `qa-pool-${role.toLowerCase()}@sport-date.invalid`;
}

// A plain Node fetch sends no Origin/Sec-Fetch-Site headers, which satisfies the
// server's isTrustedBrowserMutation check (same-origin or none). We only send a
// JSON content-type.
function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

function hasSessionCookie(response) {
  // Node's fetch exposes Set-Cookie via getSetCookie(); fall back to the raw
  // header for older runtimes. The auth cookie is named "auth_token".
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") || ""];
  return cookies.some((c) => /(^|[\s;])auth_token=/.test(c) && !/auth_token=;/.test(c));
}

async function register(member) {
  const body = {
    email: emailFor(member.role),
    password: POOL_PASSWORD,
    dateOfBirth: member.dateOfBirth,
    firstName: member.firstName,
    lastName: member.lastName,
    location: member.location,
    bio: member.bio,
    seeking: member.seeking,
    sports: member.sports,
    acceptedTerms: true,
  };
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
    redirect: "manual",
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* non-JSON body */
  }
  return { status: response.status, cookieSet: hasSessionCookie(response), payload };
}

async function login(member) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: emailFor(member.role), password: POOL_PASSWORD }),
    redirect: "manual",
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* non-JSON body */
  }
  return { status: response.status, cookieSet: hasSessionCookie(response), payload };
}

async function main() {
  console.log(`Seeding QA account pool -> ${BASE_URL}`);

  // Preflight: server must be up.
  const health = await fetch(`${BASE_URL}/api/health`)
    .then((r) => r.status)
    .catch(() => null);
  if (health !== 200) {
    console.error(
      `\nERROR: dev server not healthy at ${BASE_URL} (health=${health}). Start it first (see qa/README.md).`,
    );
    process.exitCode = 2;
    return;
  }

  await mkdir(ARTIFACTS_DIR, { recursive: true });

  const accounts = [];
  let newRegistrations = 0;

  for (const member of POOL) {
    const email = emailFor(member.role);
    console.log(`\n[${member.role}] ${email}`);

    let state = "unknown";
    let registered = false;

    // 1) Try to register. New account -> 201. Already exists -> 409 (fall back
    //    to login). Rate limited -> 429 (also fall back to login; the account
    //    likely already exists from a prior seed run).
    const reg = await register(member);
    if (reg.status === 201) {
      newRegistrations += 1;
      registered = true;
      state = "registered";
      console.log(`  registered (201), session cookie: ${reg.cookieSet ? "yes" : "NO"}`);
    } else if (reg.status === 409) {
      state = "already-existed";
      console.log("  already exists (409) -> verifying login");
    } else if (reg.status === 429) {
      state = "register-rate-limited";
      console.log("  registration rate-limited (429) -> verifying login (account likely already seeded)");
    } else {
      state = `register-failed-${reg.status}`;
      console.log(`  register returned ${reg.status}: ${JSON.stringify(reg.payload)}`);
    }

    // 2) Always confirm the pooled account can LOG IN and receives a session
    //    cookie — that is the reuse path QA agents will take.
    const auth = await login(member);
    const loginOk = auth.status === 200 && auth.cookieSet;
    if (loginOk) {
      console.log("  login OK (200), session cookie: yes");
    } else if (auth.status === 429) {
      console.log("  login rate-limited (429) — per-IP budget exhausted this window; account still recorded");
    } else {
      console.log(`  login NOT confirmed (status=${auth.status}, cookie=${auth.cookieSet}): ${JSON.stringify(auth.payload)}`);
    }

    accounts.push({
      role: member.role,
      email,
      password: POOL_PASSWORD,
      location: member.location,
      sports: member.sports,
      seeking: member.seeking,
      state,
      registered,
      loginConfirmed: loginOk,
      loginStatus: auth.status,
    });
  }

  const out = {
    note: "Synthetic QA-only accounts for the Sport Date web app. Throwaway, dev-branch only, never real PII. Reuse by LOGGING IN (browser-auth 10/15min), do not re-register unless testing signup.",
    baseUrl: BASE_URL,
    password: POOL_PASSWORD,
    generatedAt: new Date().toISOString(),
    accounts,
  };
  await writeFile(OUT_FILE, JSON.stringify(out, null, 2), "utf8");

  const loginOkCount = accounts.filter((a) => a.loginConfirmed).length;
  console.log("\n========== POOL SUMMARY ==========");
  for (const a of accounts) {
    console.log(
      `  ${a.role.padEnd(18)} ${a.email.padEnd(40)} ${a.state.padEnd(22)} login:${a.loginConfirmed ? "OK" : `NO(${a.loginStatus})`}`,
    );
  }
  console.log(`New registrations this run: ${newRegistrations} (budget is 5/hr per IP)`);
  console.log(`Login-confirmed accounts:   ${loginOkCount}/${accounts.length}`);
  console.log(`Credentials written to:     ${OUT_FILE} (gitignored)`);
  console.log("==================================\n");

  // Non-zero exit only if NOT every pooled account is usable by login, so a
  // watch loop can trust a zero exit means "pool ready".
  if (loginOkCount !== accounts.length) {
    console.error("WARNING: not every pooled account could be confirmed via login this run.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
