import { planDeployMigration, runMigrations } from "./migrations.mjs";

// Runs as the first half of the Vercel build command (see vercel.json
// `buildCommand`). It applies pending production migrations BEFORE `next build`
// so a deploy can never serve code that reads a column/table prod hasn't
// migrated yet (the CX-20260701 outage). Preview/development builds skip it;
// a production build that can't reach the DB fails closed (blocks the deploy),
// leaving the last good deployment serving.
const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
const plan = planDeployMigration({
  vercelEnv: process.env.VERCEL_ENV,
  hasDatabaseUrl: Boolean(databaseUrl),
});

if (plan.action === "skip") {
  console.log(`[deploy-migrate] skipping migrations — ${plan.reason}.`);
  process.exit(0);
}

if (plan.action === "block") {
  console.error(
    `[deploy-migrate] BLOCKING BUILD — ${plan.reason}. A production deploy must not ` +
      "serve code ahead of its database migrations. Set the production DATABASE_URL in " +
      "Vercel (Project → Settings → Environment Variables, Production) and redeploy.",
  );
  process.exit(1);
}

try {
  const applied = await runMigrations(databaseUrl);
  console.log(
    `[deploy-migrate] production database migrated before build — ${applied} new migration(s) applied ` +
      `(0 means prod was already current).`,
  );
} catch (error) {
  console.error(
    "[deploy-migrate] migration FAILED — blocking the build so the last good deployment keeps " +
      `serving instead of shipping code without its schema. ${error?.stack ?? error?.message ?? error}`,
  );
  process.exit(1);
}
