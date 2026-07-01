import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Guardrail: the Stripe secret must NEVER reach a client bundle
// (CX-20260701-stripe-subscription-integration-test-mode).
//
// Enforced two ways, statically, so a future edit that breaks it fails CI:
//   1. The Stripe seam (`stripe.ts`) and the billing lib (`billing.ts`) both
//      declare `import "server-only"`, which makes bundling them into a client
//      component a build error.
//   2. No "use client" file anywhere under src/ imports `@/lib/stripe` (or the
//      billing lib) — a client component that pulled it in would drag the secret
//      path toward the browser bundle.

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(currentDir, "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("Stripe secret stays server-only", () => {
  it("stripe.ts and billing.ts both import server-only", () => {
    for (const file of ["stripe.ts", "billing.ts"]) {
      const source = readFileSync(path.join(currentDir, file), "utf8");
      expect(source).toMatch(/import\s+["']server-only["']/);
    }
  });

  it("no client component imports the Stripe seam or billing lib", () => {
    const offenders: string[] = [];
    for (const file of walk(srcDir)) {
      const source = readFileSync(file, "utf8");
      const isClient = /^\s*["']use client["']/m.test(source);
      if (!isClient) continue;
      if (/@\/lib\/stripe|@\/lib\/billing/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
