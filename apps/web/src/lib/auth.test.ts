import { describe, expect, it } from "vitest";

import { createSession, hashPassword, hashSessionToken, verifyPassword } from "./auth";

describe("password security", () => {
  it("accepts the original password and rejects a different one", async () => {
    const hash = await hashPassword("A long private password 42");
    await expect(verifyPassword("A long private password 42", hash)).resolves.toBe(true);
    await expect(verifyPassword("A different password 42", hash)).resolves.toBe(false);
    expect(hash).not.toContain("A long private password 42");
  });
});

describe("opaque sessions", () => {
  it("creates unique random tokens and stores only deterministic hashes", () => {
    const first = createSession();
    const second = createSession();

    expect(first.token).not.toBe(second.token);
    expect(first.id).not.toBe(second.id);
    expect(first.tokenHash).toBe(hashSessionToken(first.token));
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).not.toContain(first.token);
    expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

