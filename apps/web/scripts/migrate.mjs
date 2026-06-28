import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL before running migrations.");

const sql = neon(databaseUrl);
const databaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../db");
await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const migrationNames = (await readdir(databaseDirectory))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort((left, right) => left.localeCompare(right));

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
}
