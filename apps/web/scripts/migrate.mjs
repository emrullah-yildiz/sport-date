import { runMigrations } from "./migrations.mjs";

// CLI entry point for `npm run db:migrate` — migrate whatever DATABASE_URL /
// NEON_DATABASE_URL points at (local dev, a CI test branch, or a manually
// targeted prod). The deploy pipeline uses `deploy-migrate.mjs` instead.
const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
const applied = await runMigrations(databaseUrl);
if (applied === 0) console.log("Database already up to date — no migrations applied.");
