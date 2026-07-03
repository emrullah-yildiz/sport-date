import { describe, expect, it } from "vitest";

import { planDeployMigration } from "./migrations.mjs";

// Preflight coverage for CX-20260701: the deploy-time migration decision must
// (a) run on production so a "migration added" deploy applies it before serving,
// (b) fail closed on production when no DB credential is reachable rather than
//     silently shipping code ahead of its schema, and
// (c) never touch a database on preview/development deploys.
describe("planDeployMigration (deploy-time migration guard)", () => {
  it("RUNS migrations on a production deploy that has a DATABASE_URL", () => {
    expect(planDeployMigration({ vercelEnv: "production", hasDatabaseUrl: true })).toEqual({
      action: "run",
      reason: "production deploy with DATABASE_URL present",
    });
  });

  it("BLOCKS the build on a production deploy with no reachable DATABASE_URL", () => {
    const plan = planDeployMigration({ vercelEnv: "production", hasDatabaseUrl: false });
    expect(plan.action).toBe("block");
  });

  it("SKIPS on preview deploys", () => {
    expect(planDeployMigration({ vercelEnv: "preview", hasDatabaseUrl: true }).action).toBe("skip");
  });

  it("SKIPS on development / when VERCEL_ENV is unset", () => {
    expect(planDeployMigration({ vercelEnv: "development", hasDatabaseUrl: true }).action).toBe("skip");
    expect(planDeployMigration({ vercelEnv: undefined, hasDatabaseUrl: false }).action).toBe("skip");
  });
});
