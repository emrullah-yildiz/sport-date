// Runs the opt-in, database-backed integration tests. The default `npm test`
// stays hermetic (these specs self-skip unless RUN_DB_INTEGRATION=1). Invoke via
// `npm run test:integration -w @sport-date/web`, which loads ../../.env so
// DATABASE_URL / NEON_DATABASE_URL is available, then sets the opt-in flag here.
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  [
    "vitest",
    "run",
    "src/lib/auth-email.integration.test.ts",
    "src/lib/audit-erasure.integration.test.ts",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, RUN_DB_INTEGRATION: "1" },
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);
