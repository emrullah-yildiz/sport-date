// Owner-authorized aggregate HQ reporting. Never changes credentials or decisions.
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

export const HQ_ORIGIN = "https://keepitup.social";

export function reportCredential(env = process.env) {
  return env.STANDUP_AGENT_SECRET || env.SOCIAL_AGENT_SECRET || null;
}

export async function publishReport(report, { env = process.env, fetchImpl = fetch } = {}) {
  const credential = reportCredential(env);
  if (!credential) throw new Error("HQ publishing unavailable: configure STANDUP_AGENT_SECRET or SOCIAL_AGENT_SECRET in the protected local environment.");
  if (!report || typeof report !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(report.day) || !Number.isFinite(Date.parse(report.generatedAt)) || typeof report.headline !== "string" || !Array.isArray(report.summary) || !Array.isArray(report.agents) || !Array.isArray(report.directions)) {
    throw new Error("Invalid report envelope; use the standup report contract.");
  }
  const body = JSON.stringify(report);
  if (body.length > 64000) throw new Error("HQ report exceeds the size limit.");
  const published = await fetchImpl(`${HQ_ORIGIN}/api/standup/report`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" }, body,
  });
  if (!published.ok) throw new Error(`HQ publish failed (HTTP ${published.status}); no live success claimed.`);
  const readback = await fetchImpl(`${HQ_ORIGIN}/api/standup/report`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!readback.ok) throw new Error(`HQ verification failed (HTTP ${readback.status}).`);
  const actual = await readback.json();
  if (!isDeepStrictEqual(actual.report, report)) throw new Error("HQ readback differs from the submitted report; inspect before retrying.");
  return { live: true, day: report.day, generatedAt: report.generatedAt };
}

export async function readDecisions({ env = process.env, fetchImpl = fetch } = {}) {
  if (!env.SOCIAL_AGENT_SECRET) return { available: false, reason: "owner-decisions-credential-missing", decisions: [] };
  const response = await fetchImpl(`${HQ_ORIGIN}/api/standup/directions`, {
    headers: { Authorization: `Bearer ${env.SOCIAL_AGENT_SECRET}` }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return { available: false, reason: `HTTP-${response.status}`, decisions: [] };
  const body = await response.json();
  if (!Array.isArray(body.decisions)) return { available: false, reason: "invalid-response", decisions: [] };
  return { available: true, decisions: body.decisions };
}

export function loadReportingEnvironment(sourceRoot = fileURLToPath(new URL("../../../", import.meta.url))) {
  // Existing process values win; no credential values are returned or logged.
  for (const file of [".env.studio.local", ".env.local", ".env", "apps/web/.env.local"]) {
    const path = join(sourceRoot, file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  loadReportingEnvironment(process.env.STUDIO_SOURCE_ROOT);
  try {
    const command = process.argv[2];
    if (command === "publish" && process.argv[3]) {
      const report = JSON.parse(readFileSync(resolve(process.argv[3]), "utf8").replace(/^\uFEFF/, ""));
      console.log(JSON.stringify(await publishReport(report)));
    } else if (command === "status") {
      const decisions = await readDecisions();
      console.log(JSON.stringify({ publishCredentialAvailable: Boolean(reportCredential()), decisionsAvailable: decisions.available, reason: decisions.reason, decisions: decisions.decisions.map(d => ({ directionId: d.directionId, action: d.action })) }));
    } else if (command === "decisions") {
      // Operational owner comments are private context: do not commit/publish this output.
      console.log(JSON.stringify(await readDecisions()));
    } else {
      throw new Error("Usage: node apps/web/scripts/studio-hq.mjs status|decisions|publish <report.json>");
    }
  } catch (error) {
    // Never print provider bodies, request headers, environment or stacks.
    console.error(error instanceof Error ? error.message : "HQ operation failed.");
    process.exitCode = 1;
  }
}
