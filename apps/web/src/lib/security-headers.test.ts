import { describe, expect, it } from "vitest";

import { buildSecurityHeaders } from "../../security-headers";

function headerMap(nodeEnv: string): Record<string, string> {
  return Object.fromEntries(
    buildSecurityHeaders(nodeEnv).map((header) => [header.key, header.value]),
  );
}

describe("security headers", () => {
  it("adds a restrictive baseline for every environment", () => {
    const headers = headerMap("test");

    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("keeps eval out of production CSP and adds HSTS", () => {
    const headers = headerMap("production");

    expect(headers["Content-Security-Policy"]).not.toContain("'unsafe-eval'");
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("permits dev tooling without changing the production policy", () => {
    const headers = headerMap("development");
    expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
  });
});
