import { neon } from "@neondatabase/serverless";

import { cleanupExpiredSessionResidue } from "../src/lib/session-cleanup.mjs";

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL before running session cleanup.");

const sql = neon(databaseUrl);
const dryRun = process.argv.includes("--dry-run");

try {
  const summary = await cleanupExpiredSessionResidue(sql, { dryRun });
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "42P01") {
    throw new Error("Session cleanup requires the current database schema. Run `npm run db:migrate --workspace @sport-date/web` before scheduling cleanup.");
  }
  throw error;
}
