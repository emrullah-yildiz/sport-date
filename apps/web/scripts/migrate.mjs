import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL before running migrations.");

const here = dirname(fileURLToPath(import.meta.url));
const migration = await readFile(resolve(here, "../db/001_initial.sql"), "utf8");
await neon(databaseUrl).query(migration);
console.log("Applied database migration 001_initial.sql");

