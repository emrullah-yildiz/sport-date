import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const databaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../db");

/**
 * Apply every pending `db/NNN_*.sql` migration to the given database, in order.
 * Idempotent: each applied migration is recorded in `schema_migrations`, so a
 * re-run against an already-current database is a no-op. Uses the Neon HTTP
 * driver, so a `-pooler` connection string is fine (no persistent TCP pool).
 *
 * @param {string | undefined} databaseUrl
 * @returns {Promise<number>} the count of migrations newly applied this run
 */
export async function runMigrations(databaseUrl) {
  if (!databaseUrl) throw new Error("Set DATABASE_URL before running migrations.");

  const sql = neon(databaseUrl);
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const migrationNames = (await readdir(databaseDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort((left, right) => left.localeCompare(right));

  let applied = 0;
  for (const name of migrationNames) {
    const existing = await sql`SELECT 1 FROM schema_migrations WHERE name = ${name}`;
    if (existing.length > 0) continue;

    const migration = await readFile(resolve(databaseDirectory, name), "utf8");
    const statements = migration
      .split(/;\s*(?:\r?\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);
    await sql.transaction(statements.map((statement) => sql.query(statement)));
    await sql`INSERT INTO schema_migrations (name) VALUES (${name})`;
    console.log(`Applied database migration ${name}`);
    applied += 1;
  }
  return applied;
}

/**
 * Decide what the deploy-time migration step should do, given the deployment
 * environment. Pure (no I/O) so it is unit-testable. The safety contract for
 * CX-20260701: production must never serve code ahead of its migrations, so a
 * production deploy with no reachable DB credential BLOCKS the build rather than
 * shipping. Non-production deploys (preview/development) never touch a database.
 *
 * @param {{ vercelEnv?: string, hasDatabaseUrl: boolean }} input
 * @returns {{ action: "skip" | "run" | "block", reason: string }}
 */
export function planDeployMigration({ vercelEnv, hasDatabaseUrl }) {
  if (vercelEnv !== "production") {
    return { action: "skip", reason: `VERCEL_ENV=${vercelEnv ?? "(unset)"} is not production` };
  }
  if (!hasDatabaseUrl) {
    return {
      action: "block",
      reason: "production deploy but no DATABASE_URL is available at build time",
    };
  }
  return { action: "run", reason: "production deploy with DATABASE_URL present" };
}
