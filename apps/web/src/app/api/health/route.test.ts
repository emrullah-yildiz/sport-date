import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

describe("health liveness endpoint", () => {
  it("returns 200 with a small ok payload", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("is never cached so a monitor cannot read a stale ok", () => {
    const response = GET();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
